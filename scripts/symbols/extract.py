"""Reads Python source files and prints their public symbols as JSON.

Used by scripts/generate-symbols.ts, which reads the files from a Home
Assistant core checkout with Git and pipes them in. Python reads Python best:
its own parser knows every syntax the core code uses, so this needs the
Python version core needs (see `.python-version` in core).

Input on stdin, as JSON:

    {"files": [{"path": "homeassistant/core.py", "module": "...",
                "source": "...", "classesOnly": false}]}

Output on stdout, as JSON: `symbols`, one per public top-level class or
function, and per public method of a public class. A file with `classesOnly`
(like homeassistant/const.py) only gives its classes, and aliases of classes
(`Platform = EntityPlatforms`), not its constants. A file with
`privateMethods` also gives the methods with one leading underscore, the
helpers a base class has for its subclasses. A file with `moduleOnly`
gives one symbol: the module itself, with the first sentence of its
docstring.

And `attributes`: every name that is also used as an attribute, a property,
or a field, like `entity_id` or `is_closed`. When a function has the same
name as an attribute, the docs usually mean the attribute.
"""

import ast
import json
import re
import sys

# Decorators that turn a method into an attribute. Those are documented as
# properties, not called, so they are no symbol here.
PROPERTY_DECORATORS = {
    "property",
    "cached_property",
    "under_cached_property",
    "setter",
    "deleter",
}

ENUM_BASES = {"Enum", "StrEnum", "IntEnum", "IntFlag", "Flag"}


def decorator_names(node):
    """Return the last part of the name of every decorator of a node."""
    names = []
    for decorator in node.decorator_list:
        target = decorator.func if isinstance(decorator, ast.Call) else decorator
        if isinstance(target, ast.Attribute):
            names.append(target.attr)
        elif isinstance(target, ast.Name):
            names.append(target.id)
    return names


def first_sentence(node):
    """Return the first sentence of the docstring of a node, or None."""
    docstring = ast.get_docstring(node)
    if not docstring:
        return None

    paragraph = re.split(r"\n\s*\n", docstring.strip())[0]
    text = " ".join(paragraph.split())

    # A period followed by a space and more text ends the sentence. "e.g. "
    # and "i.e. " do not.
    match = re.search(r"(?<!\be\.g)(?<!\bi\.e)\.(\s|$)", text)
    return text[: match.start() + 1] if match else text


def parameter(argument, default=None, prefix=""):
    """Return one parameter the way PEP 8 writes it: `name: int = 1`."""
    text = prefix + argument.arg
    if argument.annotation is not None:
        text += f": {ast.unparse(argument.annotation)}"
    if default is not None:
        separator = " = " if argument.annotation is not None else "="
        text += f"{separator}{ast.unparse(default)}"
    return text


def parameters(arguments, drop_first):
    """Return the parameters of a function as written, without self or cls."""
    positional = arguments.posonlyargs + arguments.args
    defaults = [None] * (len(positional) - len(arguments.defaults)) + arguments.defaults
    pairs = list(zip(positional, defaults))
    only_positional = len(arguments.posonlyargs)

    if drop_first and positional and positional[0].arg in ("self", "cls"):
        pairs = pairs[1:]
        only_positional = max(0, only_positional - 1)

    parts = [parameter(argument, default) for argument, default in pairs]
    if only_positional:
        parts.insert(only_positional, "/")

    if arguments.vararg is not None:
        parts.append(parameter(arguments.vararg, prefix="*"))
    elif arguments.kwonlyargs:
        parts.append("*")

    for argument, default in zip(arguments.kwonlyargs, arguments.kw_defaults):
        parts.append(parameter(argument, default))

    if arguments.kwarg is not None:
        parts.append(parameter(arguments.kwarg, prefix="**"))

    return parts


# The card is narrow. A signature longer than this gets one parameter per
# line, the way Ruff formats a long `def`.
LINE_LENGTH = 60


OPENING = {"(": ")", "[": "]", "{": "}"}


def split_top_level(text):
    """Split text at the commas that are not inside brackets."""
    parts, depth, current = [], 0, ""
    for character in text:
        if character in OPENING:
            depth += 1
        elif character in OPENING.values():
            depth -= 1
        if character == "," and depth == 0:
            parts.append(current.strip())
            current = ""
        else:
            current += character
    if current.strip():
        parts.append(current.strip())
    return parts


def last_brackets(text):
    """Return where the last pair of brackets at the top level opens and closes."""
    depth, opened, found = 0, None, None
    for index, character in enumerate(text):
        if character in OPENING:
            if depth == 0:
                opened = index
            depth += 1
        elif character in OPENING.values():
            depth -= 1
            if depth == 0 and opened is not None:
                found = (opened, index)
    return found


def format_part(text, indent, suffix):
    """Return the lines of one part, split like Ruff when it is too long.

    Ruff breaks inside the last brackets: the content goes on its own line,
    one level deeper, and when that is still too long, one item per line,
    each split the same way.
    """
    line = f"{indent}{text}{suffix}"
    brackets = last_brackets(text)
    if len(line) <= LINE_LENGTH or brackets is None:
        return [line]

    opened, closed = brackets
    head, inner, tail = text[: opened + 1], text[opened + 1 : closed], text[closed:]
    deeper = indent + "    "
    if not inner.strip():
        return [line]
    if len(f"{deeper}{inner}") <= LINE_LENGTH:
        body = [f"{deeper}{inner}"]
    else:
        body = [
            line
            for part in split_top_level(inner)
            for line in format_part(part, deeper, ",")
        ]
    return [f"{indent}{head}", *body, f"{indent}{tail}{suffix}"]


def format_call(head, parts, tail):
    """Return `head(parts)tail` on one line, or one part per line."""
    line = f"{head}({', '.join(parts)}){tail}"
    if len(line) <= LINE_LENGTH:
        return line

    # No parameters to put on lines of their own: break the return type.
    if not parts:
        return "\n".join(format_part(line, "", ""))

    lines = [line for part in parts for line in format_part(part, "    ", ",")]
    # A long return type breaks too, like `) -> Callable[...]:`.
    return "\n".join([f"{head}(", *lines, *format_part(f"){tail}", "", "")])


def function_signature(node, is_method):
    """Return the `def` of a function, formatted like Ruff, without its body."""
    tail = ":"
    if node.returns is not None:
        tail = f" -> {ast.unparse(node.returns)}:"
    keyword = "async def" if isinstance(node, ast.AsyncFunctionDef) else "def"
    return format_call(f"{keyword} {node.name}", parameters(node.args, is_method), tail)


def constructor_signature(name, init):
    """Return how to create an instance of a class: `Name(parameters)`."""
    return format_call(name, parameters(init.args, True), "")


def base_names(node):
    """Return the base classes of a class, without keywords."""
    return [ast.unparse(base) for base in node.bases]


def class_kind(node, known_kinds):
    """Tell an enum and an exception apart from other classes."""
    for base in node.bases:
        name = ast.unparse(base).split(".")[-1].split("[")[0]
        if name in ENUM_BASES or known_kinds.get(name) == "enum":
            return "enum"
        if name.endswith(("Error", "Exception")) or known_kinds.get(name) == "exception":
            return "exception"
    return "class"


def is_public(name):
    return not name.startswith("_")


def attribute_names(tree):
    """Return the names a file uses as attributes, properties, or fields."""
    names = set()

    def add(name):
        # `_attr_is_on` is how an entity sets `is_on`.
        names.add(name.removeprefix("_attr_"))

    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            for item in node.body:
                if isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
                    add(item.target.id)
                elif isinstance(item, ast.Assign):
                    for target in item.targets:
                        if isinstance(target, ast.Name):
                            add(target.id)
                elif isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    if PROPERTY_DECORATORS.intersection(decorator_names(item)):
                        add(item.name)
        elif (
            isinstance(node, ast.Attribute)
            and isinstance(node.ctx, ast.Store)
            and isinstance(node.value, ast.Name)
            and node.value.id == "self"
        ):
            add(node.attr)

    return names


def module_symbol(file):
    """Return the module of a file as a symbol, with its docstring."""
    tree = ast.parse(file["source"], filename=file["path"])
    return {
        "name": file["module"],
        "qualname": file["module"],
        "kind": "module",
        "module": file["module"],
        "path": file["path"],
        "line": 1,
        "signature": file["module"],
        "doc": first_sentence(tree),
    }


def symbols_of(file, known_kinds, attributes):
    tree = ast.parse(file["source"], filename=file["path"])
    # The attributes of the rest of a component are its own business: a
    # field named `send_message` in some component does not make the
    # method of the notify entity an attribute.
    if not file.get("extended"):
        attributes.update(attribute_names(tree))
    module = file["module"]
    classes_only = file.get("classesOnly", False)
    private_methods = file.get("privateMethods", False)
    found = []
    classes = {
        node.name: node for node in tree.body if isinstance(node, ast.ClassDef)
    }

    def add(name, qualname, kind, node, signature, doc):
        found.append(
            {
                "name": name,
                "qualname": qualname,
                "kind": kind,
                "module": module,
                "path": file["path"],
                "line": node.lineno,
                "signature": signature,
                "doc": doc,
            }
        )

    for node in tree.body:
        if isinstance(node, ast.ClassDef) and is_public(node.name):
            kind = class_kind(node, known_kinds)
            known_kinds[node.name] = kind
            init = next(
                (
                    item
                    for item in node.body
                    if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef))
                    and item.name == "__init__"
                ),
                None,
            )
            # The parameters to create one, when the class says so itself.
            # Otherwise what it builds on, like `class SensorEntity(Entity)`.
            if init is not None and kind == "class":
                signature = constructor_signature(node.name, init)
            else:
                bases = base_names(node)
                signature = format_call(f"class {node.name}", bases, ":") if bases else f"class {node.name}:"
            add(node.name, node.name, kind, node, signature, first_sentence(node))
            # What it builds on, by name, so a method that overrides one of
            # a base class can be told apart from a method of its own.
            found[-1]["bases"] = [
                ast.unparse(base).split("[")[0].split(".")[-1] for base in node.bases
            ]

            # The members, so `SensorDeviceClass.TEMPERATURE` can link to
            # the enum, and stops linking when the member is gone.
            if kind == "enum":
                found[-1]["members"] = [
                    target.id
                    for item in node.body
                    if isinstance(item, ast.Assign)
                    for target in item.targets
                    if isinstance(target, ast.Name) and is_public(target.id)
                ]

            if classes_only or kind == "enum":
                continue

            for item in node.body:
                if not isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    continue
                # Helpers a base class has for its subclasses, like
                # `_get_reauth_entry` of a config flow, when the file says
                # so. Never the dunder methods.
                helper = private_methods and item.name.startswith("_") and not item.name.startswith("__")
                if not is_public(item.name) and not helper:
                    continue
                decorators = decorator_names(item)
                if PROPERTY_DECORATORS.intersection(decorators) or "overload" in decorators:
                    continue
                add(
                    item.name,
                    f"{node.name}.{item.name}",
                    "method",
                    item,
                    function_signature(item, "staticmethod" not in decorators),
                    first_sentence(item),
                )

        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if classes_only or not is_public(node.name):
                continue
            if "overload" in decorator_names(node):
                continue
            add(
                node.name,
                node.name,
                "function",
                node,
                function_signature(node, False),
                first_sentence(node),
            )

        # `type StateType = str | int | float | None`: a type alias.
        elif isinstance(node, ast.TypeAlias) and is_public(node.name.id):
            if classes_only:
                continue
            add(
                node.name.id,
                node.name.id,
                "type",
                node,
                f"type {node.name.id} = {ast.unparse(node.value)}",
                None,
            )

        # `Platform = EntityPlatforms`: another name for a class. Kept when
        # the class is known, from this file or one read before it.
        elif (
            isinstance(node, ast.Assign)
            and len(node.targets) == 1
            and isinstance(node.targets[0], ast.Name)
            and isinstance(node.value, ast.Name)
            and is_public(node.targets[0].id)
        ):
            target = node.value.id
            if target in classes or target in known_kinds:
                add(
                    node.targets[0].id,
                    node.targets[0].id,
                    known_kinds.get(target, "class"),
                    node,
                    f"{node.targets[0].id} = {target}",
                    None,
                )
                found[-1]["aliasOf"] = target

    return found


def main():
    request = json.load(sys.stdin)
    known_kinds = {}
    attributes = set()
    symbols = []
    errors = []

    for file in request["files"]:
        try:
            if file.get("moduleOnly"):
                symbols.append(module_symbol(file))
            else:
                symbols.extend(symbols_of(file, known_kinds, attributes))
        except SyntaxError as error:
            errors.append(f"{file['path']}: {error}")

    if errors:
        sys.stderr.write("Could not parse:\n  " + "\n  ".join(errors) + "\n")
        sys.exit(1)

    json.dump({"symbols": symbols, "attributes": sorted(attributes)}, sys.stdout)


if __name__ == "__main__":
    main()

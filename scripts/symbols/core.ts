// Generates src/data/symbols/core.json: the code symbols and modules of Home
// Assistant core that the docs mention, for the cards on inline code (see
// src/lib/code-symbols.ts and src/components/HoverCards.astro). Run it with
// `pnpm symbols` (scripts/generate-symbols.ts).
//
// It reads core from a commit of a core checkout, with Git:
//
// - homeassistant/core.py, core_config.py, config_entries.py,
//   data_entry_flow.py, exceptions.py, and setup.py
// - the classes in homeassistant/const.py, like the `UnitOf...` enums, and
//   `Platform`
// - everything in homeassistant/helpers/ and homeassistant/util/
// - the entity base classes: homeassistant/components/<domain>/__init__.py,
//   entity.py, and the classes in its const.py, for every entity platform,
//   like `SensorEntity` and `SensorDeviceClass`
// - tests/common.py, like `MockConfigEntry`
// - the rest of every entity platform, of homeassistant/auth/, and of the
//   components at least SHARED_API_IMPORTERS other integrations import
//   from, like bluetooth: their methods only link qualified
// - every module of homeassistant/, like `homeassistant.components.fan`,
//   for its docstring, when a page names it
//
// scripts/symbols/extract.py parses them with the parser of Python itself,
// so it needs the Python version core needs: the one in .python-version of
// core. The weekly workflow reads it from there too. For every public class,
// function, and method it records the kind, the module, the signature, the
// first sentence of the docstring, and the line.
//
// Then it keeps only the symbols an inline code span on a page of the core
// index links to, with the rules in src/lib/code-symbols.ts. So the file
// holds what the docs use, not all of core, and stays small enough to
// review.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  INDEXES,
  QUALIFIED_ONLY_MODULES,
  createResolver,
  entityDomainOf,
  isIntegrationConvention,
  isPlainWord,
  moduleMention,
} from "../../src/lib/code-symbols.ts";

import { formatCall } from "./format.ts";
import { readFiles } from "./git.ts";
import type { Mention } from "./mentions.ts";
import type { CodeSymbol, GenerateOptions, Generated, Hook, HooksFile, SymbolIndex } from "./types.ts";

// A symbol as scripts/symbols/extract.py reads it.
type Extracted = Omit<CodeSymbol, "id" | "bare" | "pageBare"> & { bases?: string[] };

// What scripts/symbols/extract.py prints.
interface Extraction {
  symbols: Extracted[];
  attributes: string[];
}

type Candidate = Extracted & Pick<CodeSymbol, "id" | "bare" | "pageBare">;

interface SourceFile {
  path: string;
  classesOnly?: boolean;
  privateMethods?: boolean;
  extended?: boolean;
  moduleOnly?: boolean;
}

type Git = (...args: string[]) => string;

const EXTRACTOR = fileURLToPath(new URL("extract.py", import.meta.url));
const HOOKS_FILE = fileURLToPath(new URL("hooks.json", import.meta.url));
const ROOT = fileURLToPath(new URL("../../", import.meta.url));

// Files whose classes are base classes with helpers for subclasses, like
// `_get_reauth_entry` of a config flow, or `_async_record_activation` of a
// scene: their methods with one leading underscore are API too.
const PRIVATE_METHODS = /^homeassistant\/(config_entries|data_entry_flow)\.py$|^homeassistant\/components\/[a-z0-9_]+\/(__init__|entity)\.py$/;

// A component is shared API when this many other integrations import from
// it. One integration that imports from another, like a config flow that
// uses the `Credentials` of improv_ble, does not make that API.
const SHARED_API_IMPORTERS = 3;

// Splits a parameter list at its top-level commas: the comma in
// `dict[str, Any]` belongs to the parameter.
function splitParameters(text: string) {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const character of text) {
    if ("([{".includes(character)) {
      depth += 1;
    } else if (")]}".includes(character)) {
      depth -= 1;
    }
    if (character === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts;
}

// A `def` written on one line, formatted the way extract.py does.
function formatDef(text: string) {
  const oneLine = text.replace(/\s+/g, " ").replace(/\( /g, "(").replace(/,? \)/g, ")");
  const open = oneLine.indexOf("(");
  const close = oneLine.lastIndexOf(")");
  return formatCall(oneLine.slice(0, open), splitParameters(oneLine.slice(open + 1, close)), oneLine.slice(close + 1), "python");
}

// Code without whitespace and trailing commas, to find a quote in a file
// whatever its line breaks.
const squeeze = (code: string) => code.replace(/\s+/g, "").replace(/,\)/g, ")");

// The integration hooks from hooks.json, with their signatures formatted,
// and the quotes that are no longer in the file they were quoted from.
function readHooks(git: Git, commit: string) {
  const { hooks }: HooksFile = JSON.parse(readFileSync(HOOKS_FILE, "utf8"));
  const missing: string[] = [];
  const files = new Map<string, string>();
  const read = (quote: string) => {
    if (!files.has(quote)) {
      try {
        files.set(
          quote,
          squeeze(quote.startsWith("core:") ? git("show", `${commit}:${quote.slice(5)}`) : readFileSync(path.join(ROOT, quote), "utf8")),
        );
      } catch {
        files.set(quote, "");
      }
    }
    return files.get(quote) ?? "";
  };

  const resolved = Object.entries(hooks).map(([name, hook]): Hook => {
    for (const { quote, signature } of hook.signatures) {
      if (!read(quote).includes(squeeze(signature))) {
        missing.push(`\`${name}\`: the signature is no longer in \`${quote.replace(/^core:/, "")}\``);
      }
    }

    return {
      id: `hook:${name}`,
      name,
      kind: "hook",
      page: hook.page,
      ...(hook.notOn ? { notOn: hook.notOn } : {}),
      signature: hook.signatures.map(({ file, signature }) => `# ${file}\n${formatDef(signature)}`).join("\n\n"),
      doc: hook.when,
    };
  });

  return { hooks: resolved, missing };
}
const { aliases } = INDEXES.core;

// homeassistant/helpers/entity.py is the module homeassistant.helpers.entity.
const moduleOf = (file: string) => file.replace(/\.py$/, "").replace(/\/__init__$/, "").replaceAll("/", ".");

function python() {
  try {
    return `this is ${execFileSync("python3", ["--version"], { encoding: "utf8" }).trim()}`;
  } catch {
    return "python3 was not found";
  }
}

export function generateCore({ checkout, ref, mentions }: GenerateOptions): Generated {
  const git: Git = (...args) => execFileSync("git", args, { cwd: checkout, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

  const commit = git("rev-parse", `${ref}^{commit}`).trim();
  const tree = git("ls-tree", "-r", "--name-only", commit, "homeassistant", "tests").split("\n").filter(Boolean);
  const inTree = new Set(tree);

  // The files to read, in order: a class has to be read before an alias of
  // it, like `Platform = EntityPlatforms` in const.py.
  function sourceFiles() {
    const files: SourceFile[] = [];
    const add = (file: string, classesOnly = false) => {
      if (inTree.has(file)) {
        files.push({ path: file, classesOnly, privateMethods: PRIVATE_METHODS.test(file) });
      }
    };

    const platforms = [...git("show", `${commit}:homeassistant/generated/entity_platforms.py`).matchAll(/= "([a-z_]+)"/g)];

    add("homeassistant/generated/entity_platforms.py", true);
    for (const name of ["core", "core_config", "config_entries", "data_entry_flow", "exceptions", "setup"]) {
      add(`homeassistant/${name}.py`);
    }
    add("homeassistant/const.py", true);
    for (const file of tree.filter((file) => /^homeassistant\/(helpers|util)\/.+\.py$/.test(file))) {
      add(file);
    }
    for (const [, domain] of platforms) {
      add(`homeassistant/components/${domain}/__init__.py`);
      add(`homeassistant/components/${domain}/entity.py`);
      add(`homeassistant/components/${domain}/const.py`, true);
    }
    add("tests/common.py");

    // The rest of the entity platforms and of the components many other
    // integrations import from, like `TrackerEntity` in
    // device_tracker/config_entry.py or the coordinators of bluetooth.
    // Their methods only link qualified: a bare `async_added_to_hass` is
    // the one of `Entity`, not of some class in a component.
    const added = new Set(files.map((file) => file.path));
    const domains = new Set([
      ...platforms.map(([, domain]) => domain),
      ...[...shared].filter(([, importers]) => importers >= SHARED_API_IMPORTERS).map(([domain]) => domain),
    ]);
    for (const file of tree) {
      const domain = file.match(/^homeassistant\/components\/([a-z0-9_]+)\/[^/]+\.py$/)?.[1];
      const isAuth = /^homeassistant\/auth\/.+\.py$/.test(file);
      if (((domain && domains.has(domain)) || isAuth) && !added.has(file)) {
        files.push({ path: file, classesOnly: false, extended: true });
      }
    }

    return files;
  }

  // Every module of core, by its dotted path. A package is its __init__.py.
  const modules = new Map(tree.filter((file) => /^homeassistant\/.+\.py$/.test(file)).map((file) => [moduleOf(file), file]));

  function extract(files: SourceFile[]): Extraction {
    const sources = readFiles(checkout, commit, files.map((file) => file.path));
    const input = {
      files: files.map((file) => ({
        ...file,
        module: moduleOf(file.path),
        source: sources.get(file.path),
      })),
    };

    try {
      const output = execFileSync("python3", [EXTRACTOR], {
        input: JSON.stringify(input),
        encoding: "utf8",
        maxBuffer: 256 * 1024 * 1024,
        stdio: ["pipe", "pipe", "inherit"],
      });
      return JSON.parse(output);
    } catch {
      // The extractor printed what it could not parse. Usually an older
      // Python than core needs, which does not know newer syntax.
      console.error(`Reading core failed. Use the Python version in .python-version of core (${python()}).`);
      process.exit(1);
    }
  }

  // Components that other integrations import from, like diagnostics or
  // bluetooth. What they define is shared API too: when one of them defines
  // a name core also has, like `async_redact_data`, the bare name is
  // ambiguous. Integrations nobody imports from don't count: the
  // `ConfigFlow` class of one integration does not make `ConfigFlow`
  // ambiguous.
  // Returns how many other integrations import from each of them.
  function sharedComponents() {
    const importers = new Map<string, Set<string>>();
    const output = git("grep", "-o", "-E", "homeassistant\\.components\\.[a-z0-9_]+", commit, "--", "homeassistant/components");

    for (const line of output.split("\n")) {
      const match = line.match(/^[^:]+:homeassistant\/components\/([a-z0-9_]+)\/[^:]+:homeassistant\.components\.([a-z0-9_]+)/);
      if (match && match[1] !== match[2]) {
        importers.set(match[2], (importers.get(match[2]) ?? new Set()).add(match[1]));
      }
    }

    return new Map([...importers].map(([component, from]) => [component, from.size]));
  }

  // How often each name is defined: top-level classes and functions in the
  // files read and in shared components (once per file, so overloads count
  // once), plus the methods and aliases the extractor found.
  function definitionCounts(files: SourceFile[], symbols: Extracted[]) {
    const read = new Set(files.map((file) => file.path));
    const counts = new Map<string, number>();
    const count = (name: string) => counts.set(name, (counts.get(name) ?? 0) + 1);

    const output = git("grep", "-o", "-E", "^(async def|def|class) [A-Za-z_][A-Za-z0-9_]*", commit, "--", "homeassistant", "tests/common.py");
    const seen = new Set();

    for (const line of output.split("\n")) {
      const match = line.match(/^[^:]+:([^:]+\.py):(?:async def|def|class) (\w+)$/);
      if (!match) {
        continue;
      }

      const [, file, name] = match;
      const component = file.match(/^homeassistant\/components\/([a-z0-9_]+)\//)?.[1];
      const counted = read.has(file) || (component && shared.has(component));
      if (counted && !seen.has(`${file}:${name}`)) {
        seen.add(`${file}:${name}`);
        count(name);
      }
    }

    for (const symbol of symbols) {
      if ((symbol.qualname.includes(".") && !extended.has(symbol.path) && !overrides.has(symbol)) || symbol.aliasOf) {
        count(symbol.name);
      }
    }

    return counts;
  }

  // How often a method of an entity platform is defined in that platform,
  // like `turn_on` of the climate entity. On the page of the platform, the
  // bare name means that one, whatever other classes call a method.
  function domainCounts(symbols: Extracted[]) {
    const counts = new Map<string, number>();
    for (const symbol of symbols) {
      const domain = entityDomainOf(symbol);
      if (domain && !extended.has(symbol.path)) {
        const key = `${domain}:${symbol.name}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return counts;
  }

  // Why a symbol may not link by its bare name, or undefined when it may.
  function bareBlocker(symbol: Extracted, counts: Map<string, number>, attributes: Set<string>, { onOwnPage = false } = {}) {
    if (overrides.has(symbol) && !onOwnPage) {
      return "overrides the method of a base class";
    }
    if (symbol.kind === "method" && extended.has(symbol.path)) {
      return "a method of a component, linked qualified only";
    }
    if (isIntegrationConvention(symbol.name)) {
      return "integrations define it themselves";
    }
    if (isPlainWord(symbol.name)) {
      return "a plain word";
    }
    if (QUALIFIED_ONLY_MODULES.has(symbol.module)) {
      return "its module is linked qualified only";
    }
    if ((counts.get(symbol.name) ?? 0) > 1) {
      return "defined more than once";
    }
    if (attributes.has(symbol.name)) {
      return "also the name of an attribute";
    }
    return undefined;
  }

  const shared = sharedComponents();
  const files = sourceFiles();
  const extended = new Set(files.filter((file) => file.extended).map((file) => file.path));

  // The modules the pages name, read for their docstring only.
  const namedModules = [
    ...new Set(
      mentions.flatMap((mention) => {
        const name = moduleMention(mention.text);
        return name && modules.has(name) ? [name] : [];
      }),
    ),
  ];
  const moduleFiles = namedModules.flatMap((name) => {
    const file = modules.get(name);
    return file ? [{ path: file, moduleOnly: true }] : [];
  });

  const { symbols: found, attributes: attributeList } = extract([...files, ...moduleFiles]);
  const attributes = new Set(attributeList);
  const symbols = found.filter((symbol) => symbol.kind !== "module");

  // Methods that override a method of a base class, like
  // `CoordinatorEntity.async_added_to_hass`. The bare name means the one of
  // the base class, `Entity.async_added_to_hass`, so overrides don't make it
  // ambiguous. Bases are matched by class name, over the files read.
  // Only the files read in full: in the rest of the components, a
  // `class ConfigFlow(config_entries.ConfigFlow)` would shadow the real one.
  const primary = symbols.filter((symbol) => !extended.has(symbol.path));
  const basesOf = new Map(
    primary.flatMap((symbol) => (symbol.bases ? [[symbol.name, symbol.bases.filter((base) => base !== symbol.name)] as const] : [])),
  );
  const methodsOf = new Map<string, Set<string>>();
  for (const symbol of primary.filter((symbol) => symbol.kind === "method")) {
    const owner = symbol.qualname.split(".")[0];
    methodsOf.set(owner, (methodsOf.get(owner) ?? new Set()).add(symbol.name));
  }
  const inherits = (owner: string, name: string, seen = new Set<string>()): boolean =>
    (basesOf.get(owner) ?? []).some((base) => {
      if (seen.has(base)) {
        return false;
      }
      seen.add(base);
      return methodsOf.get(base)?.has(name) || inherits(base, name, seen);
    });
  const overrides = new Set(primary.filter((symbol) => symbol.kind === "method" && inherits(symbol.qualname.split(".")[0], symbol.name)));

  const counts = definitionCounts(files, symbols);

  // An alias has the docstring of what it is another name for.
  const classes = new Map(symbols.filter((symbol) => !symbol.aliasOf && !symbol.qualname.includes(".")).map((symbol) => [symbol.name, symbol]));
  for (const symbol of symbols) {
    if (!symbol.aliasOf) {
      continue;
    }
    const target = classes.get(symbol.aliasOf);
    symbol.doc ??= target?.doc ?? null;
    if (target?.members) {
      symbol.members = target.members;
    }
  }

  const perDomain = domainCounts(symbols);
  const candidates = [
    ...symbols.map((symbol) => {
      const bare = !bareBlocker(symbol, counts, attributes);
      const domain = entityDomainOf(symbol);
      // Blocked only because another class defines it too, or because it
      // overrides a base class: it still links on the page of its own
      // entity platform, like `turn_on` of the fan entity.
      const pageBare =
        !bare &&
        domain &&
        perDomain.get(`${domain}:${symbol.name}`) === 1 &&
        !bareBlocker(symbol, new Map(), attributes, { onOwnPage: true });
      return { id: `${symbol.module}.${symbol.qualname}`, ...symbol, bare, ...(pageBare ? { pageBare } : {}) };
    }),
    // A module links by its full path only.
    ...found.filter((symbol) => symbol.kind === "module").map((symbol) => ({ id: symbol.module, ...symbol, bare: false })),
  ];

  const { hooks, missing } = readHooks(git, commit);
  const resolve = createResolver(candidates, aliases, hooks);
  const used = new Map<string, Candidate>();
  const usedHooks = new Map<string, Hook>();
  const linked: Mention[] = [];

  for (const mention of mentions) {
    const symbol = resolve(mention.text, mention.domain, mention.url);
    if (symbol && "page" in symbol) {
      usedHooks.set(symbol.id, symbol);
      linked.push(mention);
      continue;
    }
    if (symbol) {
      used.set(symbol.id, symbol);
      linked.push(mention);
    }
  }

  const kept = [...used.values()].sort((a, b) => a.id.localeCompare(b.id));
  const index: SymbolIndex = {
    repository: INDEXES.core.repository,
    commit,
    symbols: kept.map(({ id, name, qualname, kind, module, path: file, line, signature, doc, bare, pageBare, aliasOf, members }) => ({
      id,
      name,
      qualname,
      kind,
      module,
      path: file,
      line,
      signature,
      doc,
      bare,
      ...(pageBare ? { pageBare } : {}),
      ...(aliasOf ? { aliasOf } : {}),
      ...(members ? { members } : {}),
    })),
    hooks: [...usedHooks.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };

  const pages = new Set(linked.map((mention) => mention.file));
  const summary = [
    `Read ${files.length} files of ${INDEXES.core.repository}@${commit.slice(0, 10)}: ${symbols.length} public symbols, and ${modules.size} modules.`,
    `The docs mention ${kept.length} of them and ${usedHooks.size} integration hooks, ${linked.length} times on ${pages.size} pages.`,
  ];
  if (missing.length) {
    summary.push("", "Integration hooks to check in scripts/symbols/hooks.json:", "", ...missing.map((line) => `- ${line}`));
  }

  return { index, summary };
}

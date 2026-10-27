// Generates src/data/symbols/frontend.json: the code symbols of the Home
// Assistant frontend that the docs mention, for the cards on inline code
// (see src/lib/code-symbols.mjs and src/components/HoverCards.astro). Run
// it with `pnpm symbols` (scripts/generate-symbols.ts).
//
// It reads every TypeScript file in src/ of a commit of a frontend checkout,
// with Git, and parses it with the TypeScript compiler API. Nothing of the
// frontend is installed or run. It records what a module exports:
//
// - functions, and arrow functions in an exported `const`
// - mixins: a function that returns a class, like `SubscribeMixin`, with
//   the public and protected members of that class, like
//   `hassSubscribeRequiredHostProps`
// - contexts: an exported `const` made with `createContext`
// - classes, with their public and protected members, except for custom
//   elements: their API is on the component pages of the Design area
// - interfaces, with their members, like `HomeAssistant.callWS`; types; and
//   enums
//
// For each: the kind, the file, the signature as written (formatted the way
// Prettier formats the frontend), the first sentence of its JSDoc, and the
// line.
//
// Then it keeps only the symbols an inline code span on a page of the
// frontend index links to, with the rules in src/lib/code-symbols.mjs.

import { execFileSync } from "node:child_process";
import ts from "typescript";
import { INDEXES, createResolver, isPlainWord } from "../../src/lib/code-symbols.mjs";
import { LINE_LENGTH, formatCall, formatPart } from "./format.ts";
import { readFiles } from "./git.ts";
import type { Mention } from "./mentions.ts";
import type { CodeSymbol, GenerateOptions, Generated, SymbolIndex } from "./types.ts";

// A symbol as it is read from the source, before the rules for linking.
type Found = Omit<CodeSymbol, "id" | "bare" | "pageBare" | "aliasOf"> & {
  ownerKind?: string;
  bases?: string[];
  inherited?: boolean;
};

type Candidate = Found & Pick<CodeSymbol, "id" | "bare">;

interface Member {
  name: string;
  kind: "method" | "property";
  node: ts.Node;
  signature: string;
}

type SignatureNode = ts.SignatureDeclarationBase;

const { aliases } = INDEXES.frontend;

// An interface in the card lists this many members, and how many more
// there are.
const INTERFACE_MEMBERS = 10;

// Methods of every Lit element. A mention means the one of Lit, not the
// one a mixin happens to override.
const LIT_LIFECYCLE = new Set([
  "connectedCallback",
  "disconnectedCallback",
  "attributeChangedCallback",
  "adoptedCallback",
  "createRenderRoot",
  "firstUpdated",
  "getUpdateComplete",
  "performUpdate",
  "requestUpdate",
  "scheduleUpdate",
  "shouldUpdate",
  "willUpdate",
  "updated",
  "update",
  "render",
]);

// Decorators that make a class field a property of an element, like `hass`
// or `narrow`. The docs mean the property, not a function of that name.
const PROPERTY_DECORATORS = new Set(["property", "state", "consume", "provide", "query", "queryAll", "queryAsync"]);

// Code written over several lines, on one line the way Prettier writes it:
// `{ bubbles?: boolean; composed?: boolean }`, `(a: string)`.
const oneLine = (text: string) =>
  text
    .replace(/\s+/g, " ")
    .replace(/([(<[]) /g, "$1")
    .replace(/ ([)>\]])/g, "$1")
    .replace(/[,;]\s*([)>\]}])/g, "$1")
    .replace(/\{(?=\S)/g, "{ ")
    .replace(/(?<=\S)\}/g, " }")
    .replace(/\{ \}/g, "{}")
    .trim();

// `interface Name extends A, B`, or when that is too long, the way
// Prettier breaks it: `extends` on its own line, one base per line.
function heritageHead(head: string, node: ts.ClassDeclaration | ts.InterfaceDeclaration) {
  const clauses = (node.heritageClauses ?? []).map((clause) => ({
    keyword: clause.token === ts.SyntaxKind.ExtendsKeyword ? "extends" : "implements",
    types: clause.types.map((type) => oneLine(type.getText())),
  }));
  const line = [head, ...clauses.map(({ keyword, types }) => `${keyword} ${types.join(", ")}`)].join(" ");
  if (line.length <= LINE_LENGTH) {
    return line;
  }
  return [head, ...clauses.map(({ keyword, types }) => `  ${keyword}\n${types.map((type) => `    ${type}`).join(",\n")}`)].join("\n");
}

const typeParameters = (node: { typeParameters?: ts.NodeArray<ts.TypeParameterDeclaration> }) =>
  node.typeParameters?.length ? `<${node.typeParameters.map((parameter) => oneLine(parameter.getText())).join(", ")}>` : "";

function functionSignature(name: string, node: SignatureNode) {
  const tail = node.type ? `: ${oneLine(node.type.getText())}` : "";
  return formatCall(
    `${name}${typeParameters(node)}`,
    node.parameters.map((parameter) => oneLine(parameter.getText())),
    tail,
    "typescript",
  );
}

const hasModifier = (node: ts.Node, kind: ts.SyntaxKind) =>
  (ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined)?.some((modifier) => modifier.kind === kind) ?? false;
const isExported = (node: ts.Node) => hasModifier(node, ts.SyntaxKind.ExportKeyword) && !hasModifier(node, ts.SyntaxKind.DefaultKeyword);

function decoratorNames(node: ts.Node) {
  return (ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : []).map((decorator) => {
    const expression = ts.isCallExpression(decorator.expression) ? decorator.expression.expression : decorator.expression;
    return ts.isIdentifier(expression) ? expression.text : "";
  });
}

// The first sentence of the JSDoc of a node, or null.
function firstSentence(node: ts.Node) {
  const docs = ts.getJSDocCommentsAndTags(node).filter(ts.isJSDoc);
  const comment = ts.getTextOfJSDocComment(docs.at(-1)?.comment);
  if (!comment) {
    return null;
  }

  const text = comment.split(/\n\s*\n/)[0].replace(/\s+/g, " ").trim();
  const end = text.search(/(?<!\be\.g)(?<!\bi\.e)\.(\s|$)/);
  return end === -1 ? text : text.slice(0, end + 1);
}

const memberName = (member: ts.ClassElement | ts.TypeElement) =>
  member.name && (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) ? member.name.text : undefined;

const isPublicName = (name: string | undefined): name is string => !!name && !name.startsWith("_") && !name.startsWith("#");

// The members of a class a page can mean: public and protected methods and
// fields. Not private ones, and not the ones with a leading underscore.
function classMembers(node: ts.ClassLikeDeclaration, owner: string) {
  const members: Member[] = [];

  for (const member of node.members) {
    const name = memberName(member);
    if (!isPublicName(name) || hasModifier(member, ts.SyntaxKind.PrivateKeyword) || ts.isConstructorDeclaration(member)) {
      continue;
    }

    if (ts.isMethodDeclaration(member)) {
      members.push({ name, kind: "method", node: member, signature: functionSignature(`${owner}.${name}`, member) });
    } else if (ts.isPropertyDeclaration(member) || ts.isGetAccessorDeclaration(member)) {
      const type = member.type ? `: ${oneLine(member.type.getText())}` : "";
      members.push({ name, kind: "property", node: member, signature: `${owner}.${name}${member.questionToken ? "?" : ""}${type}` });
    }
  }

  return members;
}

function interfaceMembers(node: ts.InterfaceDeclaration, owner: string) {
  const members: Member[] = [];

  for (const member of node.members) {
    const name = memberName(member);
    if (!isPublicName(name)) {
      continue;
    }

    if (ts.isMethodSignature(member)) {
      members.push({ name, kind: "method", node: member, signature: functionSignature(`${owner}.${name}`, member) });
    } else if (ts.isPropertySignature(member)) {
      const type = member.type ? `: ${oneLine(member.type.getText())}` : "";
      members.push({ name, kind: "property", node: member, signature: `${owner}.${name}${member.questionToken ? "?" : ""}${type}` });
    }
  }

  return members;
}

// The class a mixin returns: `(superClass) => class extends superClass {}`,
// or a function body that declares a class and returns it.
function mixinClass(fn: ts.FunctionLikeDeclaration) {
  const body = fn.body;
  if (!body) {
    return undefined;
  }
  if (ts.isClassExpression(body)) {
    return body;
  }
  if (ts.isParenthesizedExpression(body) && ts.isClassExpression(body.expression)) {
    return body.expression;
  }
  if (!ts.isBlock(body)) {
    return undefined;
  }

  for (const statement of body.statements) {
    if (ts.isClassDeclaration(statement)) {
      return statement;
    }
    if (ts.isReturnStatement(statement) && statement.expression && ts.isClassExpression(statement.expression)) {
      return statement.expression;
    }
  }
  return undefined;
}

function isFunction(node: ts.Node | undefined) {
  return node !== undefined && (ts.isArrowFunction(node) || ts.isFunctionExpression(node));
}

// The public symbols of one file, and the names of element properties in
// it.
function symbolsOf(file: string, source: string) {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const symbols: Found[] = [];
  const attributes = new Set<string>();
  const elements = new Set<string>();

  const line = (node: ts.Node) => sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  const add = (
    name: string,
    qualname: string,
    kind: string,
    node: ts.Node,
    signature: string,
    doc: string | null,
    extra: Pick<Found, "ownerKind" | "bases" | "members"> = {},
  ) => symbols.push({ name, qualname, kind, module: file, path: file, line: line(node), signature, doc, ...extra });
  const addMembers = (owner: string, members: Member[], ownerKind: string) => {
    for (const member of members) {
      add(member.name, `${owner}.${member.name}`, member.kind, member.node, member.signature, firstSentence(member.node), { ownerKind });
    }
  };

  // Element properties in every class of the file, exported or not, and
  // the classes that are custom elements.
  const visit = (node: ts.Node) => {
    if (ts.isPropertyDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) {
      const name = memberName(node);
      if (name && decoratorNames(node).some((decorator) => PROPERTY_DECORATORS.has(decorator))) {
        attributes.add(name);
      }
    }
    if (ts.isClassDeclaration(node) && node.name && decoratorNames(node).includes("customElement")) {
      elements.add(node.name.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(sourceFile) === "customElements.define" &&
      node.arguments[1] &&
      ts.isIdentifier(node.arguments[1])
    ) {
      elements.add(node.arguments[1].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  for (const statement of sourceFile.statements) {
    if (!isExported(statement)) {
      continue;
    }

    if (ts.isFunctionDeclaration(statement) && statement.name) {
      // Overloads: the first declaration is the one to show.
      const name = statement.name.text;
      if (symbols.some((symbol) => symbol.qualname === name)) {
        continue;
      }
      const returned = mixinClass(statement);
      add(name, name, returned ? "mixin" : "function", statement, functionSignature(name, statement), firstSentence(statement));
      if (returned) {
        addMembers(name, classMembers(returned, name), "mixin");
      }
    } else if (ts.isClassDeclaration(statement) && statement.name) {
      const name = statement.name.text;
      add(name, name, "class", statement, `${heritageHead(`class ${name}${typeParameters(statement)}`, statement)} {}`, firstSentence(statement));
      if (!elements.has(name)) {
        addMembers(name, classMembers(statement, name), "class");
      }
    } else if (ts.isInterfaceDeclaration(statement)) {
      const name = statement.name.text;
      const members = interfaceMembers(statement, name);
      const shown = members.slice(0, INTERFACE_MEMBERS).map((member) => `  ${member.signature.slice(name.length + 1)};`);
      if (members.length > INTERFACE_MEMBERS) {
        shown.push(`  // and ${members.length - INTERFACE_MEMBERS} more`);
      }
      const head = heritageHead(`interface ${name}${typeParameters(statement)}`, statement);
      const bases = (statement.heritageClauses ?? []).flatMap((clause) =>
        clause.types.map((type) => type.expression.getText(sourceFile)).filter((base) => /^\w+$/.test(base)),
      );
      add(name, name, "interface", statement, shown.length ? `${head} {\n${shown.join("\n")}\n}` : `${head} {}`, firstSentence(statement), {
        bases,
      });
      addMembers(name, members, "interface");
    } else if (ts.isTypeAliasDeclaration(statement)) {
      const name = statement.name.text;
      add(name, name, "type", statement, `type ${name}${typeParameters(statement)} = ${statement.type.getText()};`, firstSentence(statement));
    } else if (ts.isEnumDeclaration(statement)) {
      const name = statement.name.text;
      const members = statement.members.map((member) => member.name.getText(sourceFile));
      add(name, name, "enum", statement, `enum ${name} {\n${members.map((member) => `  ${member},`).join("\n")}\n}`, firstSentence(statement), {
        members,
      });
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) {
          continue;
        }

        const name = declaration.name.text;
        const initializer = declaration.initializer;
        const doc = firstSentence(statement);

        if (isFunction(initializer)) {
          const returned = mixinClass(initializer);
          add(name, name, returned ? "mixin" : "function", statement, functionSignature(name, initializer), doc);
          if (returned) {
            addMembers(name, classMembers(returned, name), "mixin");
          }
        } else if (initializer && ts.isCallExpression(initializer) && initializer.expression.getText(sourceFile) === "createContext") {
          add(name, name, "context", statement, formatPart(`const ${name} = ${oneLine(initializer.getText())}`, "", ";", "typescript").join("\n"), doc);
        }
      }
    }
  }

  return { symbols, attributes };
}

// Why a symbol may not link by its bare name, or undefined when it may.
function bareBlocker(symbol: Found, counts: Map<string, number>, attributes: Set<string>) {
  // `Supervisor` is also the name of a label, a product, or a heading.
  if (isPlainWord(symbol.name) || /^[A-Z][a-z0-9]+$/.test(symbol.name)) {
    return "a plain word";
  }
  if (LIT_LIFECYCLE.has(symbol.name)) {
    return "a method of every Lit element";
  }
  if ((counts.get(symbol.name) ?? 0) > 1) {
    return "defined more than once";
  }
  if (symbol.kind === "property" && symbol.ownerKind === "interface") {
    return "a field of an interface, only linked qualified";
  }
  if (attributes.has(symbol.name) && !["mixin", "class", "interface", "type", "enum", "context"].includes(symbol.kind)) {
    return "also the name of an element property";
  }
  return undefined;
}

export function generateFrontend({ checkout, ref, mentions }: GenerateOptions): Generated {
  const git = (...args: string[]) => execFileSync("git", args, { cwd: checkout, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

  const commit = git("rev-parse", `${ref}^{commit}`).trim();
  const files = git("ls-tree", "-r", "--name-only", commit, "src")
    .split("\n")
    .filter((file) => /\.ts$/.test(file) && !/\.d\.ts$/.test(file));
  const sources = readFiles(checkout, commit, files);

  const found: Found[] = [];
  const attributes = new Set<string>();
  for (const file of files) {
    const result = symbolsOf(file, sources.get(file) ?? "");
    found.push(...result.symbols);
    for (const name of result.attributes) {
      attributes.add(name);
    }
  }

  // An interface has the members of the interfaces it extends, so
  // `hass.callWS` finds `callWS` of `HomeAssistantApi`, which
  // `HomeAssistant` extends. A base is looked up in the same file first,
  // then by its name when only one file exports it.
  const interfaces = found.filter((symbol) => symbol.kind === "interface");
  const membersOf = (owner: Found) =>
    found.filter((symbol) => symbol.ownerKind === "interface" && symbol.path === owner.path && symbol.qualname.startsWith(`${owner.name}.`));
  const findBase = (name: string, file: string) => {
    const local = interfaces.find((symbol) => symbol.name === name && symbol.path === file);
    const exported = interfaces.filter((symbol) => symbol.name === name);
    return local ?? (exported.length === 1 ? exported[0] : undefined);
  };
  const inherited = (owner: Found, seen = new Set<Found>()): Found[] =>
    (owner.bases ?? []).flatMap((name) => {
      const base = findBase(name, owner.path);
      if (!base || seen.has(base)) {
        return [];
      }
      seen.add(base);
      return [...membersOf(base), ...inherited(base, seen)];
    });

  for (const owner of interfaces) {
    const own = new Set(membersOf(owner).map((member) => member.name));
    for (const member of inherited(owner)) {
      if (own.has(member.name)) {
        continue;
      }
      own.add(member.name);
      const baseOwner = member.qualname.split(".")[0];
      found.push({
        ...member,
        qualname: `${owner.name}.${member.name}`,
        // The owner the docs use, so `hass.callWS` matches; the file and
        // line stay those of the declaration.
        module: owner.path,
        signature: member.signature.replace(`${baseOwner}.`, `${owner.name}.`),
        // Only linked qualified: the bare name links to the declaration.
        inherited: true,
      });
    }
  }

  // How often each name is defined: once per file, so the interface
  // `HassSubscribeElement` and the mixin that implements it in the same
  // file count once for `hassSubscribe`.
  //
  // A top-level export, like the function `showToast`, does not compete
  // with the fields of an interface, like `Lovelace.showToast`: those only
  // ever link qualified. Except the fields of `HomeAssistant`: a bare
  // `callWS()` in the docs means `hass.callWS`, not the export of
  // src/util/websocket.ts. Members of classes and mixins do compete with
  // interface fields: `getStubConfig` is a convention of many interfaces.
  const hassInterface = aliases.hass;
  const isInterfaceField = (symbol: Found) => symbol.kind === "property" && symbol.ownerKind === "interface";
  const countWith = (include: (symbol: Found) => boolean) => {
    const counts = new Map<string, number>();
    const seen = new Set<string>();
    for (const symbol of found.filter(include)) {
      const key = `${symbol.path}:${symbol.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        counts.set(symbol.name, (counts.get(symbol.name) ?? 0) + 1);
      }
    }
    return counts;
  };
  // `HomeAssistant` gets most of its fields from the interfaces it
  // extends, like `callWS` from `HomeAssistantApi`: those count too.
  const isHassField = (symbol: Found) => `${symbol.module}.${symbol.qualname.split(".")[0]}` === hassInterface;
  const allCounts = countWith((symbol) => !symbol.inherited);
  const exportCounts = countWith((symbol) => (symbol.inherited ? isHassField(symbol) : !isInterfaceField(symbol) || isHassField(symbol)));
  const countsFor = (symbol: Found) => (symbol.ownerKind ? allCounts : exportCounts);

  // In that case the bare name means the implementation, not the
  // interface.
  const implemented = new Set(
    found.filter((symbol) => symbol.ownerKind && symbol.ownerKind !== "interface").map((symbol) => `${symbol.path}:${symbol.name}`),
  );
  const candidates = found.map((symbol): Candidate => ({
    id: `${symbol.path}:${symbol.qualname}`,
    ...symbol,
    bare:
      !symbol.inherited &&
      !(symbol.ownerKind === "interface" && implemented.has(`${symbol.path}:${symbol.name}`)) &&
      !bareBlocker(symbol, countsFor(symbol), attributes),
  }));

  const resolve = createResolver(candidates, aliases);
  const used = new Map<string, Candidate>();
  const linked: Mention[] = [];

  for (const mention of mentions) {
    const symbol: Candidate | undefined = resolve(mention.text, mention.domain, mention.url);
    if (symbol) {
      used.set(symbol.id, symbol);
      linked.push(mention);
    }
  }

  const kept = [...used.values()].sort((a, b) => a.id.localeCompare(b.id));
  const index: SymbolIndex = {
    repository: INDEXES.frontend.repository,
    commit,
    symbols: kept.map(({ id, name, qualname, kind, module, path: file, line, signature, doc, bare, members }) => ({
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
      ...(members ? { members } : {}),
    })),
  };

  const pages = new Set(linked.map((mention) => mention.file));
  const summary = [
    `Read ${files.length} files of ${INDEXES.frontend.repository}@${commit.slice(0, 10)}: ${found.length} exported symbols and members.`,
    `The docs mention ${kept.length} of them, ${linked.length} times on ${pages.size} pages.`,
  ];

  return { index, summary };
}

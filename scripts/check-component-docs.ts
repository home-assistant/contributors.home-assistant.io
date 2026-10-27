// Compares what the component pages of the Design area document "In code"
// with the public API of the components in the frontend source.
//
// The demos are built from the frontend, so they are current after every
// rebuild. The written reference is not: an attribute that is renamed in the
// frontend stays on the page until someone notices. This script notices.
//
// For every page in src/content/docs/design/components/, it finds the
// frontend files the page links to as its source, and reads them from a
// commit of a frontend checkout. From the source, it collects:
//
// - Properties (`@property`, not `@state`), with the attribute each one has:
//   its own name in lowercase, the `attribute:` option, or none with
//   `attribute: false`. Attributes from `@attr` in JSDoc count as well.
// - Slots: `@slot` in JSDoc, and `<slot>` elements in the templates.
// - Events: `@fires` in JSDoc, `fireEvent(this, "...")`, and
//   `new CustomEvent("...")` or `new Event("...")`.
// - CSS custom properties: `@cssprop` in JSDoc, and every custom property
//   the styles read with a fallback, like `var(--ha-switch-size, 24px)`.
// - Attributes that only style, like `:host([multiline-secondary])`.
// - Methods, for the pages that list them.
//
// Base classes in the frontend itself, and mixins, are followed. A base
// class from a package, like a Web Awesome component, is not: what a page
// documents that the frontend code does not have is reported as possibly
// inherited from that class, not as missing.
//
// Then it reads what the page documents under "In code": the lists under
// Attributes, Properties, Slots, Events, Styling, and Methods, per element.
// It reports, per page:
//
// - Documented, but not in the source: probably renamed or removed. This
//   is the list to act on.
// - Linked or documented, but gone from the source: a source file the page
//   links, or an element it documents, no longer exists. Act on this too.
// - Not found, but the component inherits from a package: check by hand.
// - In the source, but not documented: maybe on purpose, maybe forgotten.
//
// Usage:
//   pnpm check:component-docs                        # origin/dev of ../frontend
//   pnpm check:component-docs --ref some-branch      # another branch, tag, or commit
//   pnpm check:component-docs --from /path/frontend  # another checkout
//   pnpm check:component-docs --json report.json    # also write the report as JSON
//   pnpm check:component-docs --strict               # fail on missing or gone
//
// It only reads the frontend with Git. It needs no installed dependencies,
// and the state of the working copy does not matter. Run `git fetch` in the
// frontend checkout first, to check against the latest.
//
// The report goes to stdout, as Markdown. The exit code is 0, unless
// --strict is set and something documented is missing or gone.

import { execFileSync } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import ts from "typescript";
import { parse as parseYaml } from "yaml";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PAGES_DIR = path.join(ROOT, "src/content/docs/design/components");
const PAGES_PATH = "src/content/docs/design/components";

const SOURCE_LINK = /https:\/\/github\.com\/home-assistant\/frontend\/blob\/[^/]+\/(src\/[^)\s]+\.ts)/g;

// Base classes that add no API a page documents.
const LIT_BASES = new Set(["LitElement", "ReactiveElement", "HTMLElement"]);

// Methods every Lit element has. They are not part of what a page documents.
const LIFECYCLE_METHODS = new Set([
  "render",
  "update",
  "updated",
  "firstUpdated",
  "willUpdate",
  "shouldUpdate",
  "connectedCallback",
  "disconnectedCallback",
  "attributeChangedCallback",
  "createRenderRoot",
  "getUpdateComplete",
  "scheduleUpdate",
  "performUpdate",
  "requestUpdate",
  "constructor",
  "styles",
  "properties",
  "shadowRootOptions",
]);

const KINDS = ["attributes", "properties", "slots", "events", "cssProperties", "methods"] as const;

type Kind = (typeof KINDS)[number];

const KIND_LABELS: Record<Kind, string> = {
  attributes: "attribute",
  properties: "property",
  slots: "slot",
  events: "event",
  cssProperties: "CSS custom property",
  methods: "method",
};

type ClassNode = ts.ClassDeclaration | ts.ClassExpression;

interface ParsedFile {
  file: string;
  text: string;
  sourceFile: ts.SourceFile;
  classes: ClassNode[];
  imports: Map<string, { specifier: string; name: string }>;
  tags: Map<string, ClassNode | undefined>;
}

interface ElementApi {
  attributes: Map<string, string | undefined>;
  styledAttributes: Set<string>;
  properties: Map<string, { declared: boolean; attribute: string | null }>;
  slots: Set<string>;
  events: Set<string>;
  eventPatterns: RegExp[];
  declaredEvents: Set<string>;
  cssProperties: Set<string>;
  cssReads: Set<string>;
  cssMentions: Set<string>;
  methods: Set<string>;
  inherits: string[];
  wraps: string[];
  files: string[];
}

// What a page documents for one element, per kind.
type Documented = Record<Kind, Set<string>>;

interface PageFrontMatter {
  title?: string;
  lastVerified?: string | number | Date;
}

interface Page {
  file: string;
  title: string;
  lastVerified: string | null;
  sources: string[];
  elements: Map<string, Documented>;
}

interface Finding {
  kind: Kind;
  name: string;
  note?: string;
}

interface ElementResult {
  element: string;
  file: string | null;
  inherits: string[];
  wraps: string[];
  missing: Finding[];
  inherited: Finding[];
  documented: Record<string, string[]>;
  undocumented: Record<Kind, string[]>;
}

interface PageResult {
  page: string;
  title: string;
  lastVerified: string | null;
  sources: string[];
  elements: ElementResult[];
  notes: string[];
  gone: string[];
}

const { values: options } = parseArgs({
  options: {
    from: { type: "string", default: "../frontend" },
    ref: { type: "string", default: "origin/dev" },
    json: { type: "string" },
    strict: { type: "boolean", default: false },
  },
});

const checkout = path.resolve(options.from);

function git(...args: string[]) {
  return execFileSync("git", args, { cwd: checkout, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

const commit = git("rev-parse", `${options.ref}^{commit}`).trim();
const sourceFiles = new Set(git("ls-tree", "-r", "--name-only", commit, "src").split("\n").filter(Boolean));

const fileContents = new Map<string, string | undefined>();

function readSource(file: string) {
  if (!fileContents.has(file)) {
    fileContents.set(file, sourceFiles.has(file) ? git("show", `${commit}:${file}`) : undefined);
  }

  return fileContents.get(file);
}

// Every custom element in the frontend, by tag, so a page can name an
// element without linking its file, and so the elements a component renders
// can be found.
function indexElements() {
  const elements = new Map<string, string>();
  const pattern = `customElement\\(\\s*"[a-z0-9-]+"|customElements\\.define\\(\\s*"[a-z0-9-]+"`;
  const output = git("grep", "-n", "-E", pattern, commit, "--", "src");

  for (const line of output.split("\n")) {
    const match = line.match(/^[^:]+:([^:]+):\d+:.*?(?:customElement|customElements\.define)\(\s*"([a-z0-9-]+)"/);
    if (match && !elements.has(match[2])) {
      elements.set(match[2], match[1]);
    }
  }

  return elements;
}

const elementFiles = indexElements();

// The custom properties the theme defines. Components read these, like
// --primary-color, but they are tokens of the theme, not API of the component.
function themeTokens() {
  const tokens = new Set<string>();

  for (const file of sourceFiles) {
    if (file.startsWith("src/resources/theme/")) {
      for (const match of (readSource(file) ?? "").matchAll(/(--[a-z0-9-]+)\s*:/g)) {
        tokens.add(match[1]);
      }
    }
  }

  return tokens;
}

const THEME_TOKENS = themeTokens();

function resolveImport(fromFile: string, specifier: string) {
  if (!specifier.startsWith(".")) {
    return undefined;
  }

  const base = path.posix.join(path.posix.dirname(fromFile), specifier);
  return [`${base}.ts`, `${base}/index.ts`, base].find((candidate) => sourceFiles.has(candidate));
}

const parsedFiles = new Map<string, ParsedFile>();

// Parses a file once: its classes (declarations and the class expressions
// of mixins), the names it imports, and the custom elements it defines.
function parseFile(file: string) {
  const cached = parsedFiles.get(file);
  if (cached) {
    return cached;
  }

  const text = readSource(file) ?? "";
  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const parsed: ParsedFile = { file, text, sourceFile, classes: [], imports: new Map(), tags: new Map() };
  // A class, or the name of one for customElements.define.
  const defined = new Map<string, ClassNode | string>();

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      const clause = node.importClause;

      if (clause?.name) {
        parsed.imports.set(clause.name.text, { specifier, name: "default" });
      }

      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const element of clause.namedBindings.elements) {
          parsed.imports.set(element.name.text, { specifier, name: (element.propertyName ?? element.name).text });
        }
      }
    }

    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      parsed.classes.push(node);

      for (const decorator of ts.getDecorators(node) ?? []) {
        const call = decorator.expression;
        if (ts.isCallExpression(call) && call.expression.getText() === "customElement") {
          const [tag] = call.arguments;
          if (tag && ts.isStringLiteral(tag)) {
            defined.set(tag.text, node);
          }
        }
      }
    }

    // customElements.define("tag", SomeClass)
    if (ts.isCallExpression(node) && node.expression.getText() === "customElements.define") {
      const [tag, element] = node.arguments;
      if (tag && ts.isStringLiteral(tag) && element && ts.isIdentifier(element)) {
        defined.set(tag.text, element.text);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // A tag registered with customElements.define points to a class by name.
  for (const [tag, target] of defined) {
    parsed.tags.set(tag, typeof target === "string" ? parsed.classes.find((node) => node.name?.text === target) : target);
  }

  parsedFiles.set(file, parsed);
  return parsed;
}

function emptyApi(): ElementApi {
  return {
    // Attribute name, in lowercase, to the name of its property.
    attributes: new Map(),
    // Attributes the styles select on, like `:host([narrow])`.
    styledAttributes: new Set(),
    // Every public property, and whether it is a declared @property.
    properties: new Map(),
    slots: new Set(),
    events: new Set(),
    // Events with a computed name, like `${this._activeSlider}-changed`.
    eventPatterns: [],
    // Events a file only declares a type for, in `interface HASSDomEvents`.
    declaredEvents: new Set(),
    // The custom properties the frontend documents itself, with @cssprop.
    cssProperties: new Set(),
    // The custom properties the styles read with a fallback.
    cssReads: new Set(),
    // Every custom property the files mention, to check documented ones against.
    cssMentions: new Set(),
    methods: new Set(),
    // Base classes from packages, like "Switch (@home-assistant/webawesome/...)".
    inherits: [],
    // Web Awesome elements the component renders and passes through, like
    // <wa-input> in <ha-input>. Their events and slots surface on it.
    wraps: [],
    files: [],
  };
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind) {
  return ((ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined) ?? []).some((modifier) => modifier.kind === kind);
}

function isPublicMember(node: ts.ClassElement) {
  const name = node.name?.getText();
  return (
    name &&
    !name.startsWith("_") &&
    !name.startsWith("#") &&
    !hasModifier(node, ts.SyntaxKind.PrivateKeyword) &&
    !hasModifier(node, ts.SyntaxKind.ProtectedKeyword) &&
    !hasModifier(node, ts.SyntaxKind.StaticKeyword)
  );
}

// What a `@property(...)` decorator says about the attribute: its name, or
// null for `attribute: false`.
function propertyAttribute(decorator: ts.Decorator, propertyName: string) {
  const [argument] = ts.isCallExpression(decorator.expression) ? decorator.expression.arguments : [];
  if (!argument || !ts.isObjectLiteralExpression(argument)) {
    return propertyName.toLowerCase();
  }

  for (const option of argument.properties) {
    if (ts.isPropertyAssignment(option) && option.name.getText() === "attribute") {
      if (option.initializer.kind === ts.SyntaxKind.FalseKeyword) {
        return null;
      }

      if (ts.isStringLiteralLike(option.initializer)) {
        return option.initializer.text;
      }
    }
  }

  return propertyName.toLowerCase();
}

function decoratorName(decorator: ts.Decorator) {
  const expression = decorator.expression;
  return ts.isCallExpression(expression) ? expression.expression.getText() : expression.getText();
}

function collectMembers(classNode: ClassNode, api: ElementApi) {
  for (const member of classNode.members) {
    if (!member.name || !isPublicMember(member)) {
      continue;
    }

    const name = member.name.getText();
    const decorators = (ts.canHaveDecorators(member) ? (ts.getDecorators(member) ?? []) : []).map(
      (decorator) => [decoratorName(decorator), decorator] as const,
    );

    if (decorators.some(([decorator]) => decorator === "state" || decorator.startsWith("query"))) {
      continue;
    }

    const property = decorators.find(([decorator]) => decorator === "property");
    if (property) {
      const attribute = propertyAttribute(property[1], name);
      api.properties.set(name, { declared: true, attribute });
      if (attribute) {
        api.attributes.set(attribute.toLowerCase(), name);
      }
      continue;
    }

    if (ts.isMethodDeclaration(member)) {
      if (!LIFECYCLE_METHODS.has(name)) {
        api.methods.add(name);
      }
      continue;
    }

    if (ts.isPropertyDeclaration(member) || ts.isGetAccessor(member) || ts.isSetAccessor(member)) {
      if (!api.properties.has(name) && !LIFECYCLE_METHODS.has(name)) {
        api.properties.set(name, { declared: false, attribute: null });
      }
    }
  }
}

// Everything that is found in the text of a file, not in a class: JSDoc
// tags, events, slots in templates, and custom properties in the styles.
function collectFromText(parsed: ParsedFile, api: ElementApi) {
  const { text, sourceFile } = parsed;

  for (const match of text.matchAll(/@slot\s+([^\s*]+)/g)) {
    api.slots.add(match[1] === "-" ? "" : match[1]);
  }

  for (const match of text.matchAll(/@(?:fires|event)\s+(?:\{[^}]*\}\s+)?([a-z][\w:-]*)/g)) {
    api.events.add(match[1]);
  }

  for (const match of text.matchAll(/@css(?:prop|property)\s+(?:\{[^}]*\}\s+)?(--[\w-]+)/g)) {
    api.cssProperties.add(match[1]);
  }

  for (const match of text.matchAll(/@attr(?:ibute)?\s+(?:\{[^}]*\}\s+)?([a-z][\w-]*)/gi)) {
    if (!api.attributes.has(match[1].toLowerCase())) {
      api.attributes.set(match[1].toLowerCase(), undefined);
    }
  }

  // Attributes that only style, like `:host([multiline-secondary])`. Many
  // are internal state, so they only count to find documented attributes.
  for (const match of text.matchAll(/:host\(\[([a-z][\w-]*)/g)) {
    api.styledAttributes.add(match[1]);
  }

  for (const match of text.matchAll(/<slot\b([^>]*)>/g)) {
    const name = match[1].match(/\bname=["']([^"'$]+)["']/);
    api.slots.add(name ? name[1] : "");
  }

  for (const match of text.matchAll(/--[a-z0-9][\w-]*/g)) {
    api.cssMentions.add(match[0]);
  }

  for (const match of text.matchAll(/<(wa-[a-z0-9-]+)[\s>]/g)) {
    if (!api.wraps.includes(match[1])) {
      api.wraps.push(match[1]);
    }
  }

  // Custom properties the styles read with a fallback are hooks for the
  // people using the component. Ones the component sets itself, and tokens
  // of the theme, are not.
  const declared = new Set([...text.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
  for (const match of text.matchAll(/var\(\s*(--[\w-]+)\s*,/g)) {
    if (!declared.has(match[1]) && !THEME_TOKENS.has(match[1]) && !match[1].startsWith("--wa-")) {
      api.cssReads.add(match[1]);
    }
  }

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText() === "fireEvent") {
      const [target, event] = node.arguments;
      if (target?.kind === ts.SyntaxKind.ThisKeyword && event) {
        if (ts.isStringLiteralLike(event)) {
          api.events.add(event.text);
        } else if (ts.isTemplateExpression(event)) {
          api.eventPatterns.push(templatePattern(event));
        }
      }
    }

    // The events a file declares for fireEvent, in `interface HASSDomEvents`.
    if (ts.isInterfaceDeclaration(node) && node.name.text === "HASSDomEvents") {
      for (const member of node.members) {
        if (member.name && ts.isStringLiteralLike(member.name)) {
          api.declaredEvents.add(member.name.text);
        }
      }
    }

    if (ts.isNewExpression(node) && ["CustomEvent", "Event"].includes(node.expression.getText())) {
      const [event] = node.arguments ?? [];
      if (event && ts.isStringLiteralLike(event)) {
        api.events.add(event.text);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

// `${this._activeSlider}-changed` matches any name that ends in "-changed".
function templatePattern(template: ts.TemplateExpression) {
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = [escape(template.head.text)];
  for (const span of template.templateSpans) {
    parts.push("[\\w-]+", escape(span.literal.text));
  }

  return new RegExp(`^${parts.join("")}$`);
}

// Follows `extends` to the base class: in the same file, in another file of
// the frontend, or through a mixin like `SubscribeMixin(LitElement)`. Stops
// at Lit, and at classes from packages, which it records as inherited.
function collectHeritage(parsed: ParsedFile, classNode: ClassNode, api: ElementApi, visited: Set<ClassNode>) {
  const heritage = classNode.heritageClauses?.find((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword);
  const expression = heritage?.types[0]?.expression;
  if (expression) {
    followBase(parsed, expression, api, visited);
  }
}

function followBase(parsed: ParsedFile, expression: ts.Expression, api: ElementApi, visited: Set<ClassNode>) {
  if (ts.isCallExpression(expression)) {
    // A mixin: everything in its file, and then what it is applied to.
    const mixin = expression.expression.getText();
    const imported = parsed.imports.get(mixin);
    const file = imported && resolveImport(parsed.file, imported.specifier);
    if (file) {
      collectFile(file, undefined, api, visited);
    }

    for (const argument of expression.arguments) {
      followBase(parsed, argument, api, visited);
    }
    return;
  }

  const name = expression.getText();
  if (LIT_BASES.has(name)) {
    return;
  }

  const local = parsed.classes.find((node) => node.name?.text === name);
  if (local) {
    collectClass(parsed, local, api, visited);
    return;
  }

  const imported = parsed.imports.get(name);
  const file = imported ? resolveImport(parsed.file, imported.specifier) : undefined;
  if (imported && file) {
    const base = parseFile(file);
    const target =
      imported.name === "default"
        ? base.classes.find((node) => hasModifier(node, ts.SyntaxKind.DefaultKeyword)) ?? base.classes[0]
        : base.classes.find((node) => node.name?.text === imported.name);
    collectFile(file, target, api, visited);
    return;
  }

  // Not imported and not in this file: the parameter of a mixin, like
  // `class extends superClass`. What it stands for is followed from the
  // class that applies the mixin.
  if (imported) {
    api.inherits.push(`${name} (${imported.specifier})`);
  }
}

function collectClass(parsed: ParsedFile, classNode: ClassNode, api: ElementApi, visited: Set<ClassNode>) {
  if (visited.has(classNode)) {
    return;
  }

  visited.add(classNode);
  collectMembers(classNode, api);
  collectHeritage(parsed, classNode, api, visited);
}

// Collects one class of a file, or all of them for a mixin file, and what
// the text of the file declares.
function collectFile(file: string, classNode: ClassNode | undefined, api: ElementApi, visited: Set<ClassNode>) {
  const parsed = parseFile(file);

  if (!api.files.includes(file)) {
    api.files.push(file);
    collectFromText(parsed, api);
  }

  for (const node of classNode ? [classNode] : parsed.classes) {
    collectClass(parsed, node, api, visited);
  }
}

const elementApis = new Map<string, ElementApi | undefined>();

function elementApi(tag: string) {
  if (elementApis.has(tag)) {
    return elementApis.get(tag);
  }

  const file = elementFiles.get(tag);
  let api: ElementApi | undefined;

  if (file) {
    const classNode = parseFile(file).tags.get(tag);
    api = emptyApi();
    collectFile(file, classNode, api, new Set());
  }

  elementApis.set(tag, api);
  return api;
}

// The custom elements a component renders: the tags in its templates, and
// the elements of the files it imports, like `import "./ha-svg-icon"` or
// `grid: () => import("./ha-form-grid")`. Custom properties inherit, and
// events bubble out of the shadow root, so a custom property or an event
// documented on a component can belong to one of these.
function renderedElements(api: ElementApi) {
  const tags = new Set<string>();

  for (const file of api.files) {
    const text = readSource(file) ?? "";

    for (const match of text.matchAll(/<([a-z][a-z0-9]*-[a-z0-9-]+)[\s>]/g)) {
      if (elementFiles.has(match[1])) {
        tags.add(match[1]);
      }
    }

    for (const match of text.matchAll(/import\s*\(?\s*"(\.[^"]+)"/g)) {
      const imported = resolveImport(file, match[1]);
      for (const [tag, elementFile] of elementFiles) {
        if (elementFile === imported) {
          tags.add(tag);
        }
      }
    }
  }

  return tags;
}

// Page side.

// The names an item of a list documents: the code before the first colon
// that is not inside backticks. "`name` and `value`: submitted with a form"
// documents `name` and `value`. For events, "`action` on `ha-list`" also
// says which element fires it.
function parseListItem(item: string) {
  let inCode = false;
  let lead = item;

  for (let index = 0; index < item.length; index++) {
    if (item[index] === "`") {
      inCode = !inCode;
    } else if (item[index] === ":" && !inCode) {
      lead = item.slice(0, index);
      break;
    }
  }

  let element: string | undefined;
  const on = lead.match(/\bon `<?([a-z][a-z0-9]*-[a-z0-9-]+)>?`/);
  if (on) {
    element = on[1];
    lead = lead.slice(0, on.index);
  }

  const names = [...lead.matchAll(/`([^`]+)`/g)]
    .map((match) => match[1].replace(/\(\)$/, ""))
    .filter((name) => /^(--)?[A-Za-z_][\w:-]*$/.test(name));

  if (names.length === 0 && /^Default\b/.test(lead.trim())) {
    names.push("");
  }

  return { names, element };
}

// Finds the kind of a heading or a lead-in paragraph, like "### Slots of
// ha-list-item", "Attributes:", or "These can only be set from code:".
const HEADING_KINDS: Record<string, Kind> = {
  Attributes: "attributes",
  Properties: "properties",
  Slots: "slots",
  Events: "events",
  Styling: "cssProperties",
  Methods: "methods",
};

function kindOf(text: string): Kind | undefined {
  const match = text.match(/^(Attributes|Properties|Slots|Events|Styling|Methods)\b/);
  if (match) {
    return HEADING_KINDS[match[1]];
  }

  if (/^These can only be set (as properties|from code)/.test(text)) {
    return "properties";
  }

  return undefined;
}

function emptyDocumented(): Documented {
  return {
    attributes: new Set(),
    properties: new Set(),
    slots: new Set(),
    events: new Set(),
    cssProperties: new Set(),
    methods: new Set(),
  };
}

async function parsePage(file: string) {
  const text = await readFile(path.join(PAGES_DIR, file), "utf8");
  const frontMatter = text.match(/^---\n([\s\S]*?)\n---/);
  const data: PageFrontMatter = frontMatter ? parseYaml(frontMatter[1]) : {};

  const body = text.slice(frontMatter ? frontMatter[0].length : 0);
  const start = body.search(/^## In code\s*$/m);
  const page: Page = {
    file,
    title: data.title ?? file,
    lastVerified: data.lastVerified ? new Date(data.lastVerified).toISOString().slice(0, 10) : null,
    sources: [],
    elements: new Map(),
  };

  if (start === -1) {
    return page;
  }

  const rest = body.slice(start).split("\n");
  const end = rest.findIndex((line, index) => index > 0 && /^## /.test(line));
  const section = rest.slice(0, end === -1 ? undefined : end);

  page.sources = [...new Set([...section.join("\n").matchAll(SOURCE_LINK)].map((match) => match[1]))];

  // The elements of the page: the ones its source files define, in order.
  const tags: string[] = [];
  for (const source of page.sources) {
    for (const [tag, file] of elementFiles) {
      if (file === source && !tags.includes(tag)) {
        tags.push(tag);
      }
    }
  }

  const named = section.join("\n").match(/The elements? (?:is|are) `<([a-z][a-z0-9]*-[a-z0-9-]+)>`/);
  const primary = named?.[1] ?? tags[0];

  let element = primary;
  let kind: Kind | undefined;
  let inFence = false;

  const documented = (tag: string) => {
    const existing = page.elements.get(tag);
    if (existing) {
      return existing;
    }

    const created = emptyDocumented();
    page.elements.set(tag, created);
    return created;
  };

  for (const line of section.slice(1)) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      continue;
    }

    const heading = line.match(/^###+\s+(.*)$/);
    if (heading) {
      const title = heading[1].trim();
      const of = title.match(/ of `?<?([a-z][a-z0-9]*-[a-z0-9-]+)>?`?$/);

      if (/^[a-z][a-z0-9]*-[a-z0-9-]+$/.test(title)) {
        // A subsection per element, like "### ha-control-switch".
        element = title;
        kind = undefined;
      } else {
        kind = kindOf(title);
        element = of ? of[1] : primary;
      }
      continue;
    }

    if (line.startsWith("- ")) {
      if (kind) {
        const item = parseListItem(line.slice(2));
        const target = documented(item.element ?? element);

        if (kind === "cssProperties") {
          // Styling items can name several properties anywhere in the item,
          // like "Off: `--a`, `--b`, and `--c`."
          for (const match of line.matchAll(/`(--[\w-]+)`/g)) {
            target.cssProperties.add(match[1]);
          }
        } else {
          for (const name of item.names) {
            target[kind].add(name);
          }
        }
      }
      continue;
    }

    // A lead-in paragraph: "Attributes:", or "`<ha-dropdown>`:" for one of
    // the elements of a page with several.
    const elementLead = line.match(/^`<([a-z][a-z0-9]*-[a-z0-9-]+)>`:\s*$/);
    if (elementLead) {
      element = elementLead[1];
      continue;
    }

    const leadKind = kindOf(line);
    if (leadKind) {
      kind = leadKind;
    }
  }

  return page;
}

// Comparing.

function findDocumented(kind: Kind, name: string, api: ElementApi) {
  switch (kind) {
    case "attributes":
      return api.attributes.has(name.toLowerCase()) || api.styledAttributes.has(name.toLowerCase());
    case "properties":
      return api.properties.has(name) || api.methods.has(name);
    case "slots":
      return api.slots.has(name);
    case "events":
      return (
        api.events.has(name) || api.declaredEvents.has(name) || api.eventPatterns.some((pattern) => pattern.test(name))
      );
    case "cssProperties":
      return api.cssMentions.has(name) || api.cssProperties.has(name);
    case "methods":
      return api.methods.has(name);
    default:
      return false;
  }
}

// The custom properties of a component that are worth documenting: the
// ones the frontend documents with @cssprop, and the ones it reads with a
// fallback that carry its name, like --control-slider-color for
// <ha-control-slider>. A read like var(--value, 0) or var(--ha-card-background)
// is an internal or a shared variable, not API of this component.
function cssApiOf(tag: string, api: ElementApi) {
  const stem = tag.replace(/^ha-/, "");
  const own = [...api.cssReads].filter((name) => name.includes(stem));

  return new Set([...api.cssProperties, ...own]);
}

function undocumentedOf(tag: string, api: ElementApi, documented: Documented): Record<Kind, string[]> {
  const lower = (set: Set<string>) => new Set([...set].map((name) => name.toLowerCase()));
  const documentedAttributes = lower(documented.attributes);
  const documentedProperties = lower(documented.properties);

  const attributes = [...api.attributes.entries()]
    .filter(([attribute, property]) => {
      const propertyDocumented =
        property &&
        (documentedAttributes.has(property.toLowerCase()) || documentedProperties.has(property.toLowerCase()));
      return !documentedAttributes.has(attribute) && !propertyDocumented;
    })
    .map(([attribute]) => attribute);

  const properties = [...api.properties.entries()]
    .filter(([, property]) => property.declared && property.attribute === null)
    .filter(([name]) => !documentedProperties.has(name.toLowerCase()) && !documentedAttributes.has(name.toLowerCase()))
    .map(([name]) => name);

  return {
    attributes: attributes.sort(),
    properties: properties.sort(),
    slots: [...api.slots].filter((slot) => !documented.slots.has(slot)).sort(),
    events: [...api.events].filter((event) => !documented.events.has(event)).sort(),
    cssProperties: [...cssApiOf(tag, api)].filter((name) => !documented.cssProperties.has(name)).sort(),
    methods: [],
  };
}

function checkPage(page: Page) {
  const result: PageResult = {
    page: `${PAGES_PATH}/${page.file}`,
    title: page.title,
    lastVerified: page.lastVerified,
    sources: page.sources,
    elements: [],
    notes: [],
    // What the page links or documents that is gone from the source: a
    // removed file or component. Drift like a missing name, so it fails too.
    gone: [],
  };

  if (page.sources.length === 0) {
    result.notes.push("No source link to the frontend under \"In code\", so nothing was checked.");
    return result;
  }

  // Every source file the page links, together. A custom property on the
  // page of a wrapper is often read by the component it wraps.
  const pageApi = emptyApi();
  for (const source of page.sources) {
    if (sourceFiles.has(source)) {
      collectFile(source, undefined, pageApi, new Set());
    } else {
      result.gone.push(`The source link \`${source}\` does not exist on this commit.`);
    }
  }

  for (const [tag, documented] of page.elements) {
    const api = elementApi(tag);
    if (!api) {
      result.gone.push(`\`<${tag}>\` is not a custom element on this commit.`);
      continue;
    }

    const entry: ElementResult = {
      element: tag,
      file: elementFiles.get(tag) ?? null,
      inherits: [...new Set(api.inherits)],
      wraps: api.wraps,
      missing: [],
      inherited: [],
      documented: Object.fromEntries(KINDS.map((kind) => [kind, [...documented[kind]]])),
      undocumented: undocumentedOf(tag, api, documented),
    };
    result.elements.push(entry);

    const children = [...renderedElements(api)].flatMap((child) => elementApi(child) ?? []);

    for (const kind of KINDS) {
      for (const name of documented[kind]) {
        if (findDocumented(kind, name, api)) {
          continue;
        }

        // Custom properties inherit, and events bubble: they can belong to a
        // component this one renders. A custom property can also belong to
        // another file the page links, like the bottom sheet of the adaptive
        // dialog.
        if (kind === "cssProperties" || kind === "events") {
          if (children.some((child) => findDocumented(kind, name, child))) {
            continue;
          }

          if (kind === "cssProperties" && findDocumented(kind, name, pageApi)) {
            continue;
          }
        }

        // Web Awesome events, like wa-select, bubble out of a Web Awesome
        // component this one renders.
        const fromChild =
          kind === "events" && name.startsWith("wa-") && children.some((child) => child.inherits.length > 0);

        const finding: Finding = { kind, name: name || "(default)" };

        // Documented as an attribute, but the source has it as a property
        // only (`attribute: false`): setting it in HTML does nothing.
        const property =
          kind === "attributes" && [...api.properties].find(([key]) => key.toLowerCase() === name.toLowerCase());
        if (property) {
          if (property[1].declared && property[1].attribute === null) {
            entry.missing.push({ ...finding, note: "property only, not an attribute" });
          }
          continue;
        }

        if (entry.inherits.length > 0 || entry.wraps.length > 0 || fromChild) {
          entry.inherited.push(finding);
        } else {
          entry.missing.push(finding);
        }
      }
    }
  }

  return result;
}

// Reporting.

function codeList(names: string[]) {
  return names.map((name) => `\`${name || "(default)"}\``).join(", ");
}

function findingName(finding: Finding) {
  return finding.note ? `\`${finding.name}\` (${finding.note})` : `\`${finding.name}\``;
}

function findingsByKind(findings: Finding[]) {
  const byKind = new Map<Kind, string[]>();
  for (const finding of findings) {
    byKind.set(finding.kind, [...(byKind.get(finding.kind) ?? []), findingName(finding)]);
  }

  return [...byKind].map(([kind, names]) => `${KIND_LABELS[kind]}: ${names.join(", ")}`).join("; ");
}

function markdownReport(results: PageResult[]) {
  const lines: string[] = [];
  const missingCount = results.reduce(
    (sum, result) => sum + result.elements.reduce((count, element) => count + element.missing.length, 0),
    0,
  );
  const goneCount = results.reduce((sum, result) => sum + result.gone.length, 0);

  lines.push("# Component docs drift", "");
  const commitUrl = `https://github.com/home-assistant/frontend/commit/${commit}`;
  const frontendLink = `[home-assistant/frontend@${commit.slice(0, 10)}](${commitUrl})`;
  lines.push(`Checked ${results.length} component pages against ${frontendLink} (\`${options.ref}\`).`, "");

  lines.push("## Documented, but not in the source", "");
  if (missingCount === 0) {
    lines.push("Nothing. Every name the pages document is in the frontend source, or may come from a package.", "");
  } else {
    lines.push("Probably renamed or removed in the frontend. Check the source, and fix the page.", "");
    lines.push("| Page | Element | Kind | Name |", "| --- | --- | --- | --- |");
    for (const result of results) {
      for (const element of result.elements) {
        for (const finding of element.missing) {
          const page = path.basename(result.page);
          const kind = KIND_LABELS[finding.kind];
          lines.push(`| \`${page}\` | \`${element.element}\` | ${kind} | ${findingName(finding)} |`);
        }
      }
    }
    lines.push("");
  }

  lines.push("## Linked or documented, but gone from the source", "");
  if (goneCount === 0) {
    lines.push("Nothing. Every source link and element the pages name still exists.", "");
  } else {
    lines.push("Probably moved or removed in the frontend. Check the source, and fix the page.", "");
    for (const result of results) {
      for (const gone of result.gone) {
        lines.push(`- \`${path.basename(result.page)}\`: ${gone}`);
      }
    }
    lines.push("");
  }

  lines.push("## Per page", "");
  for (const result of results) {
    lines.push(`### ${result.title}`, "");
    lines.push(`Page: \`${result.page}\`. Last verified: ${result.lastVerified ?? "never"}.`, "");

    for (const note of [...result.gone, ...result.notes]) {
      lines.push(`- ${note}`);
    }

    for (const element of result.elements) {
      const bases = [
        ...element.inherits.map((base) => `extends \`${base}\``),
        ...element.wraps.map((wrapped) => `wraps \`<${wrapped}>\``),
      ];
      const basesText = bases.length > 0 ? `, ${bases.join(", ")}` : "";
      lines.push(`- \`<${element.element}>\` in \`${element.file ?? "unknown"}\`${basesText}`);

      if (element.missing.length > 0) {
        lines.push(`  - Documented, but not in the source: ${findingsByKind(element.missing)}`);
      }

      if (element.inherited.length > 0) {
        lines.push(`  - Not in the frontend code, may come from the package: ${findingsByKind(element.inherited)}`);
      }

      const undocumented = KINDS.filter((kind) => element.undocumented[kind].length > 0)
        .map((kind) => `${KIND_LABELS[kind]}: ${codeList(element.undocumented[kind])}`)
        .join("; ");
      if (undocumented) {
        lines.push(`  - In the source, but not documented: ${undocumented}`);
      }

      if (element.missing.length === 0 && element.inherited.length === 0 && !undocumented) {
        lines.push("  - Matches the source.");
      }
    }

    lines.push("");
  }

  return { markdown: lines.join("\n"), missingCount, goneCount };
}

const pageFiles = (await readdir(PAGES_DIR))
  .filter((file) => /\.mdx?$/.test(file) && file !== "index.md")
  .sort();
const results: PageResult[] = [];
for (const file of pageFiles) {
  results.push(checkPage(await parsePage(file)));
}

const { markdown, missingCount, goneCount } = markdownReport(results);
console.log(markdown);

if (options.json) {
  const report = {
    frontend: { commit, ref: options.ref },
    date: new Date().toISOString(),
    missingCount,
    goneCount,
    pages: results,
  };
  await writeFile(path.resolve(options.json), `${JSON.stringify(report, null, 2)}\n`);
}

if (options.strict && missingCount + goneCount > 0) {
  console.error(
    `${missingCount} documented names are not in the frontend source, ` +
      `and ${goneCount} source links or elements are gone from it.`,
  );
  process.exitCode = 1;
}

// Generates the theme variables reference,
// src/content/docs/marketplace/reference/theme-variables.md, from the theme
// files and components of the Home Assistant frontend.
//
// The page has three generated sections:
//
// - The classic variables, from colorStyles and darkColorStyles in
//   src/resources/theme/color/color.globals.ts. The --mdc-* ones are left
//   out: they pass the classic variables on to the old Material components.
// - The design tokens the Foundations pages of the Design area do not
//   render already: everything in the token files except the spacing,
//   radius, and font size scales. The color palettes are not in these files.
// - The component variables listed in scripts/theme-variables/components.yaml,
//   with the default each component falls back to. Which component variables
//   are meant for themes is kept by hand, in that file. An entry whose file no
//   longer reads the variable is left off the page, and listed in the report.
//
// The text around the sections is scripts/theme-variables/page.md. In it,
// {{generated}} becomes the note that the tables are generated, and
// {{classic}}, {{tokens}}, and {{components}} the sections.
//
// Usage:
//   pnpm theme-variables                        # origin/dev of ../frontend
//   pnpm theme-variables --ref some-branch      # another branch, tag, or commit
//   pnpm theme-variables --from /path/frontend  # another checkout
//
// It only reads the frontend with Git, like check-component-docs.ts. Run
// `git fetch` in the frontend checkout first, to generate from the latest.
//
// A Markdown report goes to stdout: the counts per section, the variables
// added and removed since the page on disk, and the component variables that
// are no longer in the frontend. That last list does not fail the run, so the
// weekly pull request still opens and shows it. So does the list of entries
// the theme files now set themselves.

import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parse as parseYaml } from "yaml";

const TEMPLATE = fileURLToPath(new URL("./theme-variables/page.md", import.meta.url));
const COMPONENTS = fileURLToPath(new URL("./theme-variables/components.yaml", import.meta.url));
const OUTPUT = fileURLToPath(
  new URL("../src/content/docs/marketplace/reference/theme-variables.md", import.meta.url),
);

const THEME_DIR = "src/resources/theme";
const CLASSIC_FILE = `${THEME_DIR}/color/color.globals.ts`;

// The token files, as sync-tokens.ts reads them, without color/core.globals.ts:
// that only has the palettes, which the color page of Foundations shows.
const TOKEN_SOURCES = [
  { file: "core.globals.ts", title: "Borders, radii, and motion", light: "coreStyles" },
  { file: "typography.globals.ts", title: "Typography", light: "typographyStyles" },
  { file: "semantic.globals.ts", title: "Shadows", light: "semanticStyles", dark: "darkSemanticStyles" },
  {
    file: "color/semantic.globals.ts",
    title: "Semantic colors",
    light: "semanticColorStyles",
    dark: "darkSemanticColorStyles",
  },
];

// Shown on the Foundations pages by TokenScale, from src/styles/tokens.css.
const FOUNDATIONS = /^--ha-(space-|border-radius-|font-size-(?!scale$))/;

// The section comments of color.globals.ts do not group the variables well,
// so they are grouped by name. The first match wins.
const CLASSIC_GROUPS: [title: string, match: RegExp][] = [
  [
    "Main colors",
    /^--(primary|dark-primary|darker-primary|light-primary|accent|divider|outline|outline-hover|shadow|scrollbar-thumb|disabled|error|warning|success|info)-color$/,
  ],
  ["Text", /^--(primary-text|secondary-text|text-primary|text-light-primary|disabled-text)-color$/],
  ["Backgrounds", /^--(primary|secondary|card|clear)-background-color$/],
  ["RGB variants", /^--rgb-/],
  ["Sidebar", /^--sidebar-/],
  ["Header", /^--app-/],
  ["Entity states", /^--state-/],
  ["Energy", /^--energy-/],
  ["History", /^--history-/],
  ["Inputs", /^--input-/],
  ["Sliders", /^--slider-/],
  ["Tables", /^--(data-)?table-/],
  ["Label badges", /^--label-badge-/],
  ["Markdown", /^--markdown-/],
  ["Buttons and chips", /^--(ha-button|ha-assist-chip|chip)-/],
  ["Chart colors", /^--color-\d+$/],
  ["Code editor syntax", /^--codemirror-/],
  ["Named colors", /^--[a-z-]+-color$/],
];

interface Row {
  name: string;
  light: string | undefined;
  dark: string | undefined;
}

interface ComponentEntry {
  name: string;
  file: string;
  description: string;
}

interface ComponentGroup {
  group: string;
  variables: ComponentEntry[];
}

const { values: options } = parseArgs({
  options: {
    from: { type: "string", default: "../frontend" },
    ref: { type: "string", default: "origin/dev" },
  },
});

const checkout = path.resolve(options.from);

function git(...args: string[]) {
  return execFileSync("git", args, { cwd: checkout, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

const commit = git("rev-parse", `${options.ref}^{commit}`).trim();
const sourceFiles = new Set(git("ls-tree", "-r", "--name-only", commit, "src").split("\n").filter(Boolean));

function readSource(file: string) {
  return sourceFiles.has(file) ? git("show", `${commit}:${file}`) : undefined;
}

function requireSource(file: string) {
  const source = readSource(file);
  if (source === undefined) {
    throw new Error(`${file} does not exist on ${commit}`);
  }
  return source;
}

// Reading the theme files

// The CSS of `export const <name> = css\`...\``, like extractCss() in
// sync-tokens.ts.
function extractCss(source: string, exportName: string, file: string) {
  const match = source.match(new RegExp(`export const ${exportName} = css\`([\\s\\S]*?)\`;`));
  if (!match) {
    throw new Error(`Could not find ${exportName} in ${file}`);
  }

  if (match[1].includes("${")) {
    throw new Error(`${exportName} in ${file} contains an interpolation`);
  }

  return match[1];
}

// The content of the first `html { }` block, so a later block, like the one
// for reduced motion in core.globals.ts, is not mixed in.
function htmlBlock(css: string, exportName: string) {
  const start = css.search(/html\s*\{/);
  if (start === -1) {
    throw new Error(`${exportName} has no html { } block`);
  }

  const open = css.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < css.length; index++) {
    if (css[index] === "{") {
      depth++;
    } else if (css[index] === "}" && --depth === 0) {
      return css.slice(open + 1, index);
    }
  }

  throw new Error(`The html { } block of ${exportName} is not closed`);
}

const tidy = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();

// The custom properties of a block of CSS, in order. Split on semicolons
// outside brackets, so a value with nested var() stays whole.
function declarations(block: string) {
  const css = block.replace(/\/\*[\s\S]*?\*\//g, "");
  const found = new Map<string, string>();
  let depth = 0;
  let start = 0;

  const take = (end: number) => {
    const match = css.slice(start, end).match(/^\s*(--[\w-]+)\s*:([\s\S]*)$/);
    if (match) {
      found.set(match[1], tidy(match[2]));
    }
    start = end + 1;
  };

  for (let index = 0; index < css.length; index++) {
    if (css[index] === "(") {
      depth++;
    } else if (css[index] === ")") {
      depth--;
    } else if (css[index] === ";" && depth === 0) {
      take(index);
    }
  }
  take(css.length);

  return found;
}

function hexToRgb(value: string | undefined) {
  const hex = value?.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
  if (!hex) {
    return undefined;
  }
  const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join("") : hex;
  return [0, 2, 4].map((index) => parseInt(full.slice(index, index + 2), 16)).join(", ");
}

function readRows(file: string, lightExport: string, darkExport: string | undefined) {
  const source = requireSource(file);
  const light = declarations(htmlBlock(extractCss(source, lightExport, file), lightExport));
  const dark = darkExport
    ? declarations(htmlBlock(extractCss(source, darkExport, file), darkExport))
    : new Map<string, string>();

  // In dark mode, processTheme() in src/common/dom/apply_themes_on_element.ts
  // sets rgb-<name> from every hex <name> the dark set has no rgb- value for.
  for (const name of light.keys()) {
    const base = name.replace(/^--rgb-/, "--");
    const rgb = base === name || dark.has(name) ? undefined : hexToRgb(dark.get(base));
    if (rgb) {
      dark.set(name, rgb);
    }
  }

  return [...new Set([...light.keys(), ...dark.keys()])].map(
    (name): Row => ({ name, light: light.get(name), dark: dark.get(name) }),
  );
}

// The fallback of the first `var(<name>, <fallback>)` in a file, read to the
// bracket that closes the var(), so a nested var() stays whole.
function firstFallback(source: string, name: string) {
  const pattern = new RegExp(`var\\(\\s*${name.replace(/[-]/g, "\\-")}\\s*,`, "g");
  const match = pattern.exec(source);
  if (!match) {
    return undefined;
  }

  let depth = 1;
  for (let index = pattern.lastIndex; index < source.length; index++) {
    if (source[index] === "(") {
      depth++;
    } else if (source[index] === ")" && --depth === 0) {
      return tidy(source.slice(pattern.lastIndex, index));
    }
  }

  return undefined;
}

// Rendering

const cell = (value: string) => value.replaceAll("|", "\\|");
const code = (value: string) => `\`${cell(value)}\``;
const themeName = (name: string) => code(name.replace(/^--/, ""));

// Files without a dark set get one column of values.
function rowsTable(rows: Row[], withDark: boolean) {
  const lines = withDark
    ? ["| Variable | Light | Dark |", "| --- | --- | --- |"]
    : ["| Variable | Default |", "| --- | --- |"];
  for (const row of rows) {
    const light = row.light === undefined ? "Not set" : code(row.light);
    if (!withDark) {
      lines.push(`| ${themeName(row.name)} | ${light} |`);
      continue;
    }
    const dark = row.dark === undefined || row.dark === row.light ? "Same" : code(row.dark);
    lines.push(`| ${themeName(row.name)} | ${light} | ${dark} |`);
  }
  return lines.join("\n");
}

function renderClassic(rows: Row[]) {
  const groups = new Map<string, Row[]>(CLASSIC_GROUPS.map(([title]) => [title, []]));
  groups.set("Other", []);

  for (const row of rows) {
    const title = CLASSIC_GROUPS.find(([, match]) => match.test(row.name))?.[0] ?? "Other";
    groups.get(title)?.push(row);
  }

  return [...groups]
    .filter(([, groupRows]) => groupRows.length > 0)
    .map(([title, groupRows]) => `### ${title}\n\n${rowsTable(groupRows, true)}`)
    .join("\n\n");
}

const sourceLink = (file: string) =>
  `[\`${file}\`](https://github.com/home-assistant/frontend/blob/dev/${file})`;

// Reading everything first, so a failure leaves the page as it is.

const classicRows = readRows(CLASSIC_FILE, "colorStyles", "darkColorStyles").filter(
  (row) => !row.name.startsWith("--mdc-"),
);

const tokenSections = TOKEN_SOURCES.map((source) => ({
  ...source,
  rows: readRows(`${THEME_DIR}/${source.file}`, source.light, source.dark).filter(
    (row) => !FOUNDATIONS.test(row.name),
  ),
}));

// A component variable the theme files set as well never falls back to the
// default of the component, so the default in components.yaml would be wrong.
const themeDefined = new Set([
  ...classicRows.map((row) => row.name),
  ...tokenSections.flatMap((section) => section.rows.map((row) => row.name)),
]);

const componentGroups: ComponentGroup[] = parseYaml(await readFile(COMPONENTS, "utf8"));
const gone: ComponentEntry[] = [];
const duplicated: ComponentEntry[] = [];
const componentSections = componentGroups.map(({ group, variables }) => {
  const lines = ["| Variable | Default | What it changes |", "| --- | --- | --- |"];
  for (const entry of variables) {
    if (themeDefined.has(entry.name)) {
      duplicated.push(entry);
      continue;
    }
    const source = readSource(entry.file);
    const fallback = source === undefined ? undefined : firstFallback(source, entry.name);
    if (fallback === undefined) {
      gone.push(entry);
      continue;
    }
    lines.push(`| ${themeName(entry.name)} | ${code(fallback)} | ${cell(entry.description)} |`);
  }
  return { group, count: lines.length - 2, table: lines.join("\n") };
});

const commitLink = `[\`${commit.slice(0, 10)}\`](https://github.com/home-assistant/frontend/commit/${commit})`;
const placeholders: Record<string, string> = {
  generated: `The tables on this page are generated from the frontend source, at ${commitLink} of the \`dev\` branch. Variables can be renamed or removed in any release, so test your theme with every beta.`,
  classic: renderClassic(classicRows),
  tokens: tokenSections
    .filter((section) => section.rows.length > 0)
    .map(
      (section) =>
        `### ${section.title}\n\nFrom ${sourceLink(`${THEME_DIR}/${section.file}`)}.\n\n${rowsTable(section.rows, section.dark !== undefined)}`,
    )
    .join("\n\n"),
  components: componentSections
    .filter((section) => section.count > 0)
    .map((section) => `### ${section.group}\n\n${section.table}`)
    .join("\n\n"),
};

const template = await readFile(TEMPLATE, "utf8");
const [, frontMatter, body] = /^(---\n[\s\S]*?\n---\n)([\s\S]*)$/.exec(template) ?? [];
if (frontMatter === undefined) {
  throw new Error(`${TEMPLATE}: no front matter`);
}

const filled = body.replace(/\{\{([a-z-]+)\}\}/g, (placeholder, name: string) => {
  if (!(name in placeholders)) {
    throw new Error(`${TEMPLATE}: unknown placeholder ${placeholder}`);
  }
  return placeholders[name];
});

const page = `${frontMatter}\n<!-- Generated by \`pnpm theme-variables\` from scripts/theme-variables/. Edit those files, not this one. -->\n\n${filled.trim()}\n`;

// The report

// The variables in the first column of the tables of a page.
const namesOf = (markdown: string) =>
  new Set([...markdown.matchAll(/^\| `([\w-]+)` \|/gm)].map((match) => match[1]));

const previous = await readFile(OUTPUT, "utf8").catch(() => "");
const before = namesOf(previous);
const after = namesOf(page);
const added = [...after].filter((name) => !before.has(name)).sort();
const removed = [...before].filter((name) => !after.has(name)).sort();

await writeFile(OUTPUT, page);

const list = (names: string[]) => names.map((name) => `- \`${name}\``).join("\n");
const tokenCount = tokenSections.reduce((sum, section) => sum + section.rows.length, 0);
const componentCount = componentSections.reduce((sum, section) => sum + section.count, 0);

const report = [
  "# Theme variables",
  "",
  `Generated from [home-assistant/frontend@${commit.slice(0, 10)}](https://github.com/home-assistant/frontend/commit/${commit}) (\`${options.ref}\`): ${classicRows.length} classic variables, ${tokenCount} design tokens, and ${componentCount} component variables.`,
  "",
];

if (previous) {
  report.push("## Changes since the last update", "");
  if (added.length === 0 && removed.length === 0) {
    report.push("No variables were added or removed.", "");
  }
  if (added.length > 0) {
    report.push("Added:", "", list(added), "");
  }
  if (removed.length > 0) {
    report.push("Removed. Themes that set these need an update:", "", list(removed), "");
  }
}

report.push("## No longer in the frontend", "");
if (gone.length === 0) {
  report.push("Nothing. Every variable in `scripts/theme-variables/components.yaml` is still read by its file.");
} else {
  report.push(
    "These entries of `scripts/theme-variables/components.yaml` are not read by their file any more, so they are left off the page. Find where the variable went, and update or remove the entry.",
    "",
    ...gone.map((entry) => `- \`${entry.name}\` in \`${entry.file}\``),
  );
}

if (duplicated.length > 0) {
  report.push(
    "",
    "## Set by the theme files too",
    "",
    "The theme files now set these entries of `scripts/theme-variables/components.yaml`, so they are listed with the classic variables or the design tokens instead. Remove them from that file.",
    "",
    ...duplicated.map((entry) => `- \`${entry.name}\``),
  );
}

console.log(report.join("\n"));

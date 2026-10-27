// Generates the Bashio function reference in src/content/docs/apps/bashio/
// from the source of Bashio itself.
//
// Every public function in Bashio's lib/*.sh has a docblock: a description
// and its arguments, between two ruler lines. This script reads those, and
// writes one page per group of modules. Which modules go on which page, and
// the hand-written text above the lists, lives in scripts/bashio/<page>.md:
// edit those, not the generated pages. The overview page,
// src/content/docs/apps/bashio/index.md, is not generated.
//
// In the templates, {{generated}} becomes the note that the lists are
// generated, and {{may-call}} a link to what an app may call.
//
// Usage:
//   pnpm bashio                         # the main branch, from GitHub
//   pnpm bashio --ref some-tag          # another branch, tag, or commit
//   pnpm bashio --from ../bashio        # a local checkout

import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parse as parseYaml } from "yaml";

const REPOSITORY = "hassio-addons/bashio";
const TEMPLATES = fileURLToPath(new URL("./bashio/", import.meta.url));
const OUTPUT = fileURLToPath(new URL("../src/content/docs/apps/bashio/", import.meta.url));

const { values: options } = parseArgs({
  options: {
    ref: { type: "string", default: "main" },
    from: { type: "string" },
  },
});

// Source links point at the same ref the lists come from.
const SOURCE = `https://github.com/${REPOSITORY}/blob/${options.ref}/lib`;

const PLACEHOLDERS: Record<string, string> = {
  generated:
    "The function lists on this page are generated from the docblocks in the" +
    " source of Bashio. The descriptions are the ones in the" +
    ' source, so some still say "addon" where this site says app.',
  "may-call": "[what your app may call](/apps/supervisor-api/#what-your-app-may-call)",
};

// Docblocks that carry an example after their description. The example is
// shown as a code block below the list, instead of inside a list item.
const EXAMPLES: Record<string, string> = {
  "bashio::string.substring": "stringZ=",
  "bashio::try": "Simple example:",
};

// Names that are not part of the public API.
const PRIVATE = /(\.|::)__/;

interface BashioFunction {
  module: string;
  name: string;
  description: string[];
  args: string[];
}

interface Template {
  file: string;
  data: {
    title: string;
    description: string;
    sidebarLabel: string;
    order: number;
    modules: { module: string; heading: string; intro: string }[];
  };
  body: string;
}

// Reading the source

const DEFINITION = /^(?:function\s+)?(bashio::[A-Za-z0-9_.:]*)\s*(?:\(\))?\s*\{/;
const RULER = /^#\s*-{10,}\s*$/;

// The comment lines of the docblock right above line `index`, or null when
// the function has none.
function docblockAbove(lines: string[], index: number) {
  const end = index - 1;
  if (end < 0 || !RULER.test(lines[end])) {
    return null;
  }

  let start = end - 1;
  while (start >= 0 && !RULER.test(lines[start])) {
    if (!lines[start].startsWith("#")) {
      return null;
    }
    start--;
  }

  if (start < 0) {
    return null;
  }

  return lines.slice(start + 1, end).map((line) => line.replace(/^# ?/, ""));
}

// Splits a docblock into its description lines and its arguments.
function splitDocblock(comment: string[]) {
  const description: string[] = [];
  const args: string[] = [];
  let inArguments = false;

  for (const line of comment) {
    const stripped = line.trim();

    if (stripped.startsWith("Arguments:")) {
      inArguments = true;
      const rest = stripped.slice("Arguments:".length).trim();
      if (rest) {
        args.push(rest);
      }
      continue;
    }

    if (inArguments) {
      if (!stripped) {
        inArguments = false;
        description.push("");
      } else if (/^\$[0-9*@]/.test(stripped)) {
        args.push(stripped);
      } else if (args.length > 0) {
        args[args.length - 1] += ` ${stripped}`;
      }
      continue;
    }

    description.push(line.trimEnd());
  }

  return { description, args };
}

async function readFunctions(lib: string) {
  const functions: BashioFunction[] = [];
  const files = (await readdir(lib)).filter((file) => file.endsWith(".sh")).sort();

  for (const file of files) {
    const lines = (await readFile(path.join(lib, file), "utf8")).split(/\r?\n/);

    lines.forEach((line, index) => {
      const match = DEFINITION.exec(line);
      if (!match) {
        return;
      }

      const { description, args } = splitDocblock(docblockAbove(lines, index) ?? []);
      functions.push({ module: file.replace(/\.sh$/, ""), name: match[1], description, args });
    });
  }

  return functions.filter((fn) => !PRIVATE.test(fn.name));
}

// The lib/ folder of Bashio: from a local checkout, or downloaded from
// GitHub into a temporary folder.
async function libFolder() {
  if (options.from) {
    return { lib: path.join(path.resolve(options.from), "lib"), cleanup: async () => {} };
  }

  const url = `https://codeload.github.com/${REPOSITORY}/tar.gz/${encodeURIComponent(options.ref)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Downloading ${url} failed: ${response.status} ${response.statusText}`);
  }

  const dir = await mkdtemp(path.join(tmpdir(), "contributors-bashio-"));
  execFileSync("tar", ["-xz", "-C", dir, "--strip-components=1"], {
    input: Buffer.from(await response.arrayBuffer()),
  });

  return { lib: path.join(dir, "lib"), cleanup: () => rm(dir, { recursive: true, force: true }) };
}

// Rendering the pages

// Makes docblock text safe for Markdown, without changing its meaning.
function clean(text: string) {
  return text
    .replace(/\be\.g\.,?/g, "for example")
    .replace(/\beg\./g, "for example")
    .replaceAll("*", "\\*")
    .replaceAll("<", "&lt;")
    .replace(/(bashio::[A-Za-z0-9_.]+(?:\(\))?)/g, "`$1`")
    .replace(/\s+/g, " ")
    .trim();
}

// The description lines and the example lines of a docblock.
function splitExample(fn: BashioFunction) {
  const marker = EXAMPLES[fn.name];
  const index = marker ? fn.description.findIndex((line) => line.trim().startsWith(marker)) : -1;
  if (index === -1) {
    return { description: fn.description, example: [] };
  }

  // A marker like "Simple example:" is a label, not part of the example.
  const example = fn.description.slice(marker.endsWith(":") ? index + 1 : index);
  return { description: fn.description.slice(0, index), example: example.map((line) => line.trim()) };
}

// One function as a list item, with its arguments below it.
function renderFunction(fn: BashioFunction) {
  const { description } = splitExample(fn);
  const out = [`- \`${fn.name}\`: ${clean(description.join(" "))}`];

  for (const argument of fn.args) {
    const match = /^(\$[0-9*@])\s*(.*)$/.exec(argument);
    if (!match) {
      throw new Error(`${fn.name}: the argument "${argument}" does not start with $1, $* or $@.`);
    }
    const [, name, rest] = match;
    out.push(`  - \`${name}\`: ${clean(rest)}`);
  }

  return out;
}

function renderExamples(functions: BashioFunction[]) {
  const out: string[] = [];

  for (const fn of functions) {
    const { example } = splitExample(fn);
    if (example.length === 0) {
      continue;
    }

    out.push(
      "",
      `The docblock of \`${fn.name}\` has this example:`,
      "",
      fn.name === "bashio::try" ? "```console" : "```bash",
      ...example.filter(Boolean),
      "```",
    );
  }

  return out;
}

// Quotes a front matter value, so a colon in it is not a problem.
const quote = (value: string) => `"${value.replaceAll('"', '\\"')}"`;

function renderPage(template: Template, functions: BashioFunction[]) {
  const { data, body } = template;
  const intro = body.replace(/\{\{([a-z-]+)\}\}/g, (placeholder, name: string) => {
    if (!(name in PLACEHOLDERS)) {
      throw new Error(`${template.file}: unknown placeholder ${placeholder}`);
    }
    return PLACEHOLDERS[name];
  });

  const out = [
    "---",
    `title: ${quote(data.title)}`,
    `description: ${quote(data.description)}`,
    `sidebarLabel: ${quote(data.sidebarLabel)}`,
    `order: ${data.order}`,
    "---",
    "",
    `<!-- Generated by \`pnpm bashio\` from scripts/bashio/${template.file}. Edit that file, not this one. -->`,
    "",
    intro.trim(),
    "",
  ];

  for (const { module, heading, intro: moduleIntro } of data.modules) {
    const moduleFunctions = functions.filter((fn) => fn.module === module);
    const source = `[\`lib/${module}.sh\`](${SOURCE}/${module}.sh)`;

    out.push(`## ${heading}`, "", `${moduleIntro.trim()} Source: ${source}.`, "");
    for (const fn of moduleFunctions) {
      out.push(...renderFunction(fn));
    }
    out.push(...renderExamples(moduleFunctions), "");
  }

  return `${out.join("\n").trimEnd()}\n`;
}

async function readTemplates() {
  const templates: Template[] = [];

  for (const file of (await readdir(TEMPLATES)).filter((name) => name.endsWith(".md")).sort()) {
    const source = await readFile(path.join(TEMPLATES, file), "utf8");
    const [, frontMatter, body] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(source) ?? [];
    if (frontMatter === undefined) {
      throw new Error(`${file}: no front matter`);
    }
    templates.push({ file, data: parseYaml(frontMatter), body });
  }

  return templates;
}

const { lib, cleanup } = await libFolder();

try {
  const functions = await readFunctions(lib);
  const templates = await readTemplates();

  // Everything is checked before a single page is written, so a wrong --from
  // or a half-downloaded source leaves the reference as it is.
  if (functions.length === 0) {
    throw new Error(`No public functions found in ${lib}. Is that the lib/ folder of Bashio?`);
  }

  // Every module must be on a page, or new functions would silently be left
  // out of the reference.
  const covered = new Set(templates.flatMap((template) => template.data.modules.map((entry) => entry.module)));
  const sourceModules = new Set(functions.map((fn) => fn.module));
  const missing = [...sourceModules].filter((module) => !covered.has(module));
  if (missing.length > 0) {
    throw new Error(
      `Modules on no page: ${missing.join(", ")}. Add them to a template in scripts/bashio/.`,
    );
  }

  // And every module on a page must still have functions in the source, or
  // its list would silently turn empty.
  const gone = [...covered].filter((module) => !sourceModules.has(module));
  if (gone.length > 0) {
    throw new Error(
      `Modules with no public functions in the source: ${gone.join(", ")}. ` +
        "Remove them from their template in scripts/bashio/, or check the source.",
    );
  }

  const pages = templates.map((template) => [template.file, renderPage(template, functions)] as const);
  for (const [file, content] of pages) {
    await writeFile(path.join(OUTPUT, file), content);
  }

  console.log(
    `Wrote ${templates.length} pages with ${functions.length} public functions of Bashio (${options.from ?? options.ref}).`,
  );
} finally {
  await cleanup();
}

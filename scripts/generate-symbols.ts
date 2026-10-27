// Generates the indexes of code symbols the docs link to, and measures how
// much of the docs they cover. See "Code symbols" in README.md, and
// src/lib/code-symbols.mjs for the rules of what links.
//
// - src/data/symbols/core.json, from a core checkout: scripts/symbols/core.ts
//   (and extract.py, which needs the Python version core needs). With the
//   integration hooks of scripts/symbols/hooks.json.
// - src/data/symbols/frontend.json, from a frontend checkout:
//   scripts/symbols/frontend.ts, with the TypeScript compiler.
// - src/data/symbols/coverage.json: per area, how many inline code spans
//   look like a symbol and how many link, and the ones that don't
//   (scripts/symbols/coverage.ts).
//
// Each index keeps only what the docs mention, so it stays small enough to
// review. The report compares with the files it replaces: mentions that
// linked before and no longer do (a symbol was renamed, moved, or removed,
// so the page probably needs an update), and new unresolved mentions.
//
// Usage:
//   pnpm symbols                                 # both, origin/dev of ../core and ../frontend
//   pnpm symbols --ref HEAD                      # both, another branch, tag, or commit
//   pnpm symbols core                            # only core
//   pnpm symbols frontend --from /path/frontend  # only the frontend, another checkout
//
// Run `git fetch` in the checkouts first, to read the latest. The report
// goes to stdout, as Markdown.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { INDEXES, createResolver, readIndex } from "../src/lib/code-symbols.mjs";
import { generateCore } from "./symbols/core.ts";
import { type Coverage, type IndexName, coverageReport, isIndexName, measureCoverage } from "./symbols/coverage.ts";
import { generateFrontend } from "./symbols/frontend.ts";
import { ROOT, docsMentions } from "./symbols/mentions.ts";
import type { GenerateOptions, Generated, SymbolIndex } from "./symbols/types.ts";

const COVERAGE_FILE = path.join(ROOT, "src/data/symbols/coverage.json");

interface Generator {
  generate: (options: GenerateOptions) => Generated;
  checkout: string;
}

const GENERATORS: Record<IndexName, Generator> = {
  core: { generate: generateCore, checkout: "../core" },
  frontend: { generate: generateFrontend, checkout: "../frontend" },
};
const NAMES = Object.keys(GENERATORS).filter(isIndexName);

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    from: { type: "string" },
    ref: { type: "string", default: "origin/dev" },
  },
});

const unknown = positionals.filter((name) => !isIndexName(name));
if (unknown.length) {
  console.error(`Unknown index: ${unknown.join(", ")}. Use ${NAMES.join(" or ")}.`);
  process.exit(1);
}

const selected = positionals.length ? positionals.filter(isIndexName) : NAMES;
if (options.from && selected.length !== 1) {
  console.error("--from is the checkout of one repository: name the index too, like `pnpm symbols core --from ../core`.");
  process.exit(1);
}

const mentions = docsMentions();
const report = ["# Code symbols"];
const indexes: Partial<Record<IndexName, SymbolIndex>> = {};

for (const name of NAMES) {
  const previous: SymbolIndex | undefined = readIndex(name);

  if (!selected.includes(name)) {
    indexes[name] = previous;
    continue;
  }

  const checkout = path.resolve(options.from ?? GENERATORS[name].checkout);
  const pageMentions = mentions.filter((mention) => mention.index === name);
  const { index, summary } = GENERATORS[name].generate({ checkout, ref: options.ref, mentions: pageMentions });

  mkdirSync(path.dirname(INDEXES[name].file), { recursive: true });
  writeFileSync(INDEXES[name].file, `${JSON.stringify(index, null, 2)}\n`);
  indexes[name] = index;

  report.push("", `## ${name}`, "", ...summary, `Wrote ${path.relative(ROOT, INDEXES[name].file)}.`);

  // Mentions that linked with the old index, and don't with the new one.
  if (!previous?.symbols?.length) {
    continue;
  }

  const { aliases } = INDEXES[name];
  const resolveNow = createResolver(index.symbols, aliases, index.hooks ?? []);
  const resolvePrevious = createResolver(previous.symbols, aliases, previous.hooks ?? []);
  const gone = pageMentions.filter(
    (mention) => !resolveNow(mention.text, mention.domain, mention.url) && resolvePrevious(mention.text, mention.domain, mention.url),
  );

  report.push("", `### No longer linked (${name})`, "");
  if (gone.length === 0) {
    report.push("Every mention that linked before still does.");
  } else {
    report.push(
      "These mentions linked to a symbol in the previous index, and match nothing now. The symbol was probably renamed, moved, or removed. Check the page against the source.",
      "",
    );
    for (const mention of gone) {
      const before = resolvePrevious(mention.text, mention.domain, mention.url);
      report.push(`- \`${mention.file}:${mention.line}\`: \`${mention.text}\` (was \`${before?.id}\`)`);
    }
  }

  const all = (entries: SymbolIndex) => [...entries.symbols, ...(entries.hooks ?? [])];
  const ids = new Set(all(index).map((symbol) => symbol.id));
  const previousIds = new Set(all(previous).map((symbol) => symbol.id));
  const added = [...ids].filter((id) => !previousIds.has(id));
  const removed = [...previousIds].filter((id) => !ids.has(id));
  if (added.length || removed.length) {
    report.push("", `### Changes to the index (${name})`, "");
    report.push(...added.map((id) => `- Added \`${id}\``), ...removed.map((id) => `- Removed \`${id}\``));
  }
}

// The coverage, with what the docs mention today and the indexes as they
// are now.
const previousCoverage: Coverage | undefined = existsSync(COVERAGE_FILE) ? JSON.parse(readFileSync(COVERAGE_FILE, "utf8")) : undefined;
const coverage = measureCoverage(mentions, indexes);
writeFileSync(
  COVERAGE_FILE,
  `${JSON.stringify(
    {
      commits: Object.fromEntries(Object.entries(indexes).map(([name, index]) => [name, index?.commit ?? null])),
      ...coverage,
    },
    null,
    2,
  )}\n`,
);

report.push("", ...coverageReport(coverage, previousCoverage), "", `Wrote ${path.relative(ROOT, COVERAGE_FILE)}.`);

console.log(report.join("\n"));

// Maps the heading anchors of the old developer and data docs to the
// closest heading on the page that replaced them, in redirects/fragments.tsv.
//
// The redirects in redirects/*.tsv send an old page to its new page. A link
// with an anchor, like integration_fetching_data#coordinated-single-api-poll,
// keeps that anchor across the redirect, but the new page names its headings
// differently. With this map, a small script on the page scrolls to the
// heading that took its place (see src/lib/redirect-fragments.mjs).
//
// How it works: for every old page that redirects to a page of this site,
// it reads the headings of the old page from its Git history, makes their
// anchors the way Docusaurus did, and compares them with the headings of the
// built page in dist/. Anchors that still exist need nothing. For the others,
// it picks the new heading whose words are closest, when one is close enough.
//
// Rows already in fragments.tsv are kept, so a mapping fixed by hand stays.
// Set the new anchor to "-" for an old heading that has no counterpart.
// Delete a row to have it worked out again.
//
// It needs a build (dist/) and checkouts of the old sites. Run it after
// moving or renaming headings on pages that old links point to.
//
// Usage:
//   pnpm build && pnpm fragments
//   pnpm fragments --developers ../developers.home-assistant --data ../data.home-assistant

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import GithubSlugger from "github-slugger";
import { parse as parseYaml } from "yaml";
import { readMap, readRedirects } from "./generate-redirects.ts";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const OUTPUT = fileURLToPath(new URL("../redirects/fragments.tsv", import.meta.url));

const { values: options } = parseArgs({
  options: {
    developers: { type: "string", default: "../developers.home-assistant" },
    data: { type: "string", default: "../data.home-assistant" },
    ref: { type: "string", default: "origin/master" },
  },
});

// The old sites, and how their paths look in redirects/*.tsv.
const SOURCES = [
  { checkout: options.developers, prefix: "/docs" },
  { checkout: options.data, prefix: "data.home-assistant.io/docs" },
];

// How close the words of two headings must be, from 0 to 1, to map one to
// the other. Lower maps more anchors, and more of them wrongly.
const THRESHOLD = 0.5;

// Words that say little about what a heading is about.
const STOPWORDS = new Set(
  "a an and are as at be by can do does for from how i in is it its of on or the this to use using what when with you your".split(
    " ",
  ),
);

interface Heading {
  id: string;
  text: string;
}

interface OldFrontMatter {
  id?: string;
  slug?: unknown;
}

const git = (checkout: string, ...args: string[]) =>
  execFileSync("git", args, { cwd: checkout, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

// The URL path of every doc of an old Docusaurus site, and its Markdown:
// { "/docs/integration_fetching_data": "..." }.
function readOldDocs({ checkout, prefix }: (typeof SOURCES)[number]) {
  const docs = new Map<string, string>();
  const files = git(checkout, "ls-tree", "-r", "--name-only", options.ref, "docs")
    .split("\n")
    .filter((file) => /\.mdx?$/.test(file));

  for (const file of files) {
    const markdown = git(checkout, "show", `${options.ref}:${file}`);
    const frontMatter = /^---\n([\s\S]*?)\n---/.exec(markdown)?.[1];
    const data: OldFrontMatter = frontMatter ? (parseYaml(frontMatter) ?? {}) : {};

    const dir = path.posix.dirname(file).replace(/^docs\/?/, "");
    const name = path.posix.basename(file).replace(/\.mdx?$/, "");
    const id = data.id ?? (name === "index" || name === "README" ? "" : name);

    let urlPath = [dir, id].filter(Boolean).join("/");
    if (typeof data.slug === "string") {
      urlPath = data.slug.startsWith("/") ? data.slug.slice(1) : [dir, data.slug].filter(Boolean).join("/");
    }

    docs.set(`${prefix}/${urlPath}`.replace(/\/$/, ""), markdown);
  }

  return docs;
}

// The headings of old Markdown, with their anchors the way Docusaurus made
// them: an explicit {#id}, or the slug of the text, numbered when repeated.
function oldHeadings(markdown: string) {
  const slugger = new GithubSlugger();
  const headings: Heading[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }

    const match = !inFence && /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (!match) {
      continue;
    }

    const explicit = /\s*\{#([^}]+)\}$/.exec(match[1]);
    const text = match[1]
      .replace(/\s*\{#[^}]+\}$/, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[`*_]/g, "")
      .replace(/<[^>]+>/g, "");

    headings.push({ id: explicit ? explicit[1] : slugger.slug(text), text });
  }

  return headings;
}

// The headings of a built page: { id, text }.
function newHeadings(page: string) {
  const file = path.join(DIST, page, "index.html");
  if (!existsSync(file)) {
    return undefined;
  }

  const html = readFileSync(file, "utf8");
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
  const headings = [...html.matchAll(/<h[2-6][^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/h[2-6]>/g)].map((match) => ({
    id: match[1],
    text: match[2].replace(/<[^>]+>/g, ""),
  }));

  return { ids, headings };
}

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !STOPWORDS.has(word));

// Two words match fully when they are the same, and partly when they share
// a long start, like "request" and "requests", or "parallel" and
// "parallelism".
function wordMatch(a: string, b: string) {
  if (a === b) {
    return 1;
  }

  let common = 0;
  while (common < a.length && a[common] === b[common]) {
    common++;
  }

  return common >= 5 && common >= 0.7 * Math.min(a.length, b.length) ? 0.8 : 0;
}

// The Dice coefficient of two headings, with partly matching words.
function similarity(oldText: string, newText: string) {
  const oldWords = words(oldText);
  const newWords = words(newText);
  if (oldWords.length === 0 || newWords.length === 0) {
    return 0;
  }

  const matched = oldWords.reduce((sum, word) => sum + Math.max(...newWords.map((other) => wordMatch(word, other))), 0);
  return (2 * matched) / (oldWords.length + newWords.length);
}

const existing = existsSync(OUTPUT) ? readMap("fragments.tsv") : [];
const rows = new Map(existing.map(([page, oldId, newId]): [string, string] => [`${page}\t${oldId}`, newId]));
const redirects = readRedirects();
// Without a build, every page looks like it lost all its headings, and the
// cleanup below would throw away every row.
if (!existsSync(DIST)) {
  console.error("dist/ is missing: run `pnpm build` first.");
  process.exit(1);
}

let added = 0;
let unmatched = 0;

for (const source of SOURCES) {
  const docs = readOldDocs(source);

  for (const [from, to] of redirects) {
    const markdown = docs.get(from);

    // A target with an anchor of its own already lands on a heading.
    if (!markdown || to.includes("#")) {
      continue;
    }

    const page = newHeadings(to);
    if (!page) {
      console.warn(`${to} is not in dist/: run \`pnpm build\` first, or fix the redirect for ${from}.`);
      continue;
    }

    for (const heading of oldHeadings(markdown)) {
      const key = `${to}\t${heading.id}`;
      if (page.ids.has(heading.id) || rows.has(key)) {
        continue;
      }

      let best: (Heading & { score: number }) | undefined;
      for (const candidate of page.headings) {
        const score = similarity(heading.text, candidate.text);
        if (score >= THRESHOLD && (!best || score > best.score)) {
          best = { ...candidate, score };
        }
      }

      if (best) {
        rows.set(key, best.id);
        added++;
      } else {
        unmatched++;
      }
    }
  }
}

// Rows whose new anchor no longer exists are dropped, so they are worked out
// again on the next run instead of pointing nowhere.
// A page that is not built at all says nothing about its headings, so that
// fails before anything is written instead of dropping its rows.
const missingPages = new Set<string>();
let dropped = 0;
for (const [key, newId] of rows) {
  const [page] = key.split("\t");
  if (newId === "-") {
    continue;
  }

  const headings = newHeadings(page);
  if (!headings) {
    missingPages.add(page);
  } else if (!headings.ids.has(newId)) {
    rows.delete(key);
    dropped++;
  }
}

if (missingPages.size) {
  console.error(
    `These pages are not in dist/, so ${path.basename(OUTPUT)} is left as it is. ` +
      "Run `pnpm build` first, or fix their rows by hand:\n" +
      [...missingPages].map((page) => `  ${page}`).join("\n"),
  );
  process.exit(1);
}

const sorted = [...rows].sort(([a], [b]) => a.localeCompare(b));
writeFileSync(
  OUTPUT,
  `# Old heading anchors of pages that redirect here, and the heading they
# became: new page, old anchor, new anchor ("-" for none). Generated by
# \`pnpm fragments\`, which keeps rows that are already here: fix a row by hand
# if the guess is wrong.
${sorted.map(([key, newId]) => `${key}\t${newId}`).join("\n")}
`,
);

console.log(
  `${rows.size} anchors mapped (${added} new, ${dropped} dropped as stale). ` +
    `${unmatched} old anchors had no close heading, and land at the top of the page.`,
);

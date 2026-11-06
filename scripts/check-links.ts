// Checks the links of the built site in dist/, so run `pnpm build` first.
//
// - Every link to a page of this site goes to a page that exists, and its
//   #anchor, if any, to an id on that page. Links to old paths covered by a
//   redirect count as fine.
// - Every link to a file, like an image or a feed, goes to a file in dist/.
// - Every redirect in public/_redirects goes to a page that exists.
// - Every row of redirects/fragments.tsv goes to a heading that exists.
// - The share card of every page (og:image) is a file in dist/.
// - Every docs page has a Markdown version for agents, at <page>index.md,
//   points to it with <link rel="alternate">, and to the llms.txt that
//   lists it with <link rel="describedby">.
// - Every link to this site in those Markdown versions and in the llms.txt
//   files goes to a page or file that exists.
//
// Links to other sites are not checked: they fail for reasons that have
// nothing to do with this site, and would make the check flaky.
//
// Usage:
//   pnpm build && pnpm links

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFragments } from "./generate-redirects.ts";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const DOCS = fileURLToPath(new URL("../src/content/docs/", import.meta.url));
const SITE = "https://contributors.home-assistant.io";

// Generated assets, not pages. Links into these are not checked.
const SKIPPED = ["/pagefind", "/components", "/static", "/_astro"];

if (!existsSync(DIST)) {
  console.error("No dist/ folder: run `pnpm build` first.");
  process.exit(1);
}

// Every page, by its path, with the ids on it.
const pages = new Map<string, { html: string; ids: Set<string> }>();

for (const entry of readdirSync(DIST, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".html")) {
    continue;
  }

  const file = path.join(entry.parentPath, entry.name);
  const relative = path.relative(DIST, file).split(path.sep).join("/");
  const pagePath = `/${relative.replace(/(^|\/)index\.html$/, "$1")}`;
  const html = readFileSync(file, "utf8");
  pages.set(pagePath, { html, ids: new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])) });
}

const redirectLines = readFileSync(path.join(DIST, "_redirects"), "utf8")
  .split("\n")
  .filter((line) => line && !line.startsWith("#"));
const redirectedPaths = new Set(redirectLines.filter((line) => line.startsWith("/")).map((line) => line.split(" ")[0]));

const decodeEntities = (text: string) =>
  text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

// Problems, by the broken link, with the pages it is on.
const broken = new Map<string, string[]>();

function report(link: string, foundOn: string) {
  broken.set(link, [...(broken.get(link) ?? []), foundOn]);
}

function pageExists(pagePath: string, anchor: string | undefined) {
  const key = pagePath.endsWith("/") ? pagePath : `${pagePath}/`;
  const page = pages.get(key);
  return page !== undefined && (!anchor || page.ids.has(anchor));
}

// Checks one link to a path of this site, like "/start/#anchor".
function checkLink(link: string, foundOn: string) {
  const [withoutAnchor, anchor] = link.split("#");
  const target = withoutAnchor.split("?")[0];

  // A file, like an image, a feed, or a download.
  if (/\.[a-z0-9]+$/i.test(target)) {
    if (!existsSync(path.join(DIST, decodeURIComponent(target)))) {
      report(link, foundOn);
    }
    return;
  }

  if (redirectedPaths.has(target) || redirectedPaths.has(target.replace(/\/$/, ""))) {
    return;
  }

  if (!pageExists(target, anchor)) {
    report(link, foundOn);
  }
}

// Every link is resolved against the page it is on, like a browser does, so
// "#anchor", "../page/", and absolute URLs to this site are checked too.
for (const [pagePath, { html }] of pages) {
  for (const [, href] of html.matchAll(/<a\s[^>]*href="([^"]*)"/g)) {
    let url;
    try {
      url = new URL(decodeEntities(href), `${SITE}${pagePath}`);
    } catch {
      continue;
    }

    if (url.origin !== SITE || SKIPPED.some((prefix) => url.pathname.startsWith(prefix))) {
      continue;
    }

    // The anchor as it is written in the id, not percent-encoded.
    checkLink(`${url.pathname}${url.search}${decodeURIComponent(url.hash)}`, pagePath);
  }
}

// The share card is a <meta>, not a link, so the loop above skips it.
for (const [pagePath, { html }] of pages) {
  for (const [, image] of html.matchAll(/<meta\s[^>]*property="og:image"\s[^>]*content="([^"]+)"/g)) {
    if (!image.startsWith(`${SITE}/`) || !existsSync(path.join(DIST, image.slice(SITE.length)))) {
      report(image, pagePath);
    }
  }
}

// The Markdown version of every docs page. The path of a page is the path
// of its file, without the extension and without "index", like the docs
// collection makes it.
for (const entry of readdirSync(DOCS, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !/\.mdx?$/.test(entry.name)) {
    continue;
  }

  const file = path.relative(DOCS, path.join(entry.parentPath, entry.name)).split(path.sep).join("/");
  const pagePath = `/${file.replace(/\.mdx?$/, "").replace(/(^|\/)index$/, "")}/`;
  const markdown = `${pagePath}index.md`;
  const html = pages.get(pagePath)?.html ?? "";
  const hasAlternate = [...html.matchAll(/<link\s[^>]*type="text\/markdown"[^>]*>/g)].some(([tag]) =>
    tag.includes(`href="${markdown}"`),
  );

  if (!existsSync(path.join(DIST, markdown))) {
    report(markdown, `src/content/docs/${file} (no Markdown version)`);
  }
  if (!hasAlternate) {
    report(markdown, `${pagePath} (no <link rel="alternate"> to it)`);
  }

  const llms = html.match(/<link\s[^>]*rel="describedby"[^>]*href="([^"]+)"/)?.[1];
  if (!llms || !existsSync(path.join(DIST, llms))) {
    report(llms ?? "llms.txt", `${pagePath} (<link rel="describedby"> is missing, or its file)`);
  }
}

// Links in the files for agents: the Markdown versions and the llms.txt
// files. They link with absolute URLs, so they work outside the site, and
// into /_astro/ too, for images.
for (const entry of readdirSync(DIST, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !(entry.name === "index.md" || /^llms(-full)?\.txt$/.test(entry.name))) {
    continue;
  }

  const file = path.join(entry.parentPath, entry.name);
  const relative = `/${path.relative(DIST, file).split(path.sep).join("/")}`;
  if (SKIPPED.some((prefix) => relative.startsWith(prefix))) {
    continue;
  }

  // Skip code blocks: what is in them is an example, not a link.
  const text = readFileSync(file, "utf8").replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1[ \t]*$/gm, "");
  const links = new Set([...text.matchAll(/\]\((https:\/\/contributors\.home-assistant\.io\/[^)\s]*)/g)].map((match) => match[1]));

  for (const link of links) {
    checkLink(link.slice(SITE.length), relative);
  }
}

for (const line of redirectLines) {
  const target = line.split(" ")[1];
  if (!target?.startsWith(`${SITE}/`) || target.includes(":splat")) {
    continue;
  }

  const [targetPath, anchor] = target.slice(SITE.length).split("#");
  if (!pageExists(targetPath, anchor)) {
    report(target, "public/_redirects");
  }
}

for (const [pagePath, anchors] of Object.entries(readFragments())) {
  for (const [oldId, newId] of Object.entries(anchors)) {
    if (!pageExists(pagePath, newId)) {
      report(`${pagePath}#${newId}`, `redirects/fragments.tsv (for #${oldId}), run \`pnpm fragments\``);
    }
  }
}

console.log(`Checked ${pages.size} pages: ${broken.size} broken links.`);

for (const [link, foundOn] of [...broken].sort(([a], [b]) => a.localeCompare(b))) {
  const unique = [...new Set(foundOn)].sort();
  const more = unique.length > 3 ? `, and ${unique.length - 3} more` : "";
  console.log(`  ${link}  <-  ${unique.slice(0, 3).join(", ")}${more}`);
}

if (broken.size > 0) {
  process.exit(1);
}

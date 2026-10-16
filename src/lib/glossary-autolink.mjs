// Links glossary terms in the text of the docs by themselves. The first time
// a page uses a term, like "config entry", it becomes a link to the term's
// page, with a dotted underline. Pointing at it shows the short definition
// (see src/components/HoverCards.astro).
//
// Which words link to a term is up to the term: the `autolink` list in the
// front matter of its page in src/content/docs/glossary/. Only pages of the
// docs get links, not the blog: those posts stay as they were written.
//
// This runs while Markdown is compiled, for .md and .mdx alike. Astro caches
// rendered pages, and only renders a page again when the page itself
// changes. So the plugin carries a fingerprint of every autolink word: when
// the words change, the configuration of Astro changes with it, and Astro
// drops its cache and renders every page again. In `pnpm dev`,
// glossaryAutolinkWatch() restarts the server when the words change, which
// does the same. Editing the text of a term restarts nothing.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const DOCS_DIR = fileURLToPath(new URL("../content/docs/", import.meta.url));
const GLOSSARY_DIR = `${DOCS_DIR}glossary/`;

// Rewritten when the autolink words change while `pnpm dev` runs. Astro
// watches it, and restarts when it changes.
const DEV_STAMP = fileURLToPath(new URL("../../.astro/glossary-autolink.txt", import.meta.url));

// Text inside these is never linked: it already is a link, it is code, or it
// is a heading or a control. Bold marks the name of something in the
// interface, like **Run Home Assistant Core**, which is not the term.
const SKIP_TAGS = new Set(["a", "code", "pre", "kbd", "strong", "h1", "h2", "h3", "h4", "h5", "h6", "button", "script", "style", "svg"]);

// Every word that links to a term: { term, word, matchCase }.
function readTerms() {
  const words = [];

  for (const file of readdirSync(GLOSSARY_DIR)) {
    if (!file.endsWith(".md")) {
      continue;
    }

    const source = readFileSync(`${GLOSSARY_DIR}${file}`, "utf8");
    const frontMatter = source.match(/^---\n([\s\S]*?)\n---/)?.[1];
    const autolink = frontMatter ? (parse(frontMatter)?.term?.autolink ?? []) : [];
    const term = file.replace(/\.md$/, "");

    for (const word of autolink) {
      words.push({ term, word, matchCase: word !== word.toLowerCase() });
    }
  }

  return words;
}

// The terms a page links to itself, like [entity](/glossary/entity/).
function linkedByHand(root) {
  const linked = new Set();
  const visit = (node) => {
    const href = node.type === "element" && node.tagName === "a" ? String(node.properties?.href ?? "") : "";
    const term = href.match(/^\/glossary\/([^/]+)\/$/)?.[1];
    if (term) {
      linked.add(term);
    }
    for (const child of node.children ?? []) {
      visit(child);
    }
  };
  visit(root);
  return linked;
}

// Changes when any autolink word, or the term it links to, changes.
const fingerprint = (words) => createHash("sha256").update(JSON.stringify(words)).digest("hex").slice(0, 16);

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function glossaryAutolink() {
  const words = readTerms();
  if (words.length === 0) {
    return null;
  }

  const byWord = new Map(words.map((entry) => [entry.word.toLowerCase(), entry]));

  // Longest first, so "config entry" wins over "entry". Not inside a longer
  // word, and not next to a hyphen: "re-entry" is not "entry".
  const alternatives = words
    .map((entry) => entry.word)
    .sort((a, b) => b.length - a.length)
    .map(escape)
    .join("|");
  const pattern = new RegExp(`(?<![\\w-])(?:${alternatives})(?![\\w-])`, "gi");

  return {
    name: "glossary-autolink",
    // Not used by the plugin: it is here so Astro sees a new configuration,
    // and renders every page again, when the words change.
    vocabulary: fingerprint(words),

    before(root, ctx) {
      const path = ctx.fileURL ? fileURLToPath(ctx.fileURL) : "";

      ctx.data.glossaryAutolink = {
        enabled: path.startsWith(DOCS_DIR),
        // A term's own page does not link to itself.
        currentTerm: path.startsWith(GLOSSARY_DIR) ? path.slice(GLOSSARY_DIR.length).replace(/\.mdx?$/, "") : undefined,
        // Terms the writer already linked by hand don't get a second link.
        linked: linkedByHand(root),
      };
    },

    text(node, ctx) {
      const state = ctx.data.glossaryAutolink;
      if (!state?.enabled || node.value.search(pattern) === -1) {
        return;
      }

      for (let parent = ctx.parent(node); parent && parent.type !== "root"; parent = ctx.parent(parent)) {
        const isSkipped = parent.type === "element" && SKIP_TAGS.has(parent.tagName);
        // Components in MDX, like a live demo, render their own content.
        const isComponent = parent.type.startsWith("mdxJsx");
        if (isSkipped || isComponent) {
          return;
        }
      }

      const pieces = [];
      let last = 0;

      for (const match of node.value.matchAll(pattern)) {
        const entry = byWord.get(match[0].toLowerCase());
        const isLinkable =
          entry &&
          (!entry.matchCase || match[0] === entry.word) &&
          entry.term !== state.currentTerm &&
          !state.linked.has(entry.term);

        if (!isLinkable) {
          continue;
        }

        state.linked.add(entry.term);
        pieces.push({ type: "text", value: node.value.slice(last, match.index) });
        pieces.push({
          type: "element",
          tagName: "a",
          properties: { href: `/glossary/${entry.term}/`, className: ["glossary-term"] },
          children: [{ type: "text", value: match[0] }],
        });
        last = match.index + match[0].length;
      }

      if (pieces.length === 0) {
        return;
      }

      pieces.push({ type: "text", value: node.value.slice(last) });
      ctx.replaceNode(
        node,
        pieces.filter((piece) => piece.type !== "text" || piece.value),
      );
    },
  };
}

// For `pnpm dev`: restarts the server when the autolink words change, so
// every page links the new words, not only the ones you open next.
export function glossaryAutolinkWatch() {
  return {
    name: "glossary-autolink-watch",
    hooks: {
      "astro:config:setup": ({ command, addWatchFile }) => {
        if (command !== "dev") {
          return;
        }

        // Only written when it changed: Astro sees the write and restarts,
        // and a restart runs this hook again, which would loop forever.
        mkdirSync(path.dirname(DEV_STAMP), { recursive: true });
        const stamp = fingerprint(readTerms());
        if (!existsSync(DEV_STAMP) || readFileSync(DEV_STAMP, "utf8") !== stamp) {
          writeFileSync(DEV_STAMP, stamp);
        }
        addWatchFile(DEV_STAMP);
      },

      "astro:server:setup": ({ server }) => {
        server.watcher.on("all", (_event, file) => {
          if (!path.resolve(file).startsWith(GLOSSARY_DIR)) {
            return;
          }

          const current = fingerprint(readTerms());
          if (current !== readFileSync(DEV_STAMP, "utf8")) {
            writeFileSync(DEV_STAMP, current);
          }
        });
      },
    },
  };
}

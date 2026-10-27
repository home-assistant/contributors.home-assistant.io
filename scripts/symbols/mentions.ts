// Every inline code span on the docs pages, with its page, line, area, and
// the index of code symbols the page uses (see src/lib/code-symbols.mjs).
// Not in code blocks, headings, or link text. A plain reading of the
// Markdown: good enough to choose what to keep in an index and to count
// coverage. The plugin decides on the real tree.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { areaOf, indexOfPage, pageDomainOf, pageUrlOf } from "../../src/lib/code-symbols.mjs";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DOCS_DIR = path.join(ROOT, "src/content/docs");

export interface Mention {
  file: string;
  url: ReturnType<typeof pageUrlOf>;
  area: ReturnType<typeof areaOf>;
  index: ReturnType<typeof indexOfPage>;
  domain: ReturnType<typeof pageDomainOf>;
  line: number;
  text: string;
}

function pages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return pages(full);
    }
    return /\.mdx?$/.test(entry.name) ? [full] : [];
  });
}

export function docsMentions() {
  const mentions: Mention[] = [];

  for (const file of pages(DOCS_DIR)) {
    const lines = readFileSync(file, "utf8").split("\n");
    const page = {
      file: path.relative(ROOT, file),
      url: pageUrlOf(file),
      area: areaOf(file),
      index: indexOfPage(file),
      domain: pageDomainOf(file),
    };
    let fence: string | undefined;
    let inFrontMatter = lines[0] === "---";

    lines.forEach((line, number) => {
      if (inFrontMatter) {
        inFrontMatter = number === 0 || line !== "---";
        return;
      }

      const marker = line.match(/^\s*(`{3,}|~{3,})/)?.[1];
      if (marker && (!fence || marker.startsWith(fence))) {
        fence = fence ? undefined : marker;
        return;
      }
      if (fence || /^\s*#{1,6}\s/.test(line)) {
        return;
      }

      const linkTexts = [...line.matchAll(/\[[^\]]*\]\(/g)].map((match) => [match.index, match.index + match[0].length]);

      for (const match of line.matchAll(/(?<!`)`([^`]+)`(?!`)/g)) {
        const insideLink = linkTexts.some(([start, end]) => match.index > start && match.index < end);
        if (!insideLink) {
          mentions.push({ ...page, line: number + 1, text: match[1] });
        }
      }
    });
  }

  return mentions;
}

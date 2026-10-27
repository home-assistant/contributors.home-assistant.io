// Gives every highlighted code block a small header: the language, an
// optional file name, and a button that copies the code. The button is wired
// by src/components/CodeBlockCopy.astro.
//
// The file name comes from the fence, like ```yaml title="configuration.yaml".
// Shiki is the only step that still sees that text, so it happens in two
// parts: a Shiki transformer puts the title on the `pre`, and a hast plugin,
// which runs after Shiki, wraps the `pre` in a `figure` with the header.
//
// This runs while Markdown is compiled, for .md and .mdx alike. Astro caches
// rendered pages between builds: remove node_modules/.astro to see a change
// here on every page.

import type { Element, ElementContent, Properties, Text } from "hast";
import { defineHastPlugin } from "satteri";
import type { ShikiTransformer } from "shiki";

// An SVG shape of an icon: its tag and attributes.
type Shape = [tagName: string, properties: Properties];

// Where linkUrls() is in a line of a code block.
interface LineCursor {
  text: string;
  position: number;
}

// Readable names for the languages used in the fences. Ids that mean the
// same language share a name: `sh`, `bash`, and `shell` are all "Shell".
const LANGUAGE_LABELS: Partial<Record<string, string>> = {
  bash: "Shell",
  console: "Shell",
  css: "CSS",
  diff: "Diff",
  dockerfile: "Dockerfile",
  html: "HTML",
  ini: "INI",
  javascript: "JavaScript",
  jinja: "Jinja",
  js: "JavaScript",
  json: "JSON",
  json5: "JSON5",
  jsonc: "JSON",
  jsx: "JSX",
  kotlin: "Kotlin",
  liquid: "Liquid",
  markdown: "Markdown",
  md: "Markdown",
  mdx: "MDX",
  mermaid: "Mermaid",
  nginx: "Nginx",
  nix: "Nix",
  properties: "Properties",
  py: "Python",
  python: "Python",
  sh: "Shell",
  shell: "Shell",
  shellscript: "Shell",
  sql: "SQL",
  svg: "SVG",
  swift: "Swift",
  toml: "TOML",
  ts: "TypeScript",
  tsx: "TSX",
  typescript: "TypeScript",
  xml: "XML",
  yaml: "YAML",
  yml: "YAML",
  zsh: "Shell",
};

// Plain text gets no label: "Text" above a block of text says nothing.
const PLAIN_TEXT = new Set(["", "plaintext", "text", "txt", "plain"]);

// Lucide style icons, drawn like the ones in src/components/Icon.astro.
const COPY_ICON: Shape[] = [
  ["rect", { x: "9", y: "9", width: "13", height: "13", rx: "2" }],
  ["path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" }],
];
const CHECK_ICON: Shape[] = [["polyline", { points: "20 6 9 17 4 12" }]];

function languageLabel(language: Properties[string]) {
  const id = String(language ?? "").toLowerCase();
  if (PLAIN_TEXT.has(id)) {
    return undefined;
  }

  return LANGUAGE_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

// The `title="..."` (or `title='...'`) in the meta of a fence.
function fenceTitle(meta: string | undefined) {
  const match = (meta ?? "").match(/(?:^|\s)title=(?:"([^"]*)"|'([^']*)')/);
  const title = (match?.[1] ?? match?.[2])?.trim();
  return title || undefined;
}

const element = (tagName: string, properties: Properties, children: ElementContent[] = []): Element => ({
  type: "element",
  tagName,
  properties,
  children,
});
const text = (value: string): Text => ({ type: "text", value });

function icon(name: string, shapes: Shape[]) {
  return element(
    "svg",
    {
      className: ["code-block-icon", `code-block-icon--${name}`],
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ariaHidden: "true",
      focusable: "false",
    },
    shapes.map(([tagName, properties]) => element(tagName, properties)),
  );
}

// A URL in a code block, up to the first character that can't be part of
// one in a command or a config file.
const URL_PATTERN = /https?:\/\/[^\s"'`<>()]+[^\s"'`<>().,;:]/g;

// A URL with a placeholder in it, like YOUR_GITHUB_USERNAME or <host>, goes
// nowhere, so it stays plain text.
const PLACEHOLDER = /[A-Z][A-Z0-9]*_[A-Z0-9_]+|[<>{}]/;

// A URL that runs straight into one of these continues with a placeholder,
// like https://example.org/<host>/api or f"https://example.org/{name}".
// The pattern stops right before it, and linking the start would point at
// the wrong page.
const PLACEHOLDER_START = /^[<{$]/;

/**
 * Turns the URLs in a highlighted code block into links, one text node at
 * a time. A URL can stop where Shiki starts a new token, like at {name} in
 * a Python f-string, so what comes after a URL is read from the whole line.
 * The copy button copies the text of the block, so a link copies as its URL.
 * The tree is read only, so this returns a new node instead of changing it.
 *
 * `line` is the text of the Shiki line the node is in, and how far into it
 * the walk got, so the text right after a URL can be read across tokens.
 */
function linkUrls(node: ElementContent, line?: LineCursor): ElementContent[] {
  if (node.type === "text") {
    const parts: ElementContent[] = [];
    let last = 0;
    const lineText = line?.text ?? node.value;
    const nodeStart = line?.position ?? 0;

    if (line) {
      line.position += node.value.length;
    }

    for (const match of node.value.matchAll(URL_PATTERN)) {
      const url = match[0];
      const after = lineText.slice(nodeStart + match.index + url.length);
      if (PLACEHOLDER.test(url) || PLACEHOLDER_START.test(after)) {
        continue;
      }

      if (match.index > last) {
        parts.push(text(node.value.slice(last, match.index)));
      }
      parts.push(element("a", { href: url, className: ["code-link"] }, [text(url)]));
      last = match.index + url.length;
    }

    if (!parts.length) {
      return [node];
    }
    if (last < node.value.length) {
      parts.push(text(node.value.slice(last)));
    }
    return parts;
  }

  if (node.type !== "element") {
    return [node];
  }

  return [linkElementUrls(node, line)];
}

// linkUrls() for an element and everything in it.
function linkElementUrls(node: Element, line?: LineCursor): Element {
  const isLine = String(node.properties?.className ?? node.properties?.class ?? "").split(/[\s,]+/).includes("line");
  const context = isLine ? { text: plainText(node), position: 0 } : line;

  return { ...node, children: node.children.flatMap((child) => linkUrls(child, context)) };
}

/** The text of a node and everything in it, like `textContent`. */
function plainText(node: ElementContent): string {
  if (node.type === "text") {
    return node.value;
  }

  return node.type === "element" ? node.children.map(plainText).join("") : "";
}

/** Shiki transformer: keeps the title from the fence on the `pre`. */
export const codeBlockTitle: ShikiTransformer = {
  name: "code-block-title",
  pre(node) {
    const title = fenceTitle(this.options.meta?.__raw);
    if (title) {
      node.properties.dataTitle = title;
    }
  },
};

/** Hast plugin: wraps each highlighted `pre` in a figure with a header. */
export function codeBlocks() {
  return defineHastPlugin({
    name: "code-blocks",

    element: {
      filter: ["pre"],
      visit(node) {
        const classes = String(node.properties?.class ?? node.properties?.className ?? "");
        // Only blocks Shiki highlighted. Others, like `math`, stay as they are.
        if (!classes.split(/\s+/).includes("astro-code")) {
          return;
        }

        const { dataTitle, ...preProperties } = node.properties;
        const title = typeof dataTitle === "string" ? dataTitle : undefined;

        // A Mermaid diagram is drawn in the browser, not shown as code. The
        // source goes into a plain `pre`, which src/components/MermaidDiagrams
        // turns into the diagram.
        if (preProperties.dataLanguage === "mermaid") {
          return element("figure", { className: ["diagram"], dataPagefindIgnore: "" }, [
            element("pre", { className: ["mermaid"] }, [text(plainText(node))]),
          ]);
        }

        const linked = linkElementUrls(node);
        const label = languageLabel(preProperties.dataLanguage);

        const header = element(
          "div",
          { className: ["code-block-header"], dataPagefindIgnore: "" },
          [
            title ? element("span", { className: ["code-block-title"], title }, [text(title)]) : undefined,
            label ? element("span", { className: ["code-block-language"] }, [text(label)]) : undefined,
            element("span", { className: ["code-block-status"], role: "status" }),
            element("button", { type: "button", className: ["code-block-copy"], ariaLabel: "Copy code", dataCopyCode: "" }, [
              icon("copy", COPY_ICON),
              icon("check", CHECK_ICON),
            ]),
          ].filter((child) => child !== undefined),
        );

        return element("figure", { className: title ? ["code-block", "has-title"] : ["code-block"] }, [
          header,
          { ...linked, properties: preProperties },
        ]);
      },
    },
  });
}

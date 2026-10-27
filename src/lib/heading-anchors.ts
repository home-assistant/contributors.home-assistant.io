// Gives every section heading of a page a link to itself, so you can share
// a link to that section. The link sits next to the heading, not inside it:
//
//   <div class="heading-wrapper level-h2">
//     <h2 id="setup">Setup</h2><a class="heading-anchor" href="#setup">...</a>
//   </div>
//
// The heading stays plain text. Screen readers announce it by its own text,
// without "link" in it, and you can still select the text. The link is
// wired by src/components/HeadingAnchors.astro, which copies the URL.
//
// Only headings at the top level of the page get a link. A heading inside a
// callout or an MDX component, like a live demo, is part of that block, not
// a section of the page.
//
// Astro gives headings their ids after every plugin of the site has run, so
// this plugin sets them itself, the same way: github-slugger over the text,
// in page order, and an id a heading already has, like one written in HTML,
// wins. Astro then keeps those ids. Every heading gets one here, also the ones without
// a link, or two plugins counting duplicates apart could hand out the same
// id twice.
//
// This runs while Markdown is compiled, for .md and .mdx alike. Astro caches
// rendered pages between builds: remove node_modules/.astro to see a change
// here on every page.

import Slugger from "github-slugger";
import type { Element } from "hast";
import { defineHastPlugin } from "satteri";
import { ICONS } from "./icons.ts";

interface HeadingAnchorsState {
  slugger: Slugger;
}

declare module "satteri" {
  interface DataMap {
    headingAnchors: HeadingAnchorsState;
  }
}

const HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"];

// Feather's link icon, from src/lib/icons.ts, as hast nodes.
const LINK_ICON = [...ICONS.link.matchAll(/<path d="([^"]+)"\/>/g)].map(
  (match): Element => ({
    type: "element",
    tagName: "path",
    properties: { d: match[1] },
    children: [],
  }),
);

export function headingAnchors() {
  return defineHastPlugin({
    name: "heading-anchors",

    before(_root, ctx) {
      ctx.data.headingAnchors = { slugger: new Slugger() };
    },

    element: {
      filter: HEADINGS,
      visit(node, ctx) {
        const state = ctx.data.headingAnchors;
        if (!state) {
          return;
        }

        const text = ctx.textContent(node);
        const existingId = node.properties?.id;
        const id = typeof existingId === "string" ? existingId : state.slugger.slug(text);

        if (typeof existingId !== "string") {
          ctx.setProperty(node, "id", id);
        }

        // The page title is the h1, and it has no section to link to.
        const isSection = node.tagName !== "h1" && ctx.parent(node)?.type === "root";
        if (!isSection || !id) {
          return;
        }

        const anchor: Element = {
          type: "element",
          tagName: "a",
          properties: {
            href: `#${id}`,
            className: ["heading-anchor"],
            ariaLabel: `Link to section: ${text.trim()}`,
            dataPagefindIgnore: "",
          },
          children: [
            {
              type: "element",
              tagName: "svg",
              properties: {
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
              children: LINK_ICON,
            },
          ],
        };

        ctx.wrapNode(node, {
          type: "element",
          tagName: "div",
          properties: { className: ["heading-wrapper", `level-${node.tagName}`] },
          children: [anchor],
        });
      },
    },
  });
}

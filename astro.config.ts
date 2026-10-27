import { satteri } from "@astrojs/markdown-satteri";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import satteriCallouts from "satteri-callouts";
import { codeBlocks, codeBlockTitle } from "./src/lib/code-blocks.ts";
import { codeSymbols, codeSymbolsWatch } from "./src/lib/code-symbols.ts";
import { discordLinks, discordLinksWatch } from "./src/lib/discord-links.ts";
import { glossaryAutolink, glossaryAutolinkWatch } from "./src/lib/glossary-autolink.ts";
import { headingAnchors } from "./src/lib/heading-anchors.ts";
import { redirectFragments } from "./src/lib/redirect-fragments.ts";
import { sourcePaths, sourcePathsWatch } from "./src/lib/source-paths.ts";

export default defineConfig({
  site: "https://contributors.home-assistant.io",
  trailingSlash: "always",
  // Old anchors of redirected pages find their new heading, and changes to
  // the autolink words of the glossary, the code symbols, the source paths,
  // and the Discord channels reach every page in `pnpm dev`.
  // The sitemap lists pages, not the Markdown and llms.txt files for agents.
  integrations: [
    mdx(),
    sitemap({ filter: (page) => !/\.(md|txt)$/.test(page) }),
    redirectFragments(),
    glossaryAutolinkWatch(),
    codeSymbolsWatch(),
    discordLinksWatch(),
    sourcePathsWatch(),
  ],
  markdown: {
    processor: satteri({
      // GitHub alert syntax (> [!NOTE]), so callouts also render on GitHub.
      // Glossary terms in the docs link to their definition by themselves,
      // and code symbols of core in inline code to their source.
      // Repository paths in inline code link to the file on GitHub, after
      // the code symbols, so a symbol keeps its own link.
      // Discord channels, like **#core**, link to the channel.
      // Code blocks get a header with the language and a copy button.
      // Section headings get a link to themselves. That runs last, so the
      // other plugins never see the link.
      hastPlugins: [
        satteriCallouts({ theme: "github" }),
        glossaryAutolink(),
        codeSymbols(),
        sourcePaths(),
        discordLinks(),
        codeBlocks(),
        headingAnchors(),
      ],
      // Smart punctuation turns `--` into an em dash, which mangles CLI
      // flags written in running text.
      features: { smartPunctuation: false },
    }),
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      // Passes a file name from the fence, like title="configuration.yaml",
      // on to the code block header (see src/lib/code-blocks.ts).
      transformers: [codeBlockTitle],
    },
  },
});

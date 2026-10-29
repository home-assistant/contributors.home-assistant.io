# Home Assistant Contributors

The source of [contributors.home-assistant.io](https://contributors.home-assistant.io): everything you need to contribute to Home Assistant, whether you write code, design, write documentation, translate, moderate, or run releases. It replaces developers.home-assistant.io, design.home-assistant.io, and data.home-assistant.io.

Want to fix or add a page? Start with [Improve this contributor site](https://contributors.home-assistant.io/writing/this-site/). The rules for writing pages, front matter, areas, and the sidebar are in [`.github/copilot-instructions.md`](.github/copilot-instructions.md), also linked as `AGENTS.md` and `CLAUDE.md`. This README is for the moving parts around them.

## Getting started

You need Node.js 24 (see `.node-version`) and pnpm. Corepack picks the pnpm version from `packageManager` in `package.json`.

```shell
pnpm install
pnpm dev
```

Or skip the setup: open the repository in a [dev container](https://containers.dev) with VS Code or a GitHub Codespace. The configuration in `.devcontainer/` installs Node.js, pnpm, and the dependencies, and forwards the port of the development server. In VS Code, **Terminal** > **Run Task** offers the common ones as tasks, like the development server and **Pull request checks**, which runs what CI runs.

Search only works on a build, because Pagefind creates its index afterwards:

```shell
pnpm build
pnpm preview
```

Before you open a pull request, run `pnpm check`, `pnpm build`, `pnpm links`, and `pnpm structure`. [CI](.github/workflows/ci.yml) runs the same on every pull request. Netlify deploys the site, CI does not.

## What lives where

| Where | What |
| --- | --- |
| `src/content/docs/<area>/` | The pages, one folder per area. Areas are defined in `src/data/areas.ts`. |
| `src/content/docs/glossary/` | The glossary, one page per term. |
| `src/content/blog/` | Blog posts. Authors are in `src/data/authors.ts`. |
| `src/content.config.ts` | The front matter every page may have, and its checks. |
| `src/lib/` | The Markdown plugins and the logic behind the sidebar, share cards, and files for agents. Each file explains itself in its header. |
| `src/layouts/`, `src/components/` | Layouts and UI. No framework: Astro components and small web components. |
| `src/data/` | Site data, and the generated indexes of code symbols and source paths. |
| `demo-runtime/` | The fake Home Assistant behind the live demos. |
| `public/components/`, `public/static/` | The bundled frontend components of the demos. Generated, committed. |
| `redirects/` | Old URLs and old heading anchors, and where they go now. |
| `scripts/` | Every generator and check. Each one has its usage in its header. |
| `.github/` | Workflows, issue and pull request templates, labels, skills, and the review checklists. |

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Writes the redirects and starts the development server. |
| `pnpm build` | The same, then builds the site to `dist/` and the search index. |
| `pnpm preview` | Serves `dist/`. |
| `pnpm check` | Type-checks the site and the front matter of every page. CI runs it. |
| `pnpm links` | Checks every link, anchor, redirect, share card, and Markdown version in `dist/`. Needs a build. CI runs it. |
| `pnpm structure` | Checks that every area has the expected shape. CI runs it. |
| `pnpm clean` | Removes `dist/` and the caches of Astro, for when something looks stale. |
| `pnpm redirects` | Writes `public/_redirects` and `public/redirect-fragments.json` from `redirects/`. The build runs it. |
| `pnpm fragments` | Maps old heading anchors to new headings in `redirects/fragments.tsv`. Needs a build. |
| `pnpm bashio` | Generates the Bashio reference from the source of Bashio. |
| `pnpm symbols` | Generates the indexes of code symbols, and their coverage, from core and frontend checkouts. Needs Python. |
| `pnpm source-paths` | Checks which repository paths the docs mention exist, and writes their index. |
| `pnpm tokens` | Syncs the design tokens from the frontend into `src/styles/tokens.css`. |
| `pnpm theme-variables` | Generates the theme variables reference from the frontend, and reports what changed. |
| `pnpm components` | Bundles the frontend components for the live demos. Slow. |
| `pnpm check:demos` | Type-checks `demo-runtime/` against a frontend checkout. |
| `pnpm check:component-docs` | Compares the "In code" sections of the component pages with the frontend source. |
| `pnpm avatars` | Downloads missing GitHub avatars of blog authors. |

Most generators read a checkout next to this repository, like `../core` or `../frontend`, at `origin/dev` or the default branch. Run `git fetch` in it first.

## How things work

### Redirects

The old sites redirect here. Each area has a map in `redirects/`, and `overrides.tsv` wins when two disagree. The build turns the maps into `public/_redirects`, which Git ignores. See [`scripts/generate-redirects.ts`](scripts/generate-redirects.ts). After renaming headings that old links point to, run `pnpm build` and `pnpm fragments`, and review the new rows ([`scripts/generate-fragments.ts`](scripts/generate-fragments.ts)).

### Bashio reference

The function lists of the Bashio pages come from the docblocks in Bashio itself. The text around them lives in `scripts/bashio/`, and the script fails when a module is on no page. See [`scripts/generate-bashio.ts`](scripts/generate-bashio.ts).

### Code symbols

Inline code that names a class, function, or module of core or the frontend links to its source, with a card. A page uses the index of its area, and a mention only links when it can mean one thing. The rules are in [`src/lib/code-symbols.ts`](src/lib/code-symbols.ts), the generator in [`scripts/generate-symbols.ts`](scripts/generate-symbols.ts), and the coverage guess in [`scripts/symbols/coverage.ts`](scripts/symbols/coverage.ts). [A weekly workflow](.github/workflows/update-symbols.yml) opens a pull request when an index changed.

### Source paths

Inline code that is exactly a path in a repository the page is about, like `homeassistant/helpers/`, links to it on GitHub. The rules are in [`src/lib/source-paths.ts`](src/lib/source-paths.ts), the generator in [`scripts/generate-source-paths.ts`](scripts/generate-source-paths.ts). The weekly symbols workflow updates the index too.

### Live demos

The Design area shows real frontend components, bundled from the frontend source and committed, so a build never needs the frontend. [`scripts/build-components.ts`](scripts/build-components.ts) explains the bundle, and the [`update-demos` skill](.github/skills/update-demos/SKILL.md) walks through a rebuild or a new component. Every Monday, [a workflow](.github/workflows/update-demos.yml) rebuilds them from the frontend `dev` branch and opens a pull request. [Another one](.github/workflows/component-docs-drift.yml) runs [`scripts/check-component-docs.ts`](scripts/check-component-docs.ts) and keeps an issue open while the written reference drifts from the frontend.

### Share cards

Every page gets a 1200 by 630 PNG for link previews. [`src/lib/og.ts`](src/lib/og.ts) decides what is on a card, [`src/lib/og-render.ts`](src/lib/og-render.ts) how it looks. Cards are cached in `node_modules/.cache/og/`, and CI keeps that cache between runs.

### Files for agents

The build writes `/llms.txt`, one per area, full-text versions, and a Markdown version of every docs page at `<page URL>index.md`. See [`src/lib/llms.ts`](src/lib/llms.ts) and [`src/lib/markdown-export.ts`](src/lib/markdown-export.ts). A new component in an MDX page fails the build until it has a Markdown version there.

### Caches

Astro only renders a page again when the page changes. The glossary autolink, the code symbols, and the source paths plugins carry a fingerprint of their data, so a change there renders every page again, and `pnpm dev` restarts. See [`src/lib/glossary-autolink.ts`](src/lib/glossary-autolink.ts). When a page still looks stale, run `pnpm clean`.

### Page feedback

Every docs page ends with "Was this page helpful?". A vote goes to Plausible, and "Give feedback" opens the [feedback form](.github/ISSUE_TEMPLATE/feedback.yml) with the page filled in. See [`src/components/PageFeedback.astro`](src/components/PageFeedback.astro).

### Daily build

The events page and the homepage show upcoming events from public calendar feeds, read at build time ([`src/lib/events.ts`](src/lib/events.ts)). [A daily workflow](.github/workflows/daily-build.yml) starts a Netlify build so they stay current. A feed that can't be read never fails the build.

### Design tokens

Colors, spacing, and typography come from the Home Assistant frontend. `src/styles/tokens.css` is generated by [`scripts/sync-tokens.ts`](scripts/sync-tokens.ts): never edit it by hand. Which tokens components use is in the rules.

### Theme variables

[Theme variables](src/content/docs/marketplace/reference/theme-variables.md) lists what a theme can set, with the defaults from the frontend. The classic variables and the design tokens come from the theme files of the frontend. The variables of single components can't be found that way, so they are kept by hand in [`scripts/theme-variables/components.yaml`](scripts/theme-variables/components.yaml), and the generator checks that each one is still read by its file. The text around the tables lives in [`scripts/theme-variables/page.md`](scripts/theme-variables/page.md), the generator in [`scripts/generate-theme-variables.ts`](scripts/generate-theme-variables.ts). The weekly symbols workflow updates the page, and its pull request lists the variables added and removed, and the entries that are gone from the frontend.

### Skills and review instructions

Rules live in [`.github/copilot-instructions.md`](.github/copilot-instructions.md). Workflows that apply them live in [`.github/skills/`](.github/skills/), also linked as `.claude/skills`, so Copilot and Claude Code read the same files. [`.github/instructions/`](.github/instructions/) has the short checklists for Copilot code review. Skills link to the rules instead of repeating them: when you rename a section of the rules, update the skills and checklists that name it.

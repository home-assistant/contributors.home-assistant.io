---
title: Improve this contributor site
sidebarLabel: This contributor site
description: Fix or add a page on contributors.home-assistant.io, preview it on your own machine, and keep links and redirects working.
---

Everything else in this area is about the user documentation on [home-assistant.io](https://www.home-assistant.io/). This page is about the site you are reading right now. It is open source too, and it gets better the same way: someone spots something wrong or missing, and fixes it.

The source lives in the [contributors.home-assistant.io repository](https://github.com/home-assistant/contributors.home-assistant.io). Its README is the guide for maintainers, with every script and how the moving parts fit together. This page covers what you need for a page.

## Fix something small

Every page has an **Edit this page** link at the bottom. It opens the page on GitHub, where you can change it in your browser and open a pull request. For a typo, a broken sentence, or an outdated fact, that is all it takes.

The pages are Markdown, in `src/content/docs/`. The writing rules are in [`.github/copilot-instructions.md`](https://github.com/home-assistant/contributors.home-assistant.io/blob/main/.github/copilot-instructions.md) in the repository: the language, the Markdown and YAML style, and how the site is structured.

## Work with an AI tool

The writing rules double as the instructions for AI tools: `AGENTS.md` and `CLAUDE.md` link to them. The workflows live as skills in `.github/skills/` (also reachable as `.claude/skills/`), like `write-page` to add or change a page, `fact-check` to check pages against the source repositories, and `review` to review a change. Copilot code review also follows the checklists in `.github/instructions/`, one for pages and one for site code.

The rule that matters most in all of them: never invent anything. Every statement on this site needs a source someone can read. [Contribute with AI tools](/start/ai-tools/#what-to-check-yourself-every-time) lists the checks that catch the mistakes reviews found most often.

## Preview the site locally

For anything bigger than a small fix, run the site on your own machine.

The easiest way is the dev container: everything the site needs comes ready-made, on Windows, macOS, and Linux alike. Open the repository in [VS Code](https://code.visualstudio.com/docs/devcontainers/containers) with Docker installed, and select **Reopen in Container**. Or start a [GitHub Codespace](https://docs.github.com/en/codespaces) on the repository, which runs in your browser and needs nothing on your machine. Either way, the dependencies are installed when the container is created, and you only run `pnpm dev`. In VS Code, **Terminal** > **Run Task** also runs the checks for you.

Without the dev container, you need Node.js 24 (the version is in `.node-version`) and pnpm. Then install and start the site:

```shell
pnpm install
pnpm dev
```

The site is now at `http://localhost:4321`, and reloads when you save a page. Search only works on a build:

```shell
pnpm build
pnpm preview
```

Before you open a pull request, run `pnpm check`. It checks the code and the front matter of every page.

## Add a page

The site is split in areas, like Core and integrations, or Design. Each area is a folder in `src/content/docs/`, and every page goes in the folder of the area it belongs to. A subfolder becomes a group in the sidebar. Pages go at most one subfolder deep.

Every page starts with front matter:

```yaml
---
title: "Fetch data"
description: "How your integration gets data from a device or a service."
order: 3
---
```

- `title` is the heading of the page. Use sentence case.
- `description` shows below the title, in search results, and in link previews.
- `order` places the page in the sidebar, lowest first. Pages without one go last, sorted by title.
- `sidebarLabel` is a shorter label for the sidebar, when the title is long.
- `sidebarGroup` puts the page in a named group in the sidebar, without changing its URL. The `index.md` of the folder can set the order of those groups with `sidebarGroups`.

The `index.md` of a folder is its overview page. Every area has the same shape: an overview, a first contribution, guides, reference, and who to talk to. Look at a neighboring page before you add one, and follow what it does.

## Glossary terms

Words with a specific meaning in Home Assistant, like [config entry](/glossary/config-entry/), have a page in the [glossary](/glossary/). Use those terms, and when a term is missing, add it there instead of explaining it on your page.

A term can link by itself: the words in the `autolink` list of its page become a link the first time a page uses them. Only add words there that mean the term wherever they appear. While `pnpm dev` runs, a change to an `autolink` list restarts the server, so every page picks up the new words.

## Live demos

The [Design area](/design/) shows real components of the Home Assistant frontend, live on the page, with a `<Demo>` block in an MDX page. Copy a demo from an existing component page to start. The components themselves are built from the frontend source and committed, so you do not need the frontend to work on a page. Adding a component that is not built yet is a job for a maintainer: the README explains how.

## Check your links

Link to other pages with their full path and a trailing slash, like `/design/foundations/color/`. To check every link of the site, build it and run the link check:

```shell
pnpm build
pnpm links
```

It lists every link to a page or a heading that does not exist, with the pages it is on. The same check runs on every pull request.

## Move or rename a page

Moving or renaming a page changes its URL, and links to the old URL from other sites, bookmarks, and search engines would break. So:

1. Move the page, and update the links to it on this site. `pnpm links` finds the ones you missed.
2. Mention every moved page in your pull request.

A maintainer then adds a redirect for the old URL. The redirects live in the `redirects/` folder of the repository, as one small table per area, and the build turns them into the redirects of the site.

Renaming a heading changes its anchor, and links to that heading land at the top of the page instead. Rename headings when it makes the page better, but know that old links to them lose their place.

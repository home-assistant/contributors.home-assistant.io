---
name: add-glossary-term
description: Use this to add a term to the glossary of the Home Assistant contributors website, or to change one, including its autolink words and a check for wrong matches across the site.
---

# Add a glossary term

Add one term to the glossary, or improve one. The rules are under "Terminology" in [`.github/copilot-instructions.md`](../../copilot-instructions.md).

One term, one page, one meaning. If a page explains a term in its own words, that explanation belongs here instead, and the page links to it.

## 1. Check that it is missing

```shell
grep -rli "<term>" src/content/docs/glossary/
```

Look at `aliases` too: the term may exist under another name. If it does, improve that page instead.

## 2. Find the source

A definition is a claim like any other. Find where the term is defined: the code (class names, keys, files), the UI text (`src/translations/en.json` in the frontend, `strings.json` in core), or an architecture decision. The [`fact-check` skill](../fact-check/SKILL.md#where-the-truth-lives) lists where each source lives. The UI name and the code name are often different: write down both.

## 3. Write the page

Create `src/content/docs/glossary/<term>.md`. The file name is the URL: lowercase, with hyphens.

```yaml
---
title: "Config entry"
description: "One set-up instance of an integration, like one Hue bridge, with the configuration Home Assistant stores for it."
sidebarGroup: "Core and integrations"
term:
  aliases:
    - "config entries"
  code:
    - "ConfigEntry"
    - "async_setup_entry"
  ui: "Integration entry"
  related:
    - "config-flow"
    - "integration"
  autolink:
    - "config entry"
    - "config entries"
---
```

- `description` is the short definition. It shows in the tooltip on every page that links the term, so it must make sense on its own, in one or two sentences.
- The body explains the term: how it relates to other terms, where it shows up, and anything a contributor gets wrong about it. Keep it short.
- `sidebarGroup` must be one of the groups in `sidebarGroups` of `src/content/docs/glossary/index.mdx`.
- `aliases`: other words for the same thing, like a plural. Search and the glossary filter find the term by these.
- `code`: what the code calls it.
- `ui`: what the UI calls it, only when that differs from the title.
- `formerly`: names it had before. New text must never use these. Leave the field out when there are none.
- `related`: other terms, by the file name of their page, without `.md`.
- `autolink`: see the next step. Leave it out when you are not sure.

The schema is in `src/content.config.ts`.

## 4. Choose autolink words carefully

A word in `autolink` becomes a link to the term the first time any page of the docs uses it. A wrong word puts a wrong definition on pages you never opened.

Only add a word that means this term everywhere it appears on the site. "state" is not one: it is also the state of a button. "theme" and "unavailable" do not autolink for the same reason: an Android theme and a service that is unavailable are not the glossary terms.

How matching works (`src/lib/glossary-autolink.ts`):

- A lowercase word matches any case. A word with a capital, like "Assist", only matches as written.
- It matches whole words only, not inside a longer word or next to a hyphen.
- The longest word wins: "config entry" before "entry".
- Text in links, code, headings, buttons, and components is never linked.
- A page that links the term by hand gets no second link.

Before you add a word, find every place it appears:

```shell
grep -rniw "<word>" src/content/docs/ | grep -v "^src/content/docs/glossary/"
```

Read the matches. If any of them means something else, do not add the word. Link the right uses by hand instead: `[config entry](/glossary/config-entry/)`.

## 5. Check the links in the built site

```shell
pnpm build
grep -roP '.{0,80}<a href="/glossary/<term>/" class="glossary-term">[^<]*</a>.{0,80}' dist/ \
  --include=index.html
```

This shows each page where the term links by itself, with the text around it. Only the first use on a page links, so a page can link a wrong use even when a later use is right. Read every match.

A change to `autolink` reaches every page: the build renders all pages again, and `pnpm dev` restarts. If links still look stale, run `pnpm clean`.

## 6. Run the checks

```shell
pnpm check
pnpm build
pnpm links
pnpm structure
```

No check catches a `sidebarGroup` that is not listed in the glossary index: the term then sorts after the listed groups. Look at the glossary sidebar with `pnpm dev`.

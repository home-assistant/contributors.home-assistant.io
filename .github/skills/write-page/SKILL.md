---
name: write-page
description: Use this to add a page to the Home Assistant contributors website, or to change one. Covers choosing the area and topic type, front matter and sidebar, verifying claims, glossary links, demos, diagrams, and the checks to run.
---

# Write a page

Add a page to this site, or change one. The rules for language, Markdown, and YAML are in [`.github/copilot-instructions.md`](../../copilot-instructions.md). Read it first. This skill is the order to work in.

## 1. Find the place

1. Pick the area. The areas are in `src/data/areas.ts`, and their pages in `src/content/docs/<area>/`. A topic has one home: component guidance lives in Design, translations in Translations, the glossary in Glossary. Other areas link there.
2. Look for an existing page first: `grep -rli "<topic>" src/content/docs/`. Improving a page beats adding a second one on the same topic.
3. Pick the folder. Pages directly in an area folder are loose sidebar links. A subfolder is a sidebar group, with an `index.md` overview. Never nest deeper than one subfolder. Never add a folder called "docs".
4. Respect the skeleton of the area: overview (`index.md`), `first-contribution.md` (order 1), `how-it-works.md` (order 2) if the area has one, then guides and reference. See "Area skeleton" in the rules.

## 2. Pick the topic type

Decide what the reader needs: a concept, a task, a reference, a tutorial, or troubleshooting. The house style for each type, with headings and content, is [Structure a page](https://contributors.home-assistant.io/writing/guides/structure/) (`src/content/docs/writing/guides/structure.md`). One page can hold several topics, each under its own heading. Give each heading one purpose.

Write for the readers of that area. Developers get precise content with code. People in Community, Releases, or Data get plain language. Explain a project term the first time you use it, or link the glossary.

## 3. Write the front matter

```yaml
---
title: "Fetch data"
description: "How your integration gets data from a device or a service."
order: 3
---
```

- `title` and `description` are required. Sentence case.
- `order`, `sidebarLabel`, `sidebarGroup`, `sidebarGroups`, and `sidebarCollapse`: see "Front matter" and "Sidebar groups" in the rules. The schema is in `src/content.config.ts`.
- `source` and `lastVerified`: for a page that copies facts that change, like a schedule, a version, a count, or a list of people. See "Facts that go stale" in the rules.

Use `.md`. Use `.mdx` only when the page needs a component, like a demo.

## 4. Verify every claim while you write

Never invent anything. Every statement needs a source you read yourself: code on the default branch of its repository (`dev` for core and frontend), a repository file, or an official page. The [`fact-check` skill](../fact-check/SKILL.md#where-the-truth-lives) lists where each source lives, and how to read it without a local clone.

Watch for the mistakes reviews found most often on this site:

- Absolute words ("every", "always", "only", "never", "nothing") that the source does not support everywhere.
- A condition that got lost when you summarized.
- Claims about people, teams, roles, funding, channels, numbers, timings, and promises. These need an official page, or a maintainer's confirmation in the pull request. Without one, leave them out.
- Examples that only work on the happy path. Think about the first update, unload, reset, migration, downgrade, and empty or boundary values.
- Steps that only work when you already know the setup. Follow them yourself, from a fresh start, in order.
- Comments in code examples that promise more than the code does.
- Former names: check `formerly` in the glossary pages before you use a product name.

If you cannot source something, leave it out and say so in the pull request.

## 5. Link terms and pages

- Use the glossary terms. Some link by themselves (their `autolink` list). For the rest, link the first use yourself: `[action](/glossary/action/)`. A missing term gets its own page: see the [`add-glossary-term` skill](../add-glossary-term/SKILL.md).
- Internal links are absolute with a trailing slash: `/core/entities/sensor/`. Never link to developers.home-assistant.io.
- Code symbols link by themselves too. On pages in Core, Architecture, Security, and Apps, the first inline code that is exactly a class, function, or module of core, like `HomeAssistant`, `ConfigEntry.async_on_unload`, `SensorDeviceClass.TEMPERATURE`, or `homeassistant.components.fan`, links to its source with a card. On Frontend and Design pages, the same goes for the frontend, like `SubscribeMixin`, `hass.callWS`, or `reducedMotionContext`, and an element tag like `ha-button` links to its component page. Glossary terms follow their sidebar group. So write the plain name in backticks, without arguments: `async_write_ha_state()` links, `async_write_ha_state(self)` does not. A name defined more than once only links qualified, like `hass.config_entries.async_setup`. Hooks your integration implements, like `async_setup_entry` or `async_step_user`, link to the page here that explains them (`scripts/symbols/hooks.json`). A symbol you mention for the first time links after `pnpm symbols` (see "Code symbols" in `README.md`): run it against fresh core and frontend checkouts, check that the new link points where you mean, and look at "New unresolved" in the coverage it prints for names you got wrong.
- Moving or renaming a page, or renaming a heading old links point to: see "Moving or renaming pages" in the rules. Add the redirect in `redirects/<area>.tsv` in the same pull request.

## 6. Add code, diagrams, and demos

- Code blocks name their language. Lines stay under 80 characters. Code that belongs in a file gets its name: `` ```yaml title="configuration.yaml" ``.
- Check every code example against the current API on the default branch of its repository.
- Diagrams use a `` ```mermaid `` fence. Every label must match the code it describes.
- Demos of frontend components need `.mdx`:

  ```mdx
  import Demo from "../../../../components/docs/Demo.astro";

  <Demo>
    <ha-button>Save</ha-button>
  </Demo>
  ```

  The number of `../` depends on the folder depth. `<Demo hass>` wraps components that need Home Assistant. `<DoDont doText="..." dontText="...">` shows a do and a don't side by side, with `slot="do"` and `slot="dont"`. Only use elements that `scripts/build-components.ts` bundles. See the [`design-component-page` skill](../design-component-page/SKILL.md).
- In `.mdx`, keep `{` and `}` inside code fences or JSX.
- Images go next to the page, with a relative path and meaningful alt text.

## 7. Run the checks

```shell
pnpm check
pnpm build
pnpm links
pnpm structure
```

All four run on every pull request. Then look at the page with `pnpm dev`, in light and dark, and at phone width.

Check the writing rules that a script can find:

```shell
grep -nP '\x{2014}|\x{2013}' <file>
grep -nwiE 'e\.g\.|i\.e\.|etc\.|click' <file>
grep -nwE 'HA|HASS' <file>
```

## 8. Open the pull request

Fill in the pull request template. Mention every moved page, and quote any maintainer confirmation you relied on. Run the [`review` skill](../review/SKILL.md) on your own change first.

---
name: design-component-page
description: Use this to add or update a component page in the Design area of the Home Assistant contributors website, with specs from the frontend CSS and tokens, accessibility from the code, and live demos.
---

# Design component page

Write or update the page of one frontend component in `src/content/docs/design/components/`. A component page is a reference for designers and developers alike. Every value on it comes from the frontend source.

The general steps of the [`write-page` skill](../write-page/SKILL.md) apply. This skill adds what is special about component pages.

## 1. Find the component

The component lives in the [frontend repository](https://github.com/home-assistant/frontend), branch `dev`, mostly in `src/components/`. Read it there, not in a local working copy:

```shell
gh api -H "Accept: application/vnd.github.raw" \
  "repos/home-assistant/frontend/contents/src/components/ha-switch.ts?ref=dev"
```

Or, with a clone next to this repository:

```shell
git -C ../frontend fetch origin dev
git -C ../frontend show origin/dev:src/components/ha-switch.ts
```

Many components wrap a [Web Awesome](https://webawesome.com/) component. Read that one too: it decides much of the keyboard and screen reader behavior. The frontend uses its own build of it, `@home-assistant/webawesome` in `package.json` of the frontend.

Run the drift check before you start, and again when you are done:

```shell
git -C ../frontend fetch origin dev
pnpm check:component-docs
```

It compares the "In code" section of every component page with the frontend source on `origin/dev`, and lists per page what is documented but no longer in the source, what may come from a Web Awesome or Material base class (check those by hand), and what is in the source but not documented. Before you start, it shows what is already wrong on the page. When you are done, the page must have nothing under "Documented, but not in the source". How it works is in the header of `scripts/check-component-docs.ts`.

## 2. Follow the template

Every component page has the same sections, in this order. The order and what goes in each is on the [components overview](https://contributors.home-assistant.io/design/components/) (`src/content/docs/design/components/index.md`, "How a component page is built"). Copy a finished page as your start, like `switch.mdx`.

```mdx
---
title: Switch
description: Switches turn a single setting on or off.
sidebarGroup: Input
---

import Demo from "../../../../components/docs/Demo.astro";

<Demo>
  <ha-switch checked></ha-switch>
</Demo>

## Overview
## When to use
## Anatomy
## Variants
## Behavior
## Specs
## Guidelines
## Accessibility
### Keyboard
### Focus
### Target size
### Screen readers
### In the code
## Related
## In code
### Attributes
### Slots
### Events
### Styling

Source: [`src/components/ha-switch.ts`](https://github.com/home-assistant/frontend/blob/dev/src/components/ha-switch.ts)
```

- `sidebarGroup` must be one of the `sidebarGroups` on the components overview.
- Keep the shape of **In code**. The drift check reads the lists under the **Attributes**, **Properties**, **Slots**, **Events**, **Styling**, and **Methods** headings, and takes the names in code before the first colon of each item: `` - `name` and `value`: submitted with a form. `` For the default slot, start the item with "Default". On a page with several elements, give each element its own heading, like `### ha-control-switch`, with lead-ins like "Attributes:" and "These can only be set as properties:", or a heading like `### Attributes of ha-list`. Link the source file of every element at the end of **In code**: the check reads only those.
- Add the page to the list of its group on the overview, with a one-line description.
- Leave out a section that has nothing to say, like **Variants** for a component without any. Say so in a sentence when a reader would look for it.

## 3. Take the specs from the CSS

Every size, color, duration, and opacity in **Specs** comes from the `static styles` of the component, or from the component it wraps. Write the value and the token it comes from:

| Property | Value | Token |
| --- | --- | --- |
| Track height | 24px | `--ha-switch-size` |

- Follow each custom property to its default. A component property like `--ha-switch-size` often falls back to a design token. The tokens are in `src/resources/theme/` of the frontend, and synced into `src/styles/tokens.css` of this site.
- Write "None" in the token column when the value is hard-coded.
- Do not round or guess. If a value depends on the theme or the state, give a row per state.
- The **Styling** section under **In code** lists the custom properties a developer can set, with their defaults, from the same CSS.

## 4. Take accessibility from the code

Describe what people get first (keyboard, focus, target size, what a screen reader announces), then the roles and ARIA behind it under **In the code**.

- **Keyboard**: read the key handlers in the component and in the component it wraps. List only keys that do something.
- **Focus**: find where focus goes (`delegatesFocus`, a native element inside) and how the focus ring is drawn.
- **Target size**: from the CSS, including any invisible touch area.
- **Screen readers**: from the role, the accessible name, and `aria-*` attributes in the rendered template. Check the accessibility tree of a demo in the browser's developer tools to confirm the name and role.
- Say what is missing as plainly as what works. A component without an accessible name of its own needs a note on how to give it one.

## 5. Write guidelines with a source

A guideline is a rule. It needs a source like any other claim: a design discussion in [ux-design](https://github.com/OpenHomeFoundation/ux-design/discussions), a rule in the frontend's own review guidance, a comment or a check in the component code, or a guideline that a maintainer confirmed in the pull request.

Use `<DoDont>` only for a rule with a source. A do and a don't without one is an invented rule, with a picture.

```mdx
import DoDont from "../../../../components/docs/DoDont.astro";

<DoDont doText="One accent button per view." dontText="Several accent buttons.">
  <ha-button slot="do">Save</ha-button>
  <Fragment slot="dont">
    <ha-button>Save</ha-button>
    <ha-button>Delete</ha-button>
  </Fragment>
</DoDont>
```

## 6. Build the demos from what is bundled

Demos run the real components, bundled by `scripts/build-components.ts`. Only elements in its `COMPONENTS` list or `EXTRA_ELEMENTS` map work. The current bundle lists them in `public/components/manifest.json`:

```shell
node -e 'console.log(require("./public/components/manifest.json").components.join("\n"))'
```

The loader only loads elements from that list. Any other element stays undefined, unless a bundled component imports it: it shows its plain text content, or nothing, and no error. To add one, follow the [`update-demos` skill](../update-demos/SKILL.md).

- Components that need Home Assistant, like pickers and forms, go in `<Demo hass>`. They get the fake home of `demo-runtime/demo-home.ts`.
- Properties that cannot be an attribute go in `data-props`, as JSON: `<ha-form data-props='{"schema": [], "data": {}}'></ha-form>`.
- In MDX, keep `{` and `}` inside JSX attributes or code fences.
- Use `id`s that are unique on the page: prefix them with the component name.

## 7. Check it

```shell
pnpm check:component-docs
pnpm check
pnpm build
pnpm links
pnpm structure
```

The drift check must list nothing under "Documented, but not in the source" for your page. Names it lists as possibly from the package, check in the Web Awesome or Material component it extends or wraps.

Then open the page with `pnpm dev`. Check every demo in light and dark, at phone width, and with the keyboard. Compare a demo with the specs you wrote: if they disagree, the specs are wrong, or the bundle is old. `public/components/manifest.json` has the commit the bundle was built from.

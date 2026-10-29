---
title: Theming and design tokens
description: The CSS variables behind every color, size, and space in the frontend, and how user themes change them.
order: 5
---

Every color, spacing, radius, and font in the frontend comes from a CSS custom property. That is what makes themes possible: a theme changes the variables, and the whole interface follows. It is also why components never hardcode a color.

## Design tokens

The base variables are [design tokens](/glossary/design-token/), all starting with `--ha-`. They are defined in `src/resources/theme/`:

| File | Tokens |
| --- | --- |
| `core.globals.ts` | Spacing (`--ha-space-1` to `--ha-space-20`, in steps of 4 pixels), radii (`--ha-border-radius-*`), border widths, and animation durations (`--ha-animation-duration-*`) |
| `typography.globals.ts` | Font families, sizes, weights, and line heights (`--ha-font-*`) |
| `color/core.globals.ts` | The color palettes, like `--ha-color-primary-40` |
| `color/semantic.globals.ts` | Colors by purpose, like `--ha-color-text-primary`, `--ha-color-fill-danger-loud-resting`, or `--ha-color-border-neutral-quiet` |

Use the semantic color tokens in components, not the palette. A semantic token says what the color is for, so it can change with the theme and the dark mode without your component knowing.

The [Foundations](/design/foundations/) section of the Design area shows every token, with its value in the light and dark theme: [color](/design/foundations/color/), [typography](/design/foundations/typography/), and [spacing](/design/foundations/spacing/).

## Theme variables

Older variables without the `--ha-` prefix, like `--primary-color`, `--primary-text-color`, and `--card-background-color`, are still everywhere. They are defined in `src/resources/theme/color/color.globals.ts`, mostly on top of the tokens, and they are what most user themes set. Keep them working when you change a component that uses them. [Theme variables](/marketplace/reference/theme-variables/) in the Marketplace area lists them for theme authors, together with the component variables meant for themes.

The Web Awesome components have their own variables, like `--wa-color-brand-fill-loud`. `src/resources/theme/color/wa.globals.ts` maps those to the Home Assistant tokens, so the `ha-*` wrappers follow the theme too.

## Use them in a component

```ts
static styles = css`
  :host {
    display: block;
    padding: var(--ha-space-4);
    gap: var(--ha-space-2);
    color: var(--primary-text-color);
    background-color: var(--card-background-color);
    border-radius: var(--ha-border-radius-lg);
  }
`;
```

## How themes apply

A [theme](/glossary/theme/) is a set of variables with values. Users define themes in YAML through the `frontend` integration in Core, or install them, and pick one in their profile. A theme can have separate values for light and dark mode, under `modes`.

`applyThemesOnElement()` from `src/common/dom/apply_themes_on_element.ts` sets the variables of a theme on an element. The root element applies the selected theme to the whole app. Cards apply the theme from their own `theme` option to just the card. When a theme has dark mode values, those are applied on top when dark mode is on.

For the default theme, users can pick their own primary and accent colors in their profile. The frontend then calculates the primary palette and the matching text colors from that one color.

## Right to left

Some languages are written from right to left. The frontend flips the layout for them. Use logical CSS properties, like `margin-inline-start` and `padding-inline-end`, so your component flips along. Check your change with a right-to-left language, or with the right-to-left toggle in the [gallery](/frontend/development/gallery-and-demo/).

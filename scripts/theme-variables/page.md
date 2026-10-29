---
title: Theme variables
description: Every variable a theme can set, with its default value in light and dark mode.
order: 4
---

A [theme](/glossary/theme/) sets variables of the frontend. This page lists the ones a theme can set, with the default value of each. For how to write a theme, and which variables most themes set, start with [Publish a theme](/marketplace/guides/themes/).

{{generated}}

In a theme file, a variable has no `--` in front, the way this page shows them. In the frontend source, and in CSS, it does: `primary-color` in your theme is `--primary-color` in the code.

Many defaults point to another variable, like `var(--primary-color)`. Those follow that variable: change `primary-color`, and everything that defaults to it changes with it. So set the variables at the top of the chain first, and only set the ones below them where you want something different.

## Classic variables

The variables most themes set, from `src/resources/theme/color/color.globals.ts`. Most components use them. The **Dark** column shows the value the frontend uses in dark mode, when it differs from the light one. **Not set** means the frontend sets no value in that mode, and the components that read the variable use a default of their own.

The variables starting with `mdc-` in the same file are left out: they pass these variables on to older components, and follow them by themselves.

{{classic}}

## Design tokens

Newer components use [design tokens](/glossary/design-token/), with names that start with `ha-`. A theme can set them too. The Design area shows several of them, with what each is for, so they are not repeated here:

- [Color](/design/foundations/color/): the color palettes, like `ha-color-primary-40`. Set the primary palette to give newer components your color, as [Publish a theme](/marketplace/guides/themes/#the-design-tokens) explains.
- [Spacing](/design/foundations/spacing/): the spacing scale, `ha-space-1` to `ha-space-20`, and the corner radius scale, `ha-border-radius-*`.
- [Typography](/design/foundations/typography/): the font sizes, `ha-font-size-*`.

The other tokens are below, by the file of the frontend that defines them.

{{tokens}}

## Component variables

Some components read a variable of their own, with a default in the component itself. These are the ones meant for themes. When a theme does not set one, the component uses the default in the table.

{{components}}

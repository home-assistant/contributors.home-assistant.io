---
title: Publish a theme
description: Write a theme file, choose the variables to set, support light and dark mode, test it, and package it for the Marketplace.
sidebarLabel: Themes
order: 3
---

A [theme](/glossary/theme/) is a YAML file with colors, and some sizes, for the Home Assistant interface. Users pick a theme in their profile, or set one on a single dashboard view or card. Making one needs no programming: YAML, and an eye for what looks good in both light and dark.

How the frontend applies themes, from the side of the code, is in [Theming and design tokens](/frontend/architecture/theming/). This page is for the person writing the theme.

## The theme file

A theme file is a mapping. The key is the name of the theme, as users see it in their profile. Under it are the variables, without the `--` that CSS puts in front of them:

```yaml title="themes/nordic.yaml"
Nordic:
  primary-color: "#5e81ac"
  accent-color: "#d08770"
  card-background-color: "#eceff4"
  primary-background-color: "#e5e9f0"
  primary-text-color: "#2e3440"
  ha-card-border-radius: "16px"
```

Quote every value. In YAML, `#` starts a comment, so an unquoted color is lost, and the frontend expects every value to be a string anyway.

One file can hold more than one theme, each under its own name. Home Assistant reads the files from the `themes` folder of the user's configuration through this line in `configuration.yaml`, which it adds itself when it creates the file:

```yaml title="configuration.yaml"
frontend:
  themes: !include_dir_merge_named themes
```

Users who removed that line, or whose configuration is older, need to add it back. Say so in your README: it is the first thing to check when your theme does not show up.

## Which variables to set

The frontend has two layers of variables, and a good theme sets both.

### The classic variables

Most themes set the variables below. They are defined in the frontend in `src/resources/theme/color/color.globals.ts`, and many components use them. [Theme variables](/marketplace/reference/theme-variables/) lists all of them, with their default values in light and dark mode: copy the ones you want to change.

| Variable | What it is for |
| --- | --- |
| `primary-color` | The main accent color. Other variables, like `sidebar-selected-icon-color`, default to it. |
| `accent-color` | A second accent color |
| `primary-background-color` | The background of the pages |
| `secondary-background-color` | A second background, for surfaces that stand apart from the page |
| `card-background-color` | Cards. `sidebar-background-color` and `ha-card-background` default to it. |
| `primary-text-color` | Most text |
| `secondary-text-color` | Less important text, like descriptions |
| `text-primary-color` | Text on top of `primary-color` |
| `divider-color` | Lines between items |
| `error-color`, `warning-color`, `success-color`, `info-color` | Status messages and alerts |
| `sidebar-background-color`, `sidebar-text-color`, `sidebar-icon-color`, `sidebar-selected-icon-color`, `sidebar-selected-text-color` | The sidebar |
| `app-header-background-color`, `app-header-text-color` | The header at the top of dashboards and other pages |
| `state-icon-color` | Icons of entities |

Cards have variables of their own, from `ha-card`, the container of the built-in cards. Other components have some too, like the gaps of the sections view: they are under [component variables](/marketplace/reference/theme-variables/#component-variables).

| Variable | What it changes |
| --- | --- |
| `ha-card-background` | The background of cards. Falls back to `card-background-color`. |
| `ha-card-border-radius` | The roundness of the corners |
| `ha-card-border-width`, `ha-card-border-color` | The border |
| `ha-card-box-shadow` | The shadow. None by default. |
| `ha-card-header-color`, `ha-card-header-font-size` | The title of a card |

The colors of entity states have variables too, like `state-light-active-color` or `state-lock-locked-color`. They are all under [entity states](/marketplace/reference/theme-variables/#entity-states).

### The design tokens

Newer components use [design tokens](/glossary/design-token/), with names that start with `ha-`. Their colors do not come from `primary-color`. A switch, for example, gets its color from `ha-color-fill-primary-normal-resting`, which points to `ha-color-primary-90`, a step of the primary palette. So a theme that only sets `primary-color` leaves those components in the default blue.

To give them your color too, set the primary palette: eleven steps, from `ha-color-primary-05` (the darkest) to `ha-color-primary-95` (the lightest).

```yaml title="themes/nordic.yaml"
Nordic:
  primary-color: "#5e81ac"
  ha-color-primary-05: "#0d1520"
  ha-color-primary-10: "#18263a"
  ha-color-primary-20: "#25384f"
  ha-color-primary-30: "#3a5577"
  ha-color-primary-40: "#5e81ac"
  ha-color-primary-50: "#7896bb"
  ha-color-primary-60: "#90a9c8"
  ha-color-primary-70: "#a9bdd5"
  ha-color-primary-80: "#c4d2e3"
  ha-color-primary-90: "#dfe7f0"
  ha-color-primary-95: "#eff3f8"
```

`ha-color-primary-40` is the value of `primary-color` in the default theme, so start there. The semantic tokens, like `ha-color-fill-primary-normal-resting`, pick other steps for dark mode by themselves. The tokens and their default values are on the [color](/design/foundations/color/) page of the Design area.

The default theme does this for users: when a user picks their own primary color in their profile, the frontend calculates the palette from it. A custom theme gets no such help, and has to set the palette itself.

### RGB variants

Some components need a color with transparency, and use an RGB variant of the variable, like `rgb-primary-color`. When you set a variable to a hex color, like `"#5e81ac"`, the frontend creates its RGB variant for you. For a color in any other format, like `rgb(94, 129, 172)`, set the RGB variant yourself, as three numbers:

```yaml
Nordic:
  primary-color: "rgb(94, 129, 172)"
  rgb-primary-color: "94, 129, 172"
```

### Variables change

The frontend makes no promise about which variables stay. A variable can be renamed, or stop being used, in any release. Test your theme with every beta.

## Light and dark

A theme can have different values for light and dark mode, under `modes`:

```yaml title="themes/nordic.yaml"
Nordic:
  primary-color: "#5e81ac"
  accent-color: "#d08770"
  modes:
    light:
      primary-background-color: "#e5e9f0"
      card-background-color: "#eceff4"
      primary-text-color: "#2e3440"
    dark:
      primary-background-color: "#2e3440"
      card-background-color: "#3b4252"
      primary-text-color: "#eceff4"
```

The variables outside `modes` apply in both. `modes` needs at least one of `light` or `dark`. What the frontend does with it:

- With both `light` and `dark`, the theme follows the setting of the user, or of their device.
- With only `dark`, the theme is always dark. With no `dark`, or no `modes` at all, the theme is always light.
- In dark mode, the frontend first applies its own dark colors, then your variables, then your `dark` values. You only have to set what you want different.

## Test it

1. Copy your theme file into the `themes` folder of your configuration, next to `configuration.yaml`.
2. Run the `frontend.reload_themes` action, or restart Home Assistant. A theme with an error does not load, and the log says why.
3. In your profile, select your theme. Switch between light and dark there too, if your theme has both.
4. Go through the places users see most: a dashboard with several kinds of cards, a more-info dialog, the settings pages, and a form with inputs.
5. Check that text is readable on every background. The [accessibility](/design/foundations/accessibility/) page has the contrast ratios the built-in theme meets, and what to aim for.

Check it on a phone too: the narrow layout shows the header and the sidebar differently.

## Package it

Put the file in a `themes` folder in your repository:

```text
themes/nordic.yaml
hacs.json
README.md
```

The Marketplace installs everything in your `themes` folder to `themes/<name of your theme file>/` in the user's configuration, and reloads the themes. Before it calls the install done, it checks every YAML file it installed:

- It has to be valid YAML without tags. `!include`, `!secret`, and other tags are refused: a theme is served to every user, and a tag could pull in any file.
- It has to pass the same validation as themes in `configuration.yaml`. A broken theme would stop Home Assistant from loading its configuration at the next start.

Put screenshots in your README, in light and dark: the catalog checks that the README of a theme has images. The [repository structure](/marketplace/reference/repository-structure/#themes) has the details, and the [HACS action](https://github.com/hacs/action) with `category: "theme"` checks it.

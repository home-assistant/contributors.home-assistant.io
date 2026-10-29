---
title: Layout
description: How wide the content of a page can get, and how much space it keeps from the edges of the screen.
order: 3.5
source: https://github.com/home-assistant/frontend/blob/dev/src/resources/theme/core.globals.ts
lastVerified: 2026-10-25
---

> [!NOTE]
> This page describes tokens from a frontend pull request that is not merged yet. Until it is merged, the tokens below do not exist in the frontend.

Every page in Home Assistant has a maximum width for its content, and space between the content and the edges of the screen. When every page picks its own values, moving between pages feels uneven. So there are three content widths and one gutter for the settings, profile, and marketplace pages. Some parts of the interface are not covered yet. They are listed at the end of this page.

## Content widths

Pick the width that fits what is on your page. The widths are generous on purpose: on a desktop screen, they show more at once.

| Width | Token | Max width | Use it for |
| --- | --- | --- | --- |
| Narrow | `--ha-content-width-narrow` | 720px | A single column of cards or forms, like the settings sections, the profile, backups, and the pages of an integration like Z-Wave or Zigbee |
| Wide | `--ha-content-width-wide` | 1280px | A grid of cards, or two columns side by side, like the device, area, and integration pages |
| Full | None | 100% | Content that uses all the space it gets, like data tables, logs, history, maps, the calendar, and energy |

The max width is the width of the content itself. The gutter comes on top of it.

### Pick a width for your page

- Your page is one column of settings, cards, or a form: use narrow.
- Your page shows a grid of cards about one thing, or two columns next to each other: use wide.
- Your page is a table, a chart, a map, or a log: use full width, and don't set a max width.

A narrow page at the wide width looks stretched: rows get long, and the eye has to travel far from a label to its switch. If your single column feels cramped at 720px, that is worth a discussion, not a custom width.

## Gutter

The gutter is the space between the content and the left and right edges of the screen. Use `--ha-content-gutter` (16px) on every screen size. On a large screen, the max width already keeps the content away from the edges. The gutter matters when the screen is narrower than the content.

You don't add the safe area of a phone, like a notch or rounded corners, to the gutter yourself. The page layouts `hass-subpage` and `hass-tabs-subpage` already keep their content inside the safe area.

Below 600px, the settings dashboard and the system navigation page let their cards run from edge to edge, without rounded corners. Keep that for pages that are only a list of links to other pages. Other pages keep the gutter.

## Example

```css
.content {
  max-width: var(--ha-content-width-narrow);
  margin: 0 auto;
  padding: var(--ha-space-7) var(--ha-content-gutter) 0;
}
```

## Not covered yet

Breakpoints, dialogs, dashboards, and the automation and script editors are not part of these widths yet.

---
title: "Frontend component updates in 2026.12"
description: ha-list, ha-list-item, ha-check-list-item and ha-radio-list-item were removed, so the frontend no longer uses Material Web Components.
date: 2026-11-25
authors:
  - Wendelin Peleska
areas:
  - frontend
---

## Component updates

### Removed ha-list, ha-list-item, ha-check-list-item and ha-radio-list-item

`ha-list`, `ha-list-item`, `ha-check-list-item` and `ha-radio-list-item` were removed. They were the last components built on Material Web Components, so the frontend no longer includes `@material/mwc-list` or any other `mwc-*` element.

Use the list family that also replaced `ha-md-list` in 2026.11. Pick the container by what the list means, and the row by what it does:

- `ha-list-base` with `ha-list-item-base` for rows that only show information, or `ha-list-item-button` for clickable rows. With an `href`, `ha-list-item-button` renders a link.
- `ha-list-nav` for a list of links. It wraps the list in a `<nav>` landmark.
- `ha-list-selectable` with `ha-list-item-option` for lists people pick from. Set `multi` to allow more than one option, and `appearance="checkbox"` on the options instead of `ha-check-list-item`. Without `multi`, it replaces `ha-radio-list-item`: the picked option is highlighted, there is no radio button.

The slots and attributes of a row map like this:

```
graphic="…" + slot="graphic"  →  slot="start"
hasMeta + slot="meta"         →  slot="end"
twoline + slot="secondary"    →  slot="supporting-text", or the supporting-text attribute
default slot                  →  slot="headline", or the headline attribute
noninteractive                →  ha-list-item-base
```

```diff
-<ha-list>
-  <ha-list-item graphic="icon" twoline hasMeta @request-selected=${this._open}>
-    <ha-svg-icon slot="graphic" .path=${mdiWifi}></ha-svg-icon>
-    Network
-    <span slot="secondary">Connected over Wi-Fi</span>
-    <ha-icon-next slot="meta"></ha-icon-next>
-  </ha-list-item>
-</ha-list>
+<ha-list-base aria-label="Settings">
+  <ha-list-item-button headline="Network" supporting-text="Connected over Wi-Fi" @click=${this._open}>
+    <ha-svg-icon slot="start" .path=${mdiWifi}></ha-svg-icon>
+    <ha-icon-next slot="end"></ha-icon-next>
+  </ha-list-item-button>
+</ha-list-base>
```

The events changed too. A clickable row fires a regular `click` instead of `request-selected`. `ha-list-selectable` fires `ha-list-item-selected` and `ha-list-item-deselected` instead of `selected` and `action`, with the index of one option as `detail`, instead of the set of all selected indexes.

The `--mdc-list-*` CSS properties no longer have any effect; use `--ha-list-padding`, `--ha-list-gap` and the `--ha-row-item-*` properties instead. The new lists have no padding of their own, so set `--ha-list-padding: 8px 0` to keep the spacing of the old list.

See [the new list family](/design/components/list/#the-new-list-family) on the list page for all attributes, slots, and events.

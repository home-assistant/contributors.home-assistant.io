---
title: Add a state card
description: The row that shows an entity with its icon, name, and state or control, and how to add one for a domain.
order: 2
---

A state card is a compact row for one entity: its icon, its name, when it last changed, and its state, or a small control to change it. You find them at the top of the more-info dialog for domains that use the older design, and in the gallery.

Most domains don't need their own. Without one, an entity gets a toggle when it can be turned on and off, and shows its state as text otherwise. Only add a state card when a domain needs a different control in that row, like a number input or a select.

The state cards live in [`src/state-summary/`](https://github.com/home-assistant/frontend/tree/dev/src/state-summary), one element per domain.

## Add one for a domain

This example adds a state card for a domain called `example`.

1. Add `"example"` to `DOMAINS_WITH_CARD` in `src/common/const.ts`.
2. Create `src/state-summary/state-card-example.ts`, with an element called `state-card-example`. It gets `hass`, `stateObj`, and `inDialog`, which is `true` when the card is shown in the more-info dialog.
3. Import it in `src/state-summary/state-card-content.ts`:

   ```ts
   import "./state-card-example";
   ```

`state-card-content` picks the element by domain: `state-card-<domain>` for the domains in the list, `state-card-toggle` for other entities that can be toggled, and `state-card-display` for the rest. An unavailable entity uses `state-card-display`. An entity with a `custom_ui_state_card` attribute skips all of this: the attribute names the element to use.

Look at the existing state cards, like `state-card-number.ts` or `state-card-select.ts`, for the structure and the shared `state-info` element they start with.

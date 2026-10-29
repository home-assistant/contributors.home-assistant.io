---
title: Revised standard event types for button event entities
description: Button event entities get SINGLE_PRESS and MULTI_PRESS, PRESS_END now only means the release, and the old multi-press types are deprecated.
date: 2026-10-23
authors:
  - Abílio Costa
areas:
  - core
---

The [standard event types for button event entities](/blog/2026/07/22/button-standard-event-types/) are revised. `PRESS_END` now only means that the button was released, the new `SINGLE_PRESS` and `MULTI_PRESS` types describe the presses the device counted, and `MULTI_PRESS_ONGOING`, `MULTI_PRESS_END`, and `ATTR_MULTI_PRESS_COUNT` are deprecated.

See the [architecture discussion](https://github.com/home-assistant/architecture/discussions/1502) for the full background.

<!--truncate-->

## What changes

The types now come in two layers. The physical types describe the button going down and up. The gesture types describe what the device concluded from the presses.

| Event type | Status | Layer | Meaning |
| --- | --- | --- | --- |
| `SINGLE_PRESS` | New | Gesture | The device concluded that exactly one short press happened. |
| `MULTI_PRESS` | New | Gesture | The device finished counting a series of two or more presses. |
| `PRESS_END` | Changed | Physical | The button was released after a press the device did not classify as long. It no longer means a counted single press. |

`MULTI_PRESS` has the number of presses in the `press_count` attribute (the `ATTR_PRESS_COUNT` constant). Only list it in `event_types` if you also list `SINGLE_PRESS`.

## Deprecations

| Deprecated | Use instead |
| --- | --- |
| `ATTR_MULTI_PRESS_COUNT` | `ATTR_PRESS_COUNT` |
| `ButtonEventType.MULTI_PRESS_END` | `ButtonEventType.MULTI_PRESS` |
| `ButtonEventType.MULTI_PRESS_ONGOING` | An integration-specific event type |

Using them logs a warning, and they are removed in Home Assistant 2027.5.0.

## What to do

- If your integration fires `PRESS_END` for a single press the device reports after counting it, switch to `SINGLE_PRESS`.
- Replace the deprecated types and constant with the ones in the table above.
- Switching changes the event types and attributes your users see, so let them know.

For full details, see the [event entity documentation](/core/entities/event/#standard-event-types).

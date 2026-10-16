---
title: Cover entity
description: Build a cover entity for blinds, shades, garage doors, gates, and other things that open and close.
sidebarLabel: Cover
sidebarGroup: Openings and security
---

A cover entity controls something that opens and closes over an opening: blinds, shades, curtains, awnings, garage doors, gates, and motorized windows. It can report and set a position, and a tilt for blinds with slats. Inherit from `CoverEntity` in `homeassistant.components.cover`.

Only use a cover for something that covers an opening. A device that controls the flow of water or gas is a [valve](/core/entities/valve/). A door you lock and unlock is a [lock](/core/entities/lock/). For anything else, use another entity type, like a [number](/core/entities/number/), even where older integrations used a cover.

For how the frontend shows a cover, see the [cover more-info view](/design/more-info/cover/).

## Properties

Cover entities have these properties on top of the [generic entity properties](/core/entities/entity-class/). Every property can be set with its `_attr_` attribute, like `_attr_is_closed`.

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `is_closed` | `bool \| None` | Required | Whether the cover is closed. Used for the state. |
| `is_opening` | `bool \| None` | `None` | Whether the cover is opening. Used for the state. |
| `is_closing` | `bool \| None` | `None` | Whether the cover is closing. Used for the state. |
| `current_cover_position` | `int \| None` | `None` | The position, from 0 (closed) to 100 (fully open). |
| `current_cover_tilt_position` | `int \| None` | `None` | The tilt, from 0 (closed or no tilt) to 100 (open or maximum tilt). |
| `device_class` | `CoverDeviceClass \| None` | `None` | What kind of cover it is. See [Device classes](#device-classes). |
| `supported_speeds` | `list[str] \| None` | `None` | The speeds the cover can move at when it opens, closes, or moves to a position. `None` or an empty list means no speed selection. |

When you set `supported_speeds` to a list, Home Assistant adds it as the `supported_speeds` attribute, and checks the `speed` in an action against it before it calls you. A speed that is not in the list raises a validation error. Without speeds, a `speed` in an action is dropped.

## Device classes

Set a [device class](/glossary/device-class/) from `CoverDeviceClass`. It sets the icon, the wording of the states in the frontend, and how voice assistants talk about the cover.

| Value | Description |
| ----- | ----------- |
| `AWNING` | An awning, like an exterior retractable window, door, or patio cover. |
| `BLIND` | Blinds: linked slats that expand, collapse, or tilt to cover an opening, like window blinds. |
| `CURTAIN` | Curtains or drapes, often fabric hung above a window or door, drawn open and closed. |
| `DAMPER` | A mechanical damper that reduces air flow, sound, or light. |
| `DOOR` | A door that gives access to an area, typically part of a building. |
| `GARAGE` | A garage door. |
| `GATE` | A gate to a driveway or other area, outside a building and typically part of a fence. |
| `SHADE` | Shades: one continuous piece of material or connected cells that expands or collapses over an opening, like window shades. |
| `SHUTTER` | Shutters: linked slats that swing out or in, or tilt, to cover an opening, like window shutters. |
| `WINDOW` | A window that opens, closes, or tilts. |

## Supported features

Combine the `CoverEntityFeature` flags with `|` and set them as `supported_features`. See [supported features](/glossary/supported-features/).

| Value | Description |
| ----- | ----------- |
| `OPEN` | The cover can open. Implement `open_cover`. |
| `CLOSE` | The cover can close. Implement `close_cover`. |
| `SET_POSITION` | The cover can move to a position. Implement `set_cover_position`. |
| `STOP` | The cover can stop while it moves. Implement `stop_cover`. |
| `OPEN_TILT` | The cover can tilt open. Implement `open_cover_tilt`. |
| `CLOSE_TILT` | The cover can tilt closed. Implement `close_cover_tilt`. |
| `STOP_TILT` | The cover can stop while it tilts. Implement `stop_cover_tilt`. |
| `SET_TILT_POSITION` | The cover can tilt to a position. Implement `set_cover_tilt_position`. |
| `SPEED` | The cover can move at different speeds. Set `supported_speeds`. |

If you do not set `supported_features` at all, Home Assistant guesses: `OPEN`, `CLOSE`, and `STOP`, plus `SET_POSITION` when the cover reports a position, all tilt features when it reports a tilt, and `SPEED` when it has speeds. Set the features yourself, so the frontend only shows what the cover can really do.

## Methods

Implement the sync or the async variant of each method, not both.

| Method | Async variant | Feature |
| ------ | ------------- | ------- |
| `open_cover(**kwargs: Any)` | `async_open_cover` | `OPEN` |
| `close_cover(**kwargs: Any)` | `async_close_cover` | `CLOSE` |
| `set_cover_position(**kwargs: Any)` | `async_set_cover_position` | `SET_POSITION` |
| `stop_cover(**kwargs: Any)` | `async_stop_cover` | `STOP` |
| `open_cover_tilt(**kwargs: Any)` | `async_open_cover_tilt` | `OPEN_TILT` |
| `close_cover_tilt(**kwargs: Any)` | `async_close_cover_tilt` | `CLOSE_TILT` |
| `set_cover_tilt_position(**kwargs: Any)` | `async_set_cover_tilt_position` | `SET_TILT_POSITION` |
| `stop_cover_tilt(**kwargs: Any)` | `async_stop_cover_tilt` | `STOP_TILT` |

`set_cover_position` receives `ATTR_POSITION`, and `set_cover_tilt_position` receives `ATTR_TILT_POSITION`, both from 0 to 100. `open_cover`, `close_cover`, and `set_cover_position` can receive `ATTR_SPEED` when the cover has `supported_speeds`.

Toggling is handled for you. `toggle` stops a moving cover when it supports `STOP`, opens a closed or closing cover, and closes an opening or fully open one. A cover that stopped partly open moves the other way from the last direction it reported, and closes when it never reported one. `toggle_tilt` opens the tilt when it is at 0, and closes it otherwise.

## States

The state comes from `is_opening`, `is_closing`, and `is_closed`, in that order, as a `CoverState`:

| Value | Description |
| ----- | ----------- |
| `CoverState.OPENING` | The cover is opening. |
| `CoverState.CLOSING` | The cover is closing. |
| `CoverState.CLOSED` | The cover is closed. |
| `CoverState.OPEN` | The cover is open, fully or partly. |

When the cover is not moving and `is_closed` is `None`, the state is `unknown`.

## Example

```python
from typing import Any

from homeassistant.components.cover import (
    ATTR_POSITION,
    CoverDeviceClass,
    CoverEntity,
    CoverEntityFeature,
)


class MyBlind(CoverEntity):
    """A blind that moves to a position."""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_device_class = CoverDeviceClass.BLIND
    _attr_supported_features = (
        CoverEntityFeature.OPEN
        | CoverEntityFeature.CLOSE
        | CoverEntityFeature.STOP
        | CoverEntityFeature.SET_POSITION
    )

    def __init__(self, device: MyDevice) -> None:
        """Set up the blind."""
        self._device = device
        self._attr_unique_id = device.serial

    @property
    def current_cover_position(self) -> int:
        """Return the position, 0 is closed."""
        return self._device.position

    @property
    def is_closed(self) -> bool:
        """Return if the blind is closed."""
        return self._device.position == 0

    async def async_open_cover(self, **kwargs: Any) -> None:
        """Open the blind."""
        await self._device.move_to(100)

    async def async_close_cover(self, **kwargs: Any) -> None:
        """Close the blind."""
        await self._device.move_to(0)

    async def async_set_cover_position(self, **kwargs: Any) -> None:
        """Move the blind to a position."""
        await self._device.move_to(kwargs[ATTR_POSITION])

    async def async_stop_cover(self, **kwargs: Any) -> None:
        """Stop the blind."""
        await self._device.stop()
```

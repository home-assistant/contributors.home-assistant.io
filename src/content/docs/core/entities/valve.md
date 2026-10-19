---
title: Valve entity
description: Build a valve entity for devices that control the flow of water or gas.
sidebarLabel: Valve
sidebarGroup: Openings and security
---

A valve entity controls the flow of a fluid or gas through a pipe: a water main shutoff, an irrigation valve, or a gas valve. Some valves only open and close, others can be set to a position in between. Inherit from `ValveEntity` in `homeassistant.components.valve`.

Something that opens and closes over an opening, like a blind or a garage door, is a [cover](/core/entities/cover/).

For how the frontend shows a valve, see the [valve more-info view](/design/more-info/valve/).

## Properties

Valve entities have these properties on top of the [generic entity properties](/core/entities/entity-class/). Every property can be set with its `_attr_` attribute, like `_attr_is_closed`.

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `reports_position` | `bool` | Required | Whether the valve reports a position. It decides whether the state comes from `current_valve_position` or from `is_closed`. Can also be set on the entity description, where it defaults to `False`. |
| `current_valve_position` | `int \| None` | `None` | The position, from 0 (closed) to 100 (fully open). Used when `reports_position` is `True`. |
| `is_closed` | `bool \| None` | `None` | Whether the valve is closed. Used when `reports_position` is `False`. |
| `is_opening` | `bool \| None` | `None` | Whether the valve is opening. |
| `is_closing` | `bool \| None` | `None` | Whether the valve is closing. |
| `device_class` | `ValveDeviceClass \| None` | `None` | What the valve controls. See [Device classes](#device-classes). |

If you forget to set `reports_position`, and the entity has no entity description, writing the state raises an error.

## Device classes

Set a [device class](/glossary/device-class/) from `ValveDeviceClass` when it fits.

| Value | Description |
| ----- | ----------- |
| `WATER` | The valve controls the flow of water. |
| `GAS` | The valve controls the flow of gas. |

## Supported features

Combine the `ValveEntityFeature` flags with `|` and set them as `supported_features`. See [supported features](/glossary/supported-features/).

| Value | Description |
| ----- | ----------- |
| `OPEN` | The valve can open. Implement `open_valve`. |
| `CLOSE` | The valve can close. Implement `close_valve`. |
| `SET_POSITION` | The valve can move to a position. Implement `set_valve_position`. |
| `STOP` | The valve can stop while it moves. Implement `stop_valve`. |

## Methods

Implement the sync or the async variant of each method, not both.

| Method | Async variant | Feature |
| ------ | ------------- | ------- |
| `open_valve()` | `async_open_valve` | `OPEN` |
| `close_valve()` | `async_close_valve` | `CLOSE` |
| `set_valve_position(position: int)` | `async_set_valve_position` | `SET_POSITION` |
| `stop_valve()` | `async_stop_valve` | `STOP` |

A valve with `SET_POSITION` does not need `open_valve` and `close_valve`: the open and close actions then call `set_valve_position` with 100 and 0. Still set `OPEN` and `CLOSE`, the actions are only available with those flags. Toggling is handled for you. It stops a moving valve when it supports `STOP`, opens a closed valve, and otherwise moves the other way from the last direction.

## States

The state is a `ValveState`. A moving valve reports `opening` or `closing`, from `is_opening` and `is_closing`. Otherwise the state is `closed` or `open`, from the position (0 is closed) when `reports_position` is `True`, or from `is_closed` when it is `False`.

| Value | Description |
| ----- | ----------- |
| `ValveState.OPENING` | The valve is opening. |
| `ValveState.CLOSING` | The valve is closing. |
| `ValveState.CLOSED` | The valve is closed. |
| `ValveState.OPEN` | The valve is open, fully or partly. |

When the value it depends on is `None`, the state is `unknown`.

## Example

```python
from homeassistant.components.valve import (
    ValveDeviceClass,
    ValveEntity,
    ValveEntityFeature,
)


class MyWaterValve(ValveEntity):
    """A water shutoff valve that only opens and closes."""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_device_class = ValveDeviceClass.WATER
    _attr_reports_position = False
    _attr_supported_features = (
        ValveEntityFeature.OPEN | ValveEntityFeature.CLOSE
    )

    def __init__(self, device: MyDevice) -> None:
        """Set up the valve."""
        self._device = device
        self._attr_unique_id = device.serial

    @property
    def is_closed(self) -> bool:
        """Return if the valve is closed."""
        return not self._device.is_open

    async def async_open_valve(self) -> None:
        """Open the valve."""
        await self._device.open()

    async def async_close_valve(self) -> None:
        """Close the valve."""
        await self._device.close()
```

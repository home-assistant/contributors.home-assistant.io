---
title: Fan entity
description: Build a fan entity that controls speed, direction, oscillation, and preset modes.
sidebarLabel: Fan
sidebarGroup: Lights and climate
---

A fan entity controls a fan: its speed, the direction it turns, whether it oscillates, and preset modes like `auto` or `breeze`. Inherit from `FanEntity` in `homeassistant.components.fan`. It builds on the toggle entity, so it has `is_on`, `turn_on`, and `turn_off`.

A fan that is part of an air conditioner or a heat pump belongs to the [climate entity](/core/entities/climate/), as its fan mode. Use a fan entity for a standalone fan, a ceiling fan, or an air purifier fan.

For how the frontend shows a fan, see the [fan more-info view](/design/more-info/fan/).

## Properties

Fan entities have these properties on top of the [generic entity properties](/core/entities/entity-class/). Every property can be set with its `_attr_` attribute, like `_attr_percentage`.

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `is_on` | `bool \| None` | Calculated | Whether the fan is on. By default, the fan is on when `percentage` is above 0 or a preset is active. Override it when your device knows better. |
| `percentage` | `int \| None` | `0` | The current speed, from 0 (off) to 100. |
| `speed_count` | `int` | `100` | The number of speeds the fan has. Home Assistant uses it to calculate `percentage_step`. |
| `preset_mode` | `str \| None` | `None` | The active preset, or `None` when no preset is active. |
| `preset_modes` | `list[str] \| None` | `None` | The presets the fan supports. |
| `current_direction` | `str \| None` | `None` | The direction the fan turns: `DIRECTION_FORWARD` (`"forward"`) or `DIRECTION_REVERSE` (`"reverse"`). |
| `oscillating` | `bool \| None` | `None` | Whether the fan oscillates. |

`percentage_step` is calculated from `speed_count` as 100 divided by the number of speeds. You do not set it yourself.

### Speeds and percentages

Home Assistant always talks about fan speed as a percentage. If your device has a fixed number of speeds, set `speed_count` and convert between the two with the helpers in `homeassistant.util.percentage`:

- `ranged_value_to_percentage` and `percentage_to_ranged_value` for a numeric range, like speeds 1 to 6
- `ordered_list_item_to_percentage` and `percentage_to_ordered_list_item` for a list of named speeds, like `low`, `medium`, and `high`

Off is not part of the range or the list: a percentage of 0 is off.

### Preset modes

A preset is a mode where the fan controls its own speed, or does something else on its own. Common examples are `auto`, `smart`, `eco`, and `breeze`. When no preset is active, `preset_mode` must be `None`.

Named manual speeds are not presets: represent them as percentages. Setting a speed by hand must end the active preset. If the device lets you set a speed while a preset stays active, represent that preset with a separate [switch](/core/entities/switch/) instead.

## Supported features

Combine the `FanEntityFeature` flags with `|` and set them as `supported_features`. See [supported features](/glossary/supported-features/).

| Value | Description |
| ----- | ----------- |
| `SET_SPEED` | The fan can change speed. Implement `set_percentage`. |
| `PRESET_MODE` | The fan has preset modes. Implement `set_preset_mode`. |
| `OSCILLATE` | The fan can oscillate. Implement `oscillate`. |
| `DIRECTION` | The fan can change direction. Implement `set_direction`. |
| `TURN_ON` | The fan can be turned on. Implement `turn_on`. |
| `TURN_OFF` | The fan can be turned off. Implement `turn_off`. |

Actions for a feature you did not set are rejected before they reach your entity.

## Methods

Implement the sync or the async variant of each method, not both.

| Method | Async variant | Feature |
| ------ | ------------- | ------- |
| `turn_on(percentage: int \| None = None, preset_mode: str \| None = None, **kwargs: Any)` | `async_turn_on` | `TURN_ON` |
| `turn_off(**kwargs: Any)` | `async_turn_off` | `TURN_OFF` |
| `set_percentage(percentage: int)` | `async_set_percentage` | `SET_SPEED` |
| `set_preset_mode(preset_mode: str)` | `async_set_preset_mode` | `PRESET_MODE` |
| `set_direction(direction: str)` | `async_set_direction` | `DIRECTION` |
| `oscillate(oscillating: bool)` | `async_oscillate` | `OSCILLATE` |

A few details:

- `turn_on` can receive a percentage, a preset, both, or neither. When it gets neither, turn the fan on at the speed the device picks.
- A percentage of 0 means off. The default `async_set_percentage` calls `async_turn_off` for it, and then still passes the 0 on to `set_percentage`. When you override `async_set_percentage`, handle 0 yourself. Decreasing the speed below the lowest step also ends up there as 0.
- Home Assistant checks a preset against `preset_modes` before it calls `set_preset_mode` or `turn_on`, and raises a validation error when it is not in the list.
- `toggle` is handled for you: it calls `turn_on` or `turn_off` based on `is_on`.
- `increase_speed` and `decrease_speed` are handled for you. They step by `percentage_step`, or by the step in the action, and call `set_percentage`. You only override `async_increase_speed` and `async_decrease_speed` when the device has its own commands for them.

## States

The state is `on` or `off`, from `is_on`. When `is_on` is `None`, the state is `unknown`.

## Example

```python
import math
from typing import Any

from homeassistant.components.fan import FanEntity, FanEntityFeature
from homeassistant.util.percentage import (
    percentage_to_ranged_value,
    ranged_value_to_percentage,
)

SPEED_RANGE = (1, 3)


class MyFan(FanEntity):
    """A fan with three speeds."""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_speed_count = 3
    _attr_supported_features = (
        FanEntityFeature.SET_SPEED
        | FanEntityFeature.TURN_ON
        | FanEntityFeature.TURN_OFF
    )

    def __init__(self, device: MyDevice) -> None:
        """Set up the fan."""
        self._device = device
        self._attr_unique_id = device.serial

    @property
    def percentage(self) -> int:
        """Return the speed as a percentage."""
        if not self._device.speed:
            return 0
        return ranged_value_to_percentage(SPEED_RANGE, self._device.speed)

    async def async_set_percentage(self, percentage: int) -> None:
        """Set the speed."""
        if percentage == 0:
            await self._device.turn_off()
            return

        # Round up, so 1% is the lowest speed and not off
        speed = math.ceil(percentage_to_ranged_value(SPEED_RANGE, percentage))
        await self._device.set_speed(speed)

    async def async_turn_on(
        self,
        percentage: int | None = None,
        preset_mode: str | None = None,
        **kwargs: Any,
    ) -> None:
        """Turn the fan on."""
        if percentage is not None:
            await self.async_set_percentage(percentage)
            return
        await self._device.turn_on()

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Turn the fan off."""
        await self._device.turn_off()
```

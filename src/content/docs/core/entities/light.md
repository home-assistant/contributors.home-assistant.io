---
title: Light entity
description: Build a light entity that turns on and off, dims, and changes color or color temperature.
sidebarLabel: Light
sidebarGroup: Lights and climate
---

A light entity controls a light source: turning it on and off, and where the hardware allows it, its brightness, color, color temperature, and effects. Inherit from `LightEntity` in `homeassistant.components.light`. Use it for anything that is a light to the person in the room, like a bulb, an LED strip, or a dimmer that drives a lamp. A plain relay that happens to power a lamp is often still a light, but a relay that powers anything else is a [switch](/core/entities/switch/).

For how the frontend shows a light, see the [light more-info view](/design/more-info/light/).

## Properties

Light entities have these properties on top of the [generic entity properties](/core/entities/entity-class/). Every property can be set with its `_attr_` attribute, like `_attr_brightness`.

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `is_on` | `bool \| None` | `None` | Whether the light is on. |
| `supported_color_modes` | `set[ColorMode] \| None` | Required | The color modes the light supports. See [Color modes](#color-modes). |
| `color_mode` | `ColorMode \| None` | `None` | The color mode the light is in right now. Required while the light is on. |
| `brightness` | `int \| None` | `None` | Brightness from 1 to 255. |
| `color_temp_kelvin` | `int \| None` | `None` | Color temperature in kelvin. Only used in `ColorMode.COLOR_TEMP`. |
| `min_color_temp_kelvin` | `int` | `2000` | The warmest color temperature the light supports, in kelvin. |
| `max_color_temp_kelvin` | `int` | `6535` | The coldest color temperature the light supports, in kelvin. |
| `hs_color` | `tuple[float, float] \| None` | `None` | Hue (0 to 360) and saturation (0 to 100). Only used in `ColorMode.HS`. |
| `xy_color` | `tuple[float, float] \| None` | `None` | CIE xy color. Only used in `ColorMode.XY`. |
| `rgb_color` | `tuple[int, int, int] \| None` | `None` | Red, green, and blue, 0 to 255 each. Only used in `ColorMode.RGB`. |
| `rgbw_color` | `tuple[int, int, int, int] \| None` | `None` | Red, green, blue, and white. Only used in `ColorMode.RGBW`. |
| `rgbww_color` | `tuple[int, int, int, int, int] \| None` | `None` | Red, green, blue, cold white, and warm white. Only used in `ColorMode.RGBWW`. |
| `effect_list` | `list[str] \| None` | `None` | The effects the light can show. Requires `LightEntityFeature.EFFECT`. |
| `effect` | `str \| None` | `None` | The effect that runs right now. Use `EFFECT_OFF` (`"off"`) when the light supports effects but none runs. |

The color properties only end up in the state when they match the current `color_mode`. A light in `ColorMode.HS` that also returns an `rgb_color` has that value ignored. Home Assistant fills in the other color formats (`hs_color`, `rgb_color`, and `xy_color`) for you, converted from the one that matches the color mode.

In `ColorMode.RGB`, `ColorMode.RGBW`, and `ColorMode.RGBWW`, brightness lives in two places: in `brightness`, and in the color itself. A brightness of 128 with a color of (192, 64, 32) gives an overall brightness of 128/255 × 192/255, about 38%.

## Color modes

Every light must set `supported_color_modes`, and every light that is on must report a `color_mode`. Both use the `ColorMode` enum. If a light leaves `supported_color_modes` empty, sets an invalid combination, or reports a color mode it did not list, writing its state raises an error.

| Value | Description |
| ----- | ----------- |
| `ColorMode.ONOFF` | The light can only be turned on and off. Must be the only supported mode. |
| `ColorMode.BRIGHTNESS` | The light can be dimmed, nothing more. Must be the only supported mode. |
| `ColorMode.COLOR_TEMP` | The light can be dimmed and its white color temperature changed, read through `color_temp_kelvin`. |
| `ColorMode.HS` | The light can be dimmed and its color set as hue and saturation, through `hs_color`. |
| `ColorMode.XY` | The light can be dimmed and its color set in CIE xy, through `xy_color`. |
| `ColorMode.RGB` | The light can be dimmed and its color set as RGB, through `rgb_color`. |
| `ColorMode.RGBW` | Like RGB, with an extra white channel, through `rgbw_color`. |
| `ColorMode.RGBWW` | Like RGB, with a cold white and a warm white channel, through `rgbww_color`. |
| `ColorMode.WHITE` | The light can switch to a plain white mode with the `white` parameter. There is no `white` property. Only valid together with at least one color mode (`HS`, `XY`, `RGB`, `RGBW`, or `RGBWW`). |
| `ColorMode.UNKNOWN` | The color mode is not known right now. Only valid as `color_mode`, never in `supported_color_modes`. |

The difference between the two white modes: `ColorMode.COLOR_TEMP` lets you adjust the color temperature, typically with a bank of warm white and a bank of cold white LEDs. `ColorMode.WHITE` has a single, fixed white.

### Color mode while an effect runs

While an effect runs, report the color mode that matches what the effect still lets you adjust. If the effect allows no adjustments, use `ColorMode.ONOFF`. If it only allows brightness, use `ColorMode.BRIGHTNESS`. Home Assistant accepts `ColorMode.ONOFF` during an effect even when it is not in `supported_color_modes`, and `ColorMode.BRIGHTNESS` when at least one of your supported color modes has brightness. This only applies to lights with the `EFFECT` feature, while `effect` is set and not `EFFECT_OFF`.

## Supported features

Combine the `LightEntityFeature` flags with `|` and set them as `supported_features`. See [supported features](/glossary/supported-features/).

| Value | Description |
| ----- | ----------- |
| `EFFECT` | The light can show effects. Set `effect_list` and `effect`. |
| `FLASH` | The light can flash. Your `turn_on` receives `flash` with `short` or `long`. |
| `TRANSITION` | The light can fade between states. Your `turn_on` and `turn_off` receive `transition` in seconds. |

Parameters for features you did not set are removed before your methods are called.

## Methods

### Turn on

```python
def turn_on(self, **kwargs: Any) -> None:
    """Turn the light on."""

async def async_turn_on(self, **kwargs: Any) -> None:
    """Turn the light on."""
```

The keyword arguments use the constants from `homeassistant.components.light`, like `ATTR_BRIGHTNESS`, `ATTR_COLOR_TEMP_KELVIN`, `ATTR_HS_COLOR`, `ATTR_RGB_COLOR`, `ATTR_WHITE`, `ATTR_EFFECT`, `ATTR_FLASH`, and `ATTR_TRANSITION`.

You never receive a color mode. Instead you receive at most one color attribute, and it is always one your light supports. When an action asks for a color in a format your light does not support, Home Assistant converts it first. For example, an `hs_color` becomes an `rgb_color` for a light that only supports `ColorMode.RGB`. Brightness given as a percentage or as a step is also converted to `ATTR_BRIGHTNESS` before it reaches you. For a light that supports `ColorMode.WHITE`, `ATTR_WHITE` carries the brightness for white mode: when an action sets both `white` and `brightness`, you only receive `ATTR_WHITE`, with the value of the brightness. When the brightness, or `white`, ends up at 0, like after a step down from a dim light, Home Assistant calls your `turn_off` instead of `turn_on`.

### Turn off

```python
def turn_off(self, **kwargs: Any) -> None:
    """Turn the light off."""

async def async_turn_off(self, **kwargs: Any) -> None:
    """Turn the light off."""
```

`turn_off` can receive `ATTR_TRANSITION` and `ATTR_FLASH`, when the light supports them.

### Toggle

The `light.toggle` action calls `async_toggle`. By default, it calls your `turn_on` when the light is off, and your `turn_off` otherwise, with the same conversions as those actions. You don't need to implement it. If your device has a toggle command of its own, you can override `async_toggle`. There is no sync `toggle`: Home Assistant never calls it.

```python
async def async_toggle(self, **kwargs: Any) -> None:
    """Toggle the light."""
```

### Scaling brightness

Many devices use another range than 1 to 255. The helpers `value_to_brightness` and `brightness_to_value` in `homeassistant.util.color` convert between the two.

```python
import math

from homeassistant.util.color import brightness_to_value, value_to_brightness

BRIGHTNESS_SCALE = (1, 1023)

brightness = value_to_brightness(BRIGHTNESS_SCALE, device_value)
device_value = math.ceil(brightness_to_value(BRIGHTNESS_SCALE, brightness))
```

## States

The state is `on` or `off`, from `is_on`. When `is_on` is `None`, the state is `unknown`.

## Example

```python
from typing import Any

from homeassistant.components.light import (
    ATTR_BRIGHTNESS,
    ColorMode,
    LightEntity,
)


class MyLight(LightEntity):
    """A dimmable light."""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_color_mode = ColorMode.BRIGHTNESS
    _attr_supported_color_modes = {ColorMode.BRIGHTNESS}

    def __init__(self, device: MyDevice) -> None:
        """Set up the light."""
        self._device = device
        self._attr_unique_id = device.serial

    @property
    def is_on(self) -> bool:
        """Return if the light is on."""
        return self._device.is_on

    @property
    def brightness(self) -> int:
        """Return the brightness, 1 to 255."""
        return self._device.brightness

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Turn the light on."""
        brightness = kwargs.get(ATTR_BRIGHTNESS, self.brightness)
        await self._device.turn_on(brightness)

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Turn the light off."""
        await self._device.turn_off()
```

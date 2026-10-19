---
title: Siren entity
description: Build a siren entity for sirens and chimes that sound with a tone, a volume, and a duration.
sidebarLabel: Siren
sidebarGroup: Openings and security
---

A siren entity controls something that makes a loud sound to get attention: an alarm siren, a strobe siren, or a doorbell chime. It turns on and off, and can take a tone, a volume, and a duration. Inherit from `SirenEntity` in `homeassistant.components.siren`. It builds on the toggle entity, so it has `is_on`, `turn_on`, and `turn_off`.

The security system the siren belongs to is an [alarm control panel](/core/entities/alarm-control-panel/). A speaker that plays any audio is a [media player](/core/entities/media-player/).

## Properties

Siren entities have these properties on top of the [generic entity properties](/core/entities/entity-class/). Every property can be set with its `_attr_` attribute, like `_attr_available_tones`.

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `is_on` | `bool \| None` | `None` | Whether the siren is sounding. |
| `available_tones` | `list[int \| str] \| dict[int, str] \| None` | `None` | The tones the siren can play. Required with `TONES`. Can also be set on the entity description. |

`available_tones` is a list of tone names or numbers, or a dictionary from tone number to tone name. With a dictionary, an action can pick a tone by its name, and Home Assistant passes you the matching number.

## Supported features

Combine the `SirenEntityFeature` flags with `|` and set them as `supported_features`. See [supported features](/glossary/supported-features/).

| Value | Description |
| ----- | ----------- |
| `TURN_ON` | The siren can be turned on. Implement `turn_on`. |
| `TURN_OFF` | The siren can be turned off. Implement `turn_off`. |
| `TONES` | The siren can play different tones. Set `available_tones`. |
| `VOLUME_SET` | The volume can be set when the siren turns on. |
| `DURATION` | The duration can be set when the siren turns on. |

## Methods

Implement the sync or the async variant of each method, not both.

| Method | Async variant | Feature |
| ------ | ------------- | ------- |
| `turn_on(**kwargs: Any)` | `async_turn_on` | `TURN_ON` |
| `turn_off(**kwargs: Any)` | `async_turn_off` | `TURN_OFF` |

`turn_on` can receive these keyword arguments, only for the features you set:

- `ATTR_TONE`: the tone to play, checked against `available_tones` first
- `ATTR_VOLUME_LEVEL`: the volume, from 0 to 1
- `ATTR_DURATION`: how long to sound, in seconds

## States

The state is `on` or `off`, from `is_on`. When `is_on` is `None`, the state is `unknown`.

`available_tones` is a capability attribute. It is only there when the siren supports `TONES`, and it is left out of the recorder history.

## Example

```python
from typing import Any

from homeassistant.components.siren import (
    ATTR_TONE,
    SirenEntity,
    SirenEntityFeature,
)


class MySiren(SirenEntity):
    """A siren with a few tones."""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_available_tones = {1: "fire", 2: "intruder", 3: "doorbell"}
    _attr_supported_features = (
        SirenEntityFeature.TURN_ON
        | SirenEntityFeature.TURN_OFF
        | SirenEntityFeature.TONES
    )

    def __init__(self, device: MyDevice) -> None:
        """Set up the siren."""
        self._device = device
        self._attr_unique_id = device.serial

    @property
    def is_on(self) -> bool:
        """Return if the siren sounds."""
        return self._device.sounding

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Sound the siren."""
        await self._device.sound(tone=kwargs.get(ATTR_TONE, 1))

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Silence the siren."""
        await self._device.silence()
```

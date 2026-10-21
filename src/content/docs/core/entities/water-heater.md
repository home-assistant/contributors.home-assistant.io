---
title: Water heater entity
description: Build a water heater entity for boilers and tanks that heat water to a target temperature.
sidebarLabel: Water heater
sidebarGroup: Lights and climate
---

A water heater entity controls a device that heats water: a boiler, a hot water tank, or a heat pump water heater. It has a target temperature, operation modes, and optionally an away mode. Inherit from `WaterHeaterEntity` in `homeassistant.components.water_heater`.

If the device heats or cools a room, use a [climate entity](/core/entities/climate/) instead.

For how the frontend shows a water heater, see the [water heater more-info view](/design/more-info/water-heater/).

## Properties

Water heater entities have these properties on top of the [generic entity properties](/core/entities/entity-class/). Every property can be set with its `_attr_` attribute, like `_attr_current_operation`.

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `native_temperature_unit` | `str` | Required | The unit the device reports temperatures in: `UnitOfTemperature.CELSIUS`, `UnitOfTemperature.FAHRENHEIT`, or `UnitOfTemperature.KELVIN`. |
| `current_operation` | `str \| None` | `None` | The current operation mode. It is the state of the entity. |
| `operation_list` | `list[str] \| None` | `None` | The operation modes the device supports. |
| `native_current_temperature` | `float \| None` | `None` | The measured water temperature, in `native_temperature_unit`. |
| `native_target_temperature` | `float \| None` | `None` | The temperature to reach, in `native_temperature_unit`. |
| `native_target_temperature_high` | `float \| None` | `None` | The upper bound of the target range, in `native_temperature_unit`. |
| `native_target_temperature_low` | `float \| None` | `None` | The lower bound of the target range, in `native_temperature_unit`. |
| `target_temperature_step` | `float \| None` | `None` | The step size for the target temperature, in `native_temperature_unit`. |
| `min_temp` | `float` | 110 °F | The lowest target temperature, in `native_temperature_unit`. The default is converted to your unit. |
| `max_temp` | `float` | 140 °F | The highest target temperature, in `native_temperature_unit`. The default is converted to your unit. |
| `precision` | `float` | Tenths for Celsius, whole numbers otherwise | The precision temperatures are shown with. Without a value, it follows the unit system of the installation. |
| `is_away_mode_on` | `bool \| None` | `None` | Whether away mode is on. Requires `AWAY_MODE`. |

Like the climate entity, a water heater reports temperatures in the unit of the device, and Home Assistant converts them to the unit system of the installation. It adds a `temperature_unit` state attribute with the unit of the converted values. You cannot override that attribute. Temperatures passed to `set_temperature` are converted to `native_temperature_unit` before your method is called.

> [!WARNING]
> The old names without `native_`, like `current_temperature`, `target_temperature`, and `temperature_unit` (and their `_attr_` attributes), are deprecated and stop working in Home Assistant 2027.11. Use the `native_` names in new code.

## Operation modes

Operation modes are strings. Home Assistant has constants with built-in translations for common modes:

| Value | Description |
| ----- | ----------- |
| `STATE_ECO` | Energy efficient mode, balancing performance and cost. |
| `STATE_ELECTRIC` | Heats with electric elements only. |
| `STATE_PERFORMANCE` | Highest performance, at a higher energy cost. |
| `STATE_HIGH_DEMAND` | Built for a high demand for hot water. |
| `STATE_HEAT_PUMP` | Heats with the heat pump only. |
| `STATE_GAS` | Heats with gas only. |
| `STATE_OFF` | The device is off. This one comes from `homeassistant.const`. |

You can add your own modes, and give them a translation and an icon with the [translation key](/core/entities/naming/) of the entity (see [icons](/core/entities/icons/)). Home Assistant checks the mode in an action against `operation_list` before it calls `set_operation_mode`, and raises a validation error when it is not in the list.

## Supported features

Combine the `WaterHeaterEntityFeature` flags with `|` and set them as `supported_features`. See [supported features](/glossary/supported-features/).

| Value | Description |
| ----- | ----------- |
| `TARGET_TEMPERATURE` | The target temperature can be set. Implement `set_temperature`. |
| `OPERATION_MODE` | The operation mode can be set. Set `operation_list` and implement `set_operation_mode`. |
| `AWAY_MODE` | The device has an away mode. Implement `turn_away_mode_on` and `turn_away_mode_off`. |
| `ON_OFF` | The device can be turned on and off. Implement `turn_on` and `turn_off`. |

## Methods

Implement the sync or the async variant of each method, not both.

| Method | Async variant | Feature |
| ------ | ------------- | ------- |
| `set_temperature(**kwargs: Any)` | `async_set_temperature` | `TARGET_TEMPERATURE` |
| `set_operation_mode(operation_mode: str)` | `async_set_operation_mode` | `OPERATION_MODE` |
| `turn_away_mode_on()` | `async_turn_away_mode_on` | `AWAY_MODE` |
| `turn_away_mode_off()` | `async_turn_away_mode_off` | `AWAY_MODE` |
| `turn_on(**kwargs: Any)` | `async_turn_on` | `ON_OFF` |
| `turn_off(**kwargs: Any)` | `async_turn_off` | `ON_OFF` |

`set_temperature` receives `ATTR_TEMPERATURE` in `native_temperature_unit`, and `ATTR_OPERATION_MODE` when the action sets the mode at the same time.

## States

The state is the value of `current_operation`, like `eco`, `performance`, or `off`, or one of your own modes. When `current_operation` is `None`, the state is `unknown`.

## Example

```python
from typing import Any

from homeassistant.components.water_heater import (
    STATE_ECO,
    STATE_PERFORMANCE,
    WaterHeaterEntity,
    WaterHeaterEntityFeature,
)
from homeassistant.const import ATTR_TEMPERATURE, UnitOfTemperature


class MyWaterHeater(WaterHeaterEntity):
    """A boiler with two modes."""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_native_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_min_temp = 40
    _attr_max_temp = 75
    _attr_operation_list = [STATE_ECO, STATE_PERFORMANCE]
    _attr_supported_features = (
        WaterHeaterEntityFeature.TARGET_TEMPERATURE
        | WaterHeaterEntityFeature.OPERATION_MODE
    )

    def __init__(self, device: MyDevice) -> None:
        """Set up the water heater."""
        self._device = device
        self._attr_unique_id = device.serial

    @property
    def current_operation(self) -> str:
        """Return the current mode."""
        return self._device.mode

    @property
    def native_current_temperature(self) -> float:
        """Return the water temperature."""
        return self._device.temperature

    @property
    def native_target_temperature(self) -> float:
        """Return the target temperature."""
        return self._device.setpoint

    async def async_set_temperature(self, **kwargs: Any) -> None:
        """Set the target temperature."""
        await self._device.set_setpoint(kwargs[ATTR_TEMPERATURE])

    async def async_set_operation_mode(self, operation_mode: str) -> None:
        """Set the mode."""
        await self._device.set_mode(operation_mode)
```

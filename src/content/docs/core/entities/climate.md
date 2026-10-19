---
title: Climate entity
description: Build a climate entity for thermostats, air conditioners, and heat pumps that control temperature, humidity, and fans.
sidebarLabel: Climate
sidebarGroup: Lights and climate
---

A climate entity controls the climate of a space: a thermostat, an air conditioner, a heat pump, or a radiator valve with a target temperature. It can also control humidity and the fan of the unit. Inherit from `ClimateEntity` in `homeassistant.components.climate`.

If the device only dries or humidifies the air, use a [humidifier](/core/entities/humidifier/). If it heats water, use a [water heater](/core/entities/water-heater/). A standalone fan is a [fan](/core/entities/fan/).

For how the frontend shows a climate entity, see the [climate more-info view](/design/more-info/climate/).

## Properties

Climate entities have these properties on top of the [generic entity properties](/core/entities/entity-class/). Every property can be set with its `_attr_` attribute, like `_attr_hvac_mode`.

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `hvac_mode` | `HVACMode \| None` | Required | The operation mode the device is set to. It is the state of the entity. |
| `hvac_modes` | `list[HVACMode]` | Required | The operation modes the device supports. |
| `native_temperature_unit` | `str` | Required | The unit the device reports temperatures in: `UnitOfTemperature.CELSIUS` or `UnitOfTemperature.FAHRENHEIT`. |
| `hvac_action` | `HVACAction \| None` | `None` | What the device is doing right now. See [HVAC actions](#hvac-actions). |
| `native_current_temperature` | `float \| None` | `None` | The measured temperature, in `native_temperature_unit`. |
| `native_target_temperature` | `float \| None` | `None` | The temperature to reach, in `native_temperature_unit`. Requires `TARGET_TEMPERATURE`. |
| `native_target_temperature_high` | `float \| None` | Required with `TARGET_TEMPERATURE_RANGE` | The upper bound of the target range, in `native_temperature_unit`. |
| `native_target_temperature_low` | `float \| None` | Required with `TARGET_TEMPERATURE_RANGE` | The lower bound of the target range, in `native_temperature_unit`. |
| `target_temperature_step` | `float \| None` | `None` | The step size for the target temperature, in `native_temperature_unit`. |
| `min_temp` | `float` | 7 °C | The lowest target temperature, in `native_temperature_unit`. The default is converted to your unit. |
| `max_temp` | `float` | 35 °C | The highest target temperature, in `native_temperature_unit`. The default is converted to your unit. |
| `precision` | `float` | Tenths for Celsius, whole numbers otherwise | The precision temperatures are shown with: `PRECISION_TENTHS`, `PRECISION_HALVES`, or `PRECISION_WHOLE`. Without a value, it follows the unit system of the installation. |
| `current_humidity` | `float \| None` | `None` | The measured humidity. |
| `target_humidity` | `float \| None` | `None` | The humidity to reach. Requires `TARGET_HUMIDITY`. |
| `target_humidity_step` | `int \| None` | `None` | The step size for the target humidity. |
| `min_humidity` | `float` | `30` | The lowest target humidity. |
| `max_humidity` | `float` | `99` | The highest target humidity. |
| `preset_mode` | `str \| None` | Required with `PRESET_MODE` | The active preset. |
| `preset_modes` | `list[str] \| None` | Required with `PRESET_MODE` | The available presets. |
| `fan_mode` | `str \| None` | Required with `FAN_MODE` | The current fan mode. |
| `fan_modes` | `list[str] \| None` | Required with `FAN_MODE` | The available fan modes. |
| `swing_mode` | `str \| None` | Required with `SWING_MODE` | The current swing mode. |
| `swing_modes` | `list[str] \| None` | Required with `SWING_MODE` | The available swing modes. |
| `swing_horizontal_mode` | `str \| None` | Required with `SWING_HORIZONTAL_MODE` | The current horizontal swing mode. |
| `swing_horizontal_modes` | `list[str] \| None` | Required with `SWING_HORIZONTAL_MODE` | The available horizontal swing modes. |

### Temperature units

Report every temperature in the unit of the device, and set `native_temperature_unit` to match. The climate entity converts the temperatures to the unit system of the installation before it writes the state, and adds a `temperature_unit` state attribute with the unit of the converted values. You cannot override that attribute.

It works the other way too: temperatures passed to `set_temperature` are converted to `native_temperature_unit` and checked against `min_temp` and `max_temp` before your method is called.

> [!WARNING]
> The old names without `native_`, like `current_temperature`, `target_temperature`, and `temperature_unit` (and their `_attr_` attributes), are deprecated and stop working in Home Assistant 2027.11. Use the `native_` names in new code.

## HVAC modes

The HVAC mode is what the device is asked to do. Only use the modes of the `HVACMode` enum. When a device has an option that changes how a mode behaves, make it a preset instead of a new mode.

| Value | Description |
| ----- | ----------- |
| `HVACMode.OFF` | The device is off. |
| `HVACMode.HEAT` | The device heats to a target temperature. |
| `HVACMode.COOL` | The device cools to a target temperature. |
| `HVACMode.HEAT_COOL` | The device heats or cools to stay within a target range. |
| `HVACMode.AUTO` | The device follows a schedule, learned behavior, or its own logic. You cannot set a temperature in this mode. |
| `HVACMode.DRY` | The device dries the air. |
| `HVACMode.FAN_ONLY` | Only the fan runs, without heating or cooling. |

## HVAC actions

The HVAC action is what the device is doing right now to reach its mode and preset, as decided by its own control logic. Only use the actions of the `HVACAction` enum.

| Value | Description |
| ----- | ----------- |
| `HVACAction.OFF` | The device is off and does nothing until its mode changes. |
| `HVACAction.IDLE` | The device does nothing right now, but can start when conditions change. |
| `HVACAction.HEATING` | The device adds heat. |
| `HVACAction.PREHEATING` | The heat source runs, but is not at operating temperature yet. |
| `HVACAction.COOLING` | The device removes heat. |
| `HVACAction.DRYING` | The device removes moisture from the air. |
| `HVACAction.FAN` | Only the fan runs, to circulate or ventilate air. |
| `HVACAction.DEFROSTING` | The device removes built up ice. |

Be honest with `hvac_action`. A thermostat with hysteresis, or a variable power device that keeps running at low power after it reached its target, does not always know whether it is heating or idle. If the device cannot tell you what it is doing, leave `hvac_action` out.

## Presets, fan modes, and swing modes

Presets, fan modes, and swing modes are lists of strings. Home Assistant has constants with built-in translations for common values, and you can add your own values. Give custom values a translation and an icon with the [translation key](/core/entities/naming/) of the entity, under `state_attributes` (see [icons](/core/entities/icons/)).

- **Presets**: `PRESET_NONE`, `PRESET_ECO`, `PRESET_AWAY`, `PRESET_BOOST`, `PRESET_COMFORT`, `PRESET_HOME`, `PRESET_SLEEP`, and `PRESET_ACTIVITY`.
- **Fan modes**: `FAN_ON`, `FAN_OFF`, `FAN_AUTO`, `FAN_LOW`, `FAN_MEDIUM`, `FAN_HIGH`, `FAN_TOP`, `FAN_MIDDLE`, `FAN_FOCUS`, and `FAN_DIFFUSE`.
- **Swing modes**: `SWING_ON`, `SWING_OFF`, `SWING_BOTH`, `SWING_VERTICAL`, and `SWING_HORIZONTAL`.
- **Horizontal swing modes**: `SWING_HORIZONTAL_ON` and `SWING_HORIZONTAL_OFF`.

Only implement horizontal swing when the device controls vertical and horizontal swing separately. Then `swing_modes` covers the vertical direction and `swing_horizontal_modes` the horizontal one. Otherwise, put every option in `swing_modes`.

Home Assistant checks the mode in an action against your list before it calls you, and raises a validation error when it is not in there.

## Supported features

Combine the `ClimateEntityFeature` flags with `|` and set them as `supported_features`. See [supported features](/glossary/supported-features/).

| Value | Description |
| ----- | ----------- |
| `TARGET_TEMPERATURE` | The device has a single target temperature. Implement `set_temperature`. |
| `TARGET_TEMPERATURE_RANGE` | The device has a target range, used by `HVACMode.HEAT_COOL`. Implement `set_temperature`. |
| `TARGET_HUMIDITY` | The device has a target humidity. Implement `set_humidity`. |
| `FAN_MODE` | The device has fan modes. Implement `set_fan_mode`. |
| `PRESET_MODE` | The device has presets. Implement `set_preset_mode`. |
| `SWING_MODE` | The device has swing modes. Implement `set_swing_mode`. |
| `SWING_HORIZONTAL_MODE` | The device has separate horizontal swing modes. Implement `set_swing_horizontal_mode`. |
| `TURN_ON` | The device can be turned on. Implement `turn_on`, or rely on the default (see below). |
| `TURN_OFF` | The device can be turned off. Implement `turn_off`, or rely on the default (see below). |

Actions for a feature you did not set are rejected before they reach your entity.

## Methods

Implement the sync or the async variant of each method, not both.

| Method | Async variant | Called for |
| ------ | ------------- | ---------- |
| `set_hvac_mode(hvac_mode: HVACMode)` | `async_set_hvac_mode` | Changing the HVAC mode. Always available. |
| `set_temperature(**kwargs: Any)` | `async_set_temperature` | `TARGET_TEMPERATURE` or `TARGET_TEMPERATURE_RANGE`. |
| `set_humidity(humidity: int)` | `async_set_humidity` | `TARGET_HUMIDITY`. |
| `set_fan_mode(fan_mode: str)` | `async_set_fan_mode` | `FAN_MODE`. |
| `set_preset_mode(preset_mode: str)` | `async_set_preset_mode` | `PRESET_MODE`. |
| `set_swing_mode(swing_mode: str)` | `async_set_swing_mode` | `SWING_MODE`. |
| `set_swing_horizontal_mode(swing_horizontal_mode: str)` | `async_set_swing_horizontal_mode` | `SWING_HORIZONTAL_MODE`. |
| `turn_on()` | `async_turn_on` | `TURN_ON`. |
| `turn_off()` | `async_turn_off` | `TURN_OFF`. |
| `toggle()` | `async_toggle` | `TURN_ON` and `TURN_OFF`. |

`set_temperature` receives `ATTR_TEMPERATURE` for a single target, or `ATTR_TARGET_TEMP_LOW` and `ATTR_TARGET_TEMP_HIGH` for a range, all in `native_temperature_unit`. It can also receive `ATTR_HVAC_MODE`, when the action sets the mode at the same time.

You do not always have to implement `turn_on` and `turn_off`. Without them, `turn_off` sets `HVACMode.OFF` when the device supports it. `turn_on` picks the only other mode when the device has two modes and one is `OFF`, and otherwise the first of `HEAT_COOL`, `HEAT`, and `COOL` the device supports. If the device has its own on and off, implement them, and set `hvac_mode` to the mode it lands in. `toggle` calls `turn_on` or `turn_off` based on whether `hvac_mode` is `OFF`.

## States

The state is the value of `hvac_mode`: `off`, `heat`, `cool`, `heat_cool`, `auto`, `dry`, or `fan_only`. When `hvac_mode` is `None`, the state is `unknown`.

## Restoring temperatures

If your entity restores its temperatures after a restart, don't read them from the attributes of the last state that `RestoreEntity` gives you. Those are converted to the unit system of the installation and rounded for display. Inherit from `RestoreClimate` instead, and call `async_get_last_climate_data()` in `async_added_to_hass`.

It returns the stored `native_current_temperature`, `native_target_temperature`, `native_target_temperature_high`, and `native_target_temperature_low`, converted to your current `native_temperature_unit`, or `None` when there is nothing to restore. A temperature that is not a valid number comes back as `None`.

Pass `validate_range=True` when you send the restored targets to the device, like when the device can't report its own state. A target outside `min_temp` and `max_temp` then comes back as `None`, and you fall back to a default. A target at most half a degree outside the range, which rounding can cause, is clamped to the range instead. That half degree is in the unit the temperature was stored in, so a value stored in °F gets about 0.28 °C of room on an entity that now uses °C.

```python
from homeassistant.components.climate import RestoreClimate


class MyThermostat(RestoreClimate):
    async def async_added_to_hass(self) -> None:
        """Restore the target temperature."""
        await super().async_added_to_hass()
        if (
            data := await self.async_get_last_climate_data(validate_range=True)
        ) is not None and data.native_target_temperature is not None:
            self._attr_native_target_temperature = (
                data.native_target_temperature
            )
```

## Example

```python
from typing import Any

from homeassistant.components.climate import (
    ClimateEntity,
    ClimateEntityFeature,
    HVACMode,
)
from homeassistant.const import ATTR_TEMPERATURE, UnitOfTemperature


class MyThermostat(ClimateEntity):
    """A thermostat that heats, or is off."""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_hvac_modes = [HVACMode.OFF, HVACMode.HEAT]
    _attr_native_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_target_temperature_step = 0.5
    _attr_supported_features = (
        ClimateEntityFeature.TARGET_TEMPERATURE
        | ClimateEntityFeature.TURN_ON
        | ClimateEntityFeature.TURN_OFF
    )

    def __init__(self, device: MyDevice) -> None:
        """Set up the thermostat."""
        self._device = device
        self._attr_unique_id = device.serial

    @property
    def hvac_mode(self) -> HVACMode:
        """Return the current mode."""
        return HVACMode.HEAT if self._device.heating else HVACMode.OFF

    @property
    def native_current_temperature(self) -> float:
        """Return the measured temperature."""
        return self._device.temperature

    @property
    def native_target_temperature(self) -> float:
        """Return the target temperature."""
        return self._device.setpoint

    async def async_set_hvac_mode(self, hvac_mode: HVACMode) -> None:
        """Set the mode."""
        await self._device.set_heating(hvac_mode == HVACMode.HEAT)

    async def async_set_temperature(self, **kwargs: Any) -> None:
        """Set the target temperature."""
        await self._device.set_setpoint(kwargs[ATTR_TEMPERATURE])
```

With `TURN_ON` and `TURN_OFF` set and only `OFF` and `HEAT` as modes, the default `turn_on` and `turn_off` call `async_set_hvac_mode` for you.

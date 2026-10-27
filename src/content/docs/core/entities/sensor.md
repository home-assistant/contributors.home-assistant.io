---
title: Sensor entity
description: Report a read-only value, like a temperature, a power reading, or a timestamp, with its unit, and opt in to long-term statistics.
sidebarLabel: Sensor
sidebarGroup: Sensors and status
---

A sensor is a read-only entity that reports a value: a temperature, the power a plug draws, the time a device last booted, or one of a fixed list of text states. It can carry a unit of measurement, and Home Assistant converts that unit to what the user prefers. Inherit from `SensorEntity`, imported from `homeassistant.components.sensor`.

Use a sensor when the value has more than two states and the user cannot change it. Two states is a [binary sensor](/core/entities/binary-sensor/). A value the user sets is a [number](/core/entities/number/), [select](/core/entities/select/), or [text](/core/entities/text/) entity.

## Properties

You set the value in its _native_ unit, the unit the device or service reports. Never set `state` or `unit_of_measurement` yourself: the base class owns them, converts the native value to the unit the user wants, and validates the result.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `native_value` | `str \| int \| float \| date \| datetime \| Decimal \| None` | Required | The value, in `native_unit_of_measurement`. The device class can restrict which types are allowed. |
| `device_class` | `SensorDeviceClass \| None` | `None` | What the sensor measures. See [device classes](#device-classes). |
| `native_unit_of_measurement` | `str \| None` | `None` | The unit of `native_value`. Leave it unset when you provide a translated unit (see below). |
| `state_class` | `SensorStateClass \| None` | `None` | What kind of value this is. Setting it marks the sensor as numeric and opts it in to [long-term statistics](#long-term-statistics). |
| `last_reset` | `datetime \| None` | `None` | When an accumulating sensor started a new meter cycle. Only allowed with `SensorStateClass.TOTAL`. |
| `options` | `list[str] \| None` | `None` | The possible states of a sensor with the `enum` device class. Cannot be combined with a state class or a unit. |
| `suggested_display_precision` | `int \| None` | `None` | How many decimals the frontend shows. The state itself is not rounded. |
| `suggested_unit_of_measurement` | `str \| None` | `None` | The unit to show the value in, instead of the one the unit system would pick. Stored in the entity registry the first time the sensor is seen, and after that only updated when the user changes the unit system. |

The generic properties every entity has, like `name` or `available`, are on [the entity class](/core/entities/entity-class/).

A sensor can never have the `config` [entity category](/glossary/entity-category/): Home Assistant refuses to add it. Use `EntityCategory.DIAGNOSTIC` for sensors like signal strength.

### Units

The base class picks the unit it shows in this order:

1. A unit the user set in the entity settings.
2. The initial unit, stored in the entity registry for sensors with a unique ID: the `suggested_unit_of_measurement`, or else the unit the user's unit system prefers for the device class. A sensor without a unique ID uses the `suggested_unit_of_measurement` directly.
3. The temperature unit of the user's unit system, for sensors with the `temperature` device class and a native unit of °C or °F.
4. A translated unit: the `unit_of_measurement` key next to the name in the `entity` section of `strings.json`, looked up by `translation_key`. Use this for units that are words, like "steps". A sensor with a translated unit must not set `native_unit_of_measurement`.
5. The `native_unit_of_measurement`.

Users can change the unit of any sensor whose device class has a unit converter, as long as both the native unit and the new unit are valid for that device class.

Use the unit constants from `homeassistant.const`, like `UnitOfTemperature.CELSIUS`, instead of writing the unit as a string. A custom string that only looks like a supported unit, like `KWh` instead of `kWh`, counts as a different unit.

### Restoring the value

To restore the value after a restart, inherit from `RestoreSensor` instead of `RestoreEntity`. `RestoreEntity` stores the converted state, which can be in a different unit than the native value. Call `await self.async_get_last_sensor_data()` in `async_added_to_hass` to get back the `native_value` and `native_unit_of_measurement`.

### Attributes

Do not add `extra_state_attributes` to a sensor for values that change often. Every state change with changed attributes is written to the database. Create another sensor instead. See [state and attributes](/core/entities/state-attributes/).

## Supported features

This entity has no supported features.

## Device classes

The [device class](/glossary/device-class/) tells Home Assistant what the sensor measures. It sets the icon, the unit conversion, and how the frontend shows the value. A sensor with a device class and no name is named after its device class, except for `enum`. See [naming](/core/entities/naming/).

When you set a device class, the unit must be one of the units listed for it, and the state class must be one the device class allows. Home Assistant logs a warning when they do not match. The value column is what you put in YAML, for example as `device_class` of an [MQTT sensor](https://www.home-assistant.io/integrations/sensor.mqtt/) or a [template sensor](https://www.home-assistant.io/integrations/template/).

Non-numeric device classes take no unit and no state class:

| Device class | Value | Description |
| --- | --- | --- |
| `SensorDeviceClass.DATE` | `date` | A date. `native_value` must be a `datetime.date`. |
| `SensorDeviceClass.ENUM` | `enum` | One of a fixed list of text states. Set `options`. |
| `SensorDeviceClass.TIMESTAMP` | `timestamp` | A moment in time. `native_value` must be a `datetime` with a time zone. |
| `SensorDeviceClass.UPTIME` | `uptime` | When the device last booted, as a `datetime` with a time zone. Changes smaller than 60 seconds between updates are ignored, so a boot time calculated from an uptime counter does not change the state on every update. Set `_attr_uptime_drift_tolerance` to a number of seconds to change that tolerance (at least 5). |

Numeric device classes and their units:

| Device class | Value | Units | Description |
| --- | --- | --- | --- |
| `ABSOLUTE_HUMIDITY` | `absolute_humidity` | g/m³, mg/m³ | Absolute humidity |
| `APPARENT_POWER` | `apparent_power` | mVA, VA, kVA | Apparent power |
| `AQI` | `aqi` | None | Air quality index |
| `AREA` | `area` | mm², cm², m², km², in², ft², yd², mi², ac, ha | Area |
| `ATMOSPHERIC_PRESSURE` | `atmospheric_pressure` | Pa, hPa, kPa, mPa, cbar, mbar, bar, psi, inHg, inH₂O, mmHg, atm | Atmospheric pressure |
| `BATTERY` | `battery` | % | Charge left in a battery |
| `BLOOD_GLUCOSE_CONCENTRATION` | `blood_glucose_concentration` | mg/dL, mmol/L | Blood glucose concentration |
| `CO` | `carbon_monoxide` | ppb, ppm, μg/m³, mg/m³ | Carbon monoxide concentration |
| `CO2` | `carbon_dioxide` | ppm | Carbon dioxide concentration |
| `CONDUCTIVITY` | `conductivity` | S/cm, mS/cm, μS/cm | Conductivity |
| `CURRENT` | `current` | A, mA, μA | Electric current |
| `DATA_RATE` | `data_rate` | bit/s, kbit/s, Mbit/s, Gbit/s, B/s, kB/s, MB/s, GB/s, KiB/s, MiB/s, GiB/s | Data rate |
| `DATA_SIZE` | `data_size` | bit, kbit, Mbit, Gbit, B, kB, MB, GB, TB, PB, EB, ZB, YB, KiB, MiB, GiB, TiB, PiB, EiB, ZiB, YiB | Data size |
| `DISTANCE` | `distance` | mm, cm, m, km, in, ft, yd, mi, nmi | Distance |
| `DURATION` | `duration` | μs, ms, s, min, h, d | A length of time. It should only change when the device reports a new value, not because time passes. |
| `ENERGY` | `energy` | J, kJ, MJ, GJ, mWh, Wh, kWh, MWh, GWh, TWh, cal, kcal, Mcal, Gcal, thm | Energy used or produced, like an electricity meter. Not to be confused with power. |
| `ENERGY_DISTANCE` | `energy_distance` | kWh/100km, Wh/km, mi/kWh, km/kWh | Energy used per distance, like the consumption of an electric car |
| `ENERGY_STORAGE` | `energy_storage` | Same as `ENERGY` | Energy stored, like the charge in a home battery |
| `FREQUENCY` | `frequency` | mHz, Hz, kHz, MHz, GHz | Frequency |
| `GAS` | `gas` | L, m³, ft³, CCF, MCF | Gas volume. Gas measured in kWh is `ENERGY`. |
| `HUMIDITY` | `humidity` | % | Relative humidity |
| `ILLUMINANCE` | `illuminance` | lx | Light level |
| `IRRADIANCE` | `irradiance` | W/m², BTU/(h⋅ft²) | Irradiance |
| `MOISTURE` | `moisture` | % | Moisture |
| `MONETARY` | `monetary` | An ISO 4217 currency code | Money |
| `NITROGEN_DIOXIDE` | `nitrogen_dioxide` | ppb, ppm, μg/m³ | Nitrogen dioxide concentration |
| `NITROGEN_MONOXIDE` | `nitrogen_monoxide` | ppb, μg/m³ | Nitrogen monoxide concentration |
| `NITROUS_OXIDE` | `nitrous_oxide` | μg/m³ | Nitrous oxide concentration |
| `OZONE` | `ozone` | ppb, ppm, μg/m³ | Ozone concentration |
| `PH` | `ph` | None | pH of a water-based solution |
| `PM1`, `PM25`, `PM4`, `PM10` | `pm1`, `pm25`, `pm4`, `pm10` | μg/m³ | Particulate matter smaller than 1, 2.5, 4, or 10 micrometers |
| `POWER` | `power` | mW, W, kW, MW, GW, TW | Power |
| `POWER_FACTOR` | `power_factor` | %, None | Power factor |
| `PRECIPITATION` | `precipitation` | mm, cm, in | Accumulated precipitation |
| `PRECIPITATION_INTENSITY` | `precipitation_intensity` | mm/h, mm/d, in/h, in/d | Precipitation intensity |
| `PRESSURE` | `pressure` | Same as `ATMOSPHERIC_PRESSURE` | Pressure |
| `RADON` | `radon` | Bq/m³, pCi/L | Radon concentration |
| `REACTIVE_ENERGY` | `reactive_energy` | varh, kvarh | Reactive energy |
| `REACTIVE_POWER` | `reactive_power` | mvar, var, kvar | Reactive power |
| `SIGNAL_STRENGTH` | `signal_strength` | dB, dBm | Signal strength |
| `SOUND_PRESSURE` | `sound_pressure` | dB, dBA | Sound pressure |
| `SPEED` | `speed` | mm/s, in/s, ft/s, m/s, m/min, km/h, mph, kn, Beaufort, mm/h, mm/d, in/h, in/d | Speed |
| `SULPHUR_DIOXIDE` | `sulphur_dioxide` | ppb, μg/m³ | Sulphur dioxide concentration |
| `TEMPERATURE` | `temperature` | °C, °F, K | Temperature |
| `TEMPERATURE_DELTA` | `temperature_delta` | °C, °F, K | The difference between two temperatures |
| `VOLATILE_ORGANIC_COMPOUNDS` | `volatile_organic_compounds` | μg/m³, mg/m³ | Volatile organic compounds, as a concentration |
| `VOLATILE_ORGANIC_COMPOUNDS_PARTS` | `volatile_organic_compounds_parts` | ppb, ppm | Volatile organic compounds, as a ratio |
| `VOLTAGE` | `voltage` | μV, mV, V, kV, MV | Voltage |
| `VOLUME` | `volume` | mL, L, fl. oz., gal, m³, ft³, CCF, MCF | A volume used, like the fuel a car used |
| `VOLUME_FLOW_RATE` | `volume_flow_rate` | mL/s, L/s, L/min, L/h, m³/s, m³/min, m³/h, ft³/min, gal/min, gal/h, gal/d | A flow, like the water running through a pipe right now |
| `VOLUME_STORAGE` | `volume_storage` | Same as `VOLUME` | A volume stored, like the fuel in a tank |
| `WATER` | `water` | L, gal, m³, ft³, CCF, MCF | Water used |
| `WEIGHT` | `weight` | μg, mg, g, kg, oz, lb, st | Mass. It is called weight because that is the everyday word. |
| `WIND_DIRECTION` | `wind_direction` | ° | Wind direction. Report `None` when there is too little wind to measure a direction. |
| `WIND_SPEED` | `wind_speed` | mm/s, in/s, ft/s, m/s, m/min, km/h, mph, kn, Beaufort | Wind speed |

The allowed state classes per device class are in `DEVICE_CLASS_STATE_CLASSES` in `homeassistant/components/sensor/const.py`. Most allow only `measurement`. `AREA`, `DATA_SIZE`, `DISTANCE`, `DURATION`, and `PRECIPITATION` allow every state class, and `WEIGHT` allows `measurement`, `total`, and `total_increasing`. Device classes that count something up, like `ENERGY`, `GAS`, `WATER`, `VOLUME`, and `REACTIVE_ENERGY`, allow only `total` and `total_increasing`. `MONETARY` allows only `total`, and `WIND_DIRECTION` only `measurement_angle`.

## State classes

The [state class](/glossary/state-class/) says what kind of number the value is. Pick it with care: it decides which statistics Home Assistant keeps. The value column is what you put in YAML, for example as `state_class` of an [MQTT sensor](https://www.home-assistant.io/integrations/sensor.mqtt/) or a [template sensor](https://www.home-assistant.io/integrations/template/).

| State class | Value | Use it for |
| --- | --- | --- |
| `SensorStateClass.MEASUREMENT` | `measurement` | A value measured right now, like the current temperature or power. Not a forecast, and not an aggregate like yesterday's total. |
| `SensorStateClass.MEASUREMENT_ANGLE` | `measurement_angle` | A measurement right now of an angle in degrees, like the wind direction. |
| `SensorStateClass.TOTAL` | `total` | A total that can go up and down, like a net energy meter. |
| `SensorStateClass.TOTAL_INCREASING` | `total_increasing` | A total that only goes up and restarts from 0 now and then, like a daily gas meter. |

In most cases you want `MEASUREMENT`, or `TOTAL` without `last_reset`.

## Long-term statistics

A sensor with a state class gets long-term statistics, compiled every 5 minutes. For some device classes, the unit of the statistics is normalized, so sensors with different units fit in one graph.

- **Measurements** (`MEASUREMENT` and `MEASUREMENT_ANGLE`) get the minimum, maximum, and mean of each period.
- **Totals** (`TOTAL` and `TOTAL_INCREASING`) get a running `sum`. The value when statistics are first compiled is the zero point.

### Choosing between total classes

- The value never resets, like the lifetime energy use of a device: `TOTAL`, without `last_reset`.
- The value only goes up, and sometimes resets to 0, like an energy meter aligned with a billing month: `TOTAL_INCREASING`.
- The value goes up and down, and resets at known moments, like net energy per billing month: `TOTAL`, and update `last_reset` when it resets.
- Every update is a new period, like the energy used in the last minute: `TOTAL`, and update `last_reset` with every state change.

With `TOTAL`, the sum grows by the difference between the new and the old value. When `last_reset` changes, a new cycle starts from 0: the first value after the reset is added in full. At 16:00 below, the 3 already counts.

| Time | State | `last_reset` | Sum |
| --- | --- | --- | --- |
| 13:00 | 1000 | 13:00 | 0 |
| 14:00 | 1010 | 13:00 | 10 |
| 15:00 | 1005 | 13:00 | 5 |
| 16:00 | 3 | 16:00 | 8 |
| 17:00 | 8 | 16:00 | 13 |

With `TOTAL_INCREASING`, a drop in value starts a new meter cycle, and that cycle also counts from 0, so the first value after the drop is added in full. A drop of less than 10% is treated as noise, not as a reset. Make sure a value you calculate from noisy readings cannot drop by mistake.

| Time | State | Sum |
| --- | --- | --- |
| 13:00 | 1000 | 0 |
| 14:00 | 1010 | 10 |
| 15:00 | 2 | 12 |
| 16:00 | 7 | 17 |

### Moving to a supported unit

If your integration used a custom unit string and moves to a supported unit, statistics see that as a unit change and stop compiling for that sensor. To avoid that, add a `recorder.py` platform to your integration with an `async_custom_equivalent_units` function. It returns, per entity ID, which old unit equals which supported unit.

```python
from homeassistant.const import UnitOfEnergy
from homeassistant.core import HomeAssistant, callback


@callback
def async_custom_equivalent_units(
    hass: HomeAssistant,
) -> dict[str, dict[str | None, str]]:
    """Return custom equivalent units per entity ID."""
    return {
        "sensor.example_energy": {"KWh": UnitOfEnergy.KILO_WATT_HOUR},
    }
```

## Methods

A sensor has no actions, so there is nothing to implement beyond keeping `native_value` current. Fetch data in `update` or `async_update`, or push it with `async_write_ha_state`. See [updating state](/core/entities/state-updates/).

## States

The state is `native_value`, converted to the unit shown to the user. Dates and timestamps are written as ISO 8601 strings, and timestamps are converted to UTC. A `None` value shows as `unknown`.

## Example

A temperature sensor that reads its value from a device:

```python
from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.const import UnitOfTemperature


class ExampleTemperatureSensor(SensorEntity):
    """Temperature of an example device."""

    _attr_has_entity_name = True
    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS
    _attr_suggested_display_precision = 1

    def __init__(self, device: ExampleDevice) -> None:
        """Initialize the sensor."""
        self._device = device
        self._attr_unique_id = f"{device.serial}_temperature"

    async def async_update(self) -> None:
        """Fetch the latest temperature."""
        self._attr_native_value = await self._device.get_temperature()
```

The sensor has no name, so it is named after its device class: "Temperature".

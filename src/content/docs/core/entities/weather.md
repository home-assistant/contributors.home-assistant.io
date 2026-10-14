---
title: Weather entity
description: Report the current weather conditions and serve daily, hourly, or twice daily forecasts.
sidebarLabel: Weather
sidebarGroup: Sensors and status
---

A weather entity reports the current weather at a location: the condition, the temperature, and readings like humidity and wind. It can also serve forecasts. Inherit from `WeatherEntity`, imported from `homeassistant.components.weather`. If you use a [coordinator](/glossary/coordinator/), inherit from `CoordinatorWeatherEntity` or `SingleCoordinatorWeatherEntity` instead (see [using coordinators](#using-coordinators)).

To see how the frontend shows a weather entity, see the [weather more-info view](/design/more-info/weather/).

## Properties

Set every value in its _native_ unit, and tell Home Assistant which unit that is. The base class converts the values to the unit system of the user, or to the units the user picked in the entity settings.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `condition` | `str \| None` | `None` | The current condition. This is the state. Use one of the [conditions](#conditions). |
| `native_temperature` | `float \| None` | `None` | The current temperature. |
| `native_temperature_unit` | `str \| None` | `None` | The unit of all temperatures: °C or °F. |
| `native_apparent_temperature` | `float \| None` | `None` | The current apparent (feels like) temperature. |
| `native_dew_point` | `float \| None` | `None` | The dew point. |
| `humidity` | `float \| None` | `None` | The relative humidity, in %. |
| `native_pressure` | `float \| None` | `None` | The air pressure. |
| `native_pressure_unit` | `str \| None` | `None` | The unit of the pressure: hPa, kPa, mbar, inHg, or mmHg. Set it whenever you set `native_pressure`. |
| `native_wind_speed` | `float \| None` | `None` | The wind speed. |
| `native_wind_gust_speed` | `float \| None` | `None` | The wind gust speed. |
| `native_wind_speed_unit` | `str \| None` | `None` | The unit of both wind speeds: Beaufort, ft/s, km/h, kn, m/s, or mph. Set it whenever you set a wind speed. |
| `wind_bearing` | `float \| str \| None` | `None` | The wind direction, in degrees or as a 1 to 3 letter compass direction. |
| `native_visibility` | `float \| None` | `None` | The visibility. |
| `native_visibility_unit` | `str \| None` | `None` | The unit of the visibility: km or mi. Set it whenever you set `native_visibility`. |
| `native_precipitation_unit` | `str \| None` | `None` | The unit of precipitation in forecasts: mm or in. |
| `cloud_coverage` | `int \| None` | `None` | The cloud coverage, in %. |
| `uv_index` | `float \| None` | `None` | The UV index. |
| `ozone` | `float \| None` | `None` | The ozone level. |
| `precision` | `float` | Tenths for °C, whole numbers for °F | The precision of temperatures, after conversion. |

When a `native_*_unit` is `None`, the base class assumes the value is already in the default unit of the user's unit system, and converts from that unit when the user picked another one for the entity. So set the unit for every kind of value you report.

The generic properties every entity has, like `name` or `available`, are on [the entity class](/core/entities/entity-class/). In practice, every weather entity sets at least `condition`, `native_temperature`, and `native_temperature_unit`.

## Supported features

Each forecast type is a flag in `WeatherEntityFeature`. Combine them with `|`, and implement the method that goes with each one.

| Feature | Method to implement |
| --- | --- |
| `FORECAST_DAILY` | `async_forecast_daily` |
| `FORECAST_HOURLY` | `async_forecast_hourly` |
| `FORECAST_TWICE_DAILY` | `async_forecast_twice_daily` |

See [supported features](/glossary/supported-features/) for how flags work in general.

## Conditions

Use one of these values for `condition`. They are translated and get a matching icon in the frontend, so your integration does not need to translate them.

| Condition | Meaning |
| --- | --- |
| `clear-night` | Clear night |
| `cloudy` | Many clouds |
| `exceptional` | Exceptional |
| `fog` | Fog |
| `hail` | Hail |
| `lightning` | Lightning or thunderstorms |
| `lightning-rainy` | Lightning or thunderstorms, and rain |
| `partlycloudy` | A few clouds |
| `pouring` | Pouring rain |
| `rainy` | Rain |
| `snowy` | Snow |
| `snowy-rainy` | Snow and rain |
| `sunny` | Sunshine |
| `windy` | Wind |
| `windy-variant` | Wind and clouds |

They are available as `ATTR_CONDITION_*` constants in `homeassistant.components.weather`, like `ATTR_CONDITION_SUNNY`.

## Forecasts

Forecasts are not part of the state. Consumers like the frontend subscribe to them over a separate API, and the `weather.get_forecasts` action returns them. The base class converts forecast values to the user's units, just like the current values.

### The `Forecast` dictionary

Each forecast method returns a list of `Forecast` dictionaries, in native units:

| Key | Type | Description |
| --- | --- | --- |
| `datetime` | `str` | Required. The time of the forecast, in UTC, as an RFC 3339 string. |
| `is_daytime` | `bool \| None` | Whether this is the day or the night part. Required for twice daily forecasts. |
| `condition` | `str \| None` | The condition. |
| `native_temperature` | `float \| None` | The (high) temperature. |
| `native_templow` | `float \| None` | The low temperature. |
| `native_apparent_temperature` | `float \| None` | The apparent temperature. |
| `native_dew_point` | `float \| None` | The dew point. |
| `humidity` | `float \| None` | The relative humidity, in %. |
| `native_pressure` | `float \| None` | The air pressure. |
| `native_precipitation` | `float \| None` | The amount of precipitation. |
| `precipitation_probability` | `int \| None` | The chance of precipitation, in %. |
| `native_wind_speed` | `float \| None` | The wind speed. |
| `native_wind_gust_speed` | `float \| None` | The wind gust speed. |
| `wind_bearing` | `float \| str \| None` | The wind direction. |
| `cloud_coverage` | `int \| None` | The cloud coverage, in %. |
| `uv_index` | `float \| None` | The UV index. |

The units are the same `native_*_unit` properties as for the current values.

### Updating forecasts

Cache the forecasts you fetch, so you do not call the API every time someone asks. When you have new forecast data, await `self.async_update_listeners(None)` to push it to every subscriber, or pass a list of forecast types, like `["daily"]`, to push only those. When nobody is subscribed, it does not call your forecast methods at all.

### Using coordinators

`CoordinatorWeatherEntity` connects a weather entity to [coordinators](/glossary/coordinator/): one for the current observation, and optionally one per forecast type. Pass them to `__init__` as `daily_coordinator`, `hourly_coordinator`, and `twice_daily_coordinator`. Instead of the async forecast methods, you implement the callbacks `_async_forecast_daily`, `_async_forecast_hourly`, and `_async_forecast_twice_daily`, which read from coordinator data. Listeners are updated when a coordinator updates.

The forecast coordinators must be a `TimestampDataUpdateCoordinator`. The entity only listens to a forecast coordinator while someone is subscribed to that forecast type. When a forecast is requested and the data of its coordinator is older than its `update_interval`, the entity refreshes the coordinator first. Pass `daily_forecast_valid`, `hourly_forecast_valid`, or `twice_daily_forecast_valid` to `__init__` to set how old a forecast may get before the entity returns `None` instead. It defaults to the `update_interval` of the coordinator. A coordinator without an `update_interval`, like one that only receives pushed data, skips both checks: the entity never refreshes it and never rejects its forecast as too old.

`SingleCoordinatorWeatherEntity` is the shortcut for one coordinator that holds both the observation and the forecasts.

## Methods

### Forecasts

```python
async def async_forecast_daily(self) -> list[Forecast] | None:
async def async_forecast_hourly(self) -> list[Forecast] | None:
async def async_forecast_twice_daily(self) -> list[Forecast] | None:
```

Implement only the ones you declared in the supported features. There are no sync variants.

## States

The state is `condition`. The current values become state attributes, in the units of the user. Do not set `state` yourself.

## Example

A weather entity with a daily forecast:

```python
from homeassistant.components.weather import (
    Forecast,
    WeatherEntity,
    WeatherEntityFeature,
)
from homeassistant.const import UnitOfSpeed, UnitOfTemperature


class ExampleWeather(WeatherEntity):
    """Weather from an example service."""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_native_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_native_wind_speed_unit = UnitOfSpeed.METERS_PER_SECOND
    _attr_supported_features = WeatherEntityFeature.FORECAST_DAILY

    def __init__(self, client: ExampleClient, location_id: str) -> None:
        """Initialize the weather entity."""
        self._client = client
        self._attr_unique_id = location_id

    async def async_update(self) -> None:
        """Fetch the current weather."""
        current = await self._client.get_current()
        self._attr_condition = current.condition
        self._attr_native_temperature = current.temperature
        self._attr_native_wind_speed = current.wind_speed

    async def async_forecast_daily(self) -> list[Forecast] | None:
        """Return the daily forecast."""
        days = await self._client.get_daily_forecast()
        return [
            Forecast(
                datetime=day.date.isoformat(),
                condition=day.condition,
                native_temperature=day.high,
                native_templow=day.low,
            )
            for day in days
        ]
```

---
title: "Unused constants in homeassistant.const are deprecated"
description: "The device info constants and other constants in homeassistant.const that core no longer uses are deprecated, and will be removed in Home Assistant Core 2027.12."
date: 2026-11-25
authors:
  - epenet
areas:
  - core
---

As of Home Assistant Core 2026.12, a number of constants in `homeassistant.const` are deprecated, because Home Assistant Core no longer uses them. They will be removed in Home Assistant Core 2027.12. Until then, using one of them logs a warning. If your custom integration doesn't import any of the constants on this page, you don't need to do anything.

## Device info constants

These constants are deprecated:

- `ATTR_CONFIGURATION_URL`
- `ATTR_CONNECTIONS`
- `ATTR_DEFAULT_NAME`
- `ATTR_HW_VERSION`
- `ATTR_IDENTIFIERS`
- `ATTR_MANUFACTURER`
- `ATTR_MODEL`
- `ATTR_MODEL_ID`
- `ATTR_SERIAL_NUMBER`
- `ATTR_SUGGESTED_AREA`
- `ATTR_SW_VERSION`

Since Home Assistant Core 2026.11, [`DeviceInfo` is a dataclass with typed fields](/blog/2026/10/13/device-info-class/), so you can use its fields directly, without these constants.

### Migrating device info

Use the `DeviceInfo` keyword arguments and attributes instead. Each field has the same name as the value of its constant:

```python
# Old
device_info[ATTR_SW_VERSION] = "1.2.3"
model = device_info[ATTR_MODEL]

# New
device_info.sw_version = "1.2.3"
model = device_info.model
```

```python
# Old
device_registry.async_get_or_create(
    config_entry_id=entry.entry_id,
    **{
        ATTR_IDENTIFIERS: {(DOMAIN, unique_id)},
        ATTR_MANUFACTURER: "My manufacturer",
    },
)

# New
device_registry.async_get_or_create(
    config_entry_id=entry.entry_id,
    identifiers={(DOMAIN, unique_id)},
    manufacturer="My manufacturer",
)
```

There is one exception: `ATTR_DEFAULT_NAME`. The `default_name` field is deprecated too, and will be removed in Home Assistant Core 2027.9. Use `name` instead.

## Other unused constants

These constants have no replacement. Most of them belonged to features, options, or integrations that were removed a long time ago:

| Constant | Value |
| --- | --- |
| `ATTR_EDITABLE` | `"editable"` |
| `ATTR_HIDDEN` | `"hidden"` |
| `ATTR_NOW` | `"now"` |
| `ATTR_WAKEUP` | `"wake_up_interval"` |
| `CONF_COLOR_TEMP` | `"color_temp"` |
| `CONF_DISPLAY_CURRENCY` | `"display_currency"` |
| `CONF_FRIENDLY_NAME_TEMPLATE` | `"friendly_name_template"` |
| `CONF_UNIT_SYSTEM_IMPERIAL` | `"imperial"` |
| `CONF_UNIT_SYSTEM_METRIC` | `"metric"` |
| `ENTITY_CATEGORIES` | `["config", "diagnostic"]` |
| `ILLUMINANCE` | `"illuminance"` |
| `SERVICE_CLOSE` | `"close"` |
| `SPEED` | `"speed"` |
| `URL_API_EVENTS_EVENT` | `"/api/events/{}"` |
| `URL_API_LOG_OUT` | `"/api/log_out"` |
| `URL_API_SERVICES_SERVICE` | `"/api/services/{}/{}"` |
| `URL_API_STATES_ENTITY` | `"/api/states/{}"` |
| `URL_ROOT` | `"/"` |

## Migrating your own data

If your integration uses one of these constants for its own data, like a configuration option or a state attribute, use a plain string or a local constant instead:

```python
# Old
from homeassistant.const import ATTR_MODEL

ATTRIBUTES = {ATTR_MODEL: "My model"}

# New
ATTR_MODEL = "model"

ATTRIBUTES = {ATTR_MODEL: "My model"}
```

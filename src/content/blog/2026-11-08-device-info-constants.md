---
title: "Device info constants are deprecated"
description: "The device info constants in homeassistant.const are deprecated and will be removed in Home Assistant Core 2027.12. Use the DeviceInfo fields or keyword arguments instead."
date: 2026-11-08
authors:
  - epenet
areas:
  - core
---

As of Home Assistant Core 2026.12, the device info constants in `homeassistant.const` are deprecated. They will be removed in Home Assistant Core 2027.12. Until then, using one of them logs a warning. If your custom integration doesn't import any of these constants, you don't need to do anything:

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

## Migrating device info

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

## Migrating your own data

If you used one of these constants for your own data, like a state attribute, use a plain string or a local constant instead:

```python
# Old
from homeassistant.const import ATTR_MODEL

ATTRIBUTES = {ATTR_MODEL: "My model"}

# New
ATTR_MODEL = "model"

ATTRIBUTES = {ATTR_MODEL: "My model"}
```

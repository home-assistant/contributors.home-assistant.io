---
title: "Dict-style access to device info is deprecated"
description: "Using a DeviceInfo or ChildDeviceInfo like a dict is deprecated in Home Assistant Core 2026.12 and will stop working in 2027.12. Read and set the attributes instead."
date: 2026-11-13
authors:
  - epenet
areas:
  - core
---

As of Home Assistant Core 2026.12, using a `DeviceInfo` or `ChildDeviceInfo` like a dict is deprecated. It will stop working in Home Assistant Core 2027.12. Until then, it logs a warning. These uses are deprecated:

- Reading or setting a field by key, like `device_info["name"]`
- Testing a field with `in`
- `get()`, `keys()`, `items()`, and `update()`
- `dict(device_info)` and `**device_info` unpacking
- Comparing a device info with a plain dict
- The `__required_keys__` and `__optional_keys__` attributes

Since Home Assistant Core 2026.11, [`DeviceInfo` is a dataclass with typed fields](/blog/2026/10/13/device-info-class/). The dict-style access was kept as a compatibility layer, and Home Assistant Core no longer uses it. If your custom integration already reads and sets device info fields as attributes, you don't need to do anything.

To check whether you are affected, search your logs for `which is deprecated as device infos are dataclasses`. Each warning names the use it found, and what to use instead.

`as_dict()`, comparing two device infos, and the representation of a device info are not deprecated. An entity can also still return a plain dict as its `device_info`: only a `DeviceInfo` or `ChildDeviceInfo` used like a dict is affected. Bluetooth data updates are the exception: [plain device info dicts are deprecated there](/blog/2026/11/10/bluetooth-plain-device-info/).

## Reading and setting fields

Read and set the attributes instead:

```python
# Old
device_info["sw_version"] = "1.2.3"
name = device_info["name"]
model = device_info.get("model")

# New
device_info.sw_version = "1.2.3"
name = device_info.name
model = device_info.model
```

A field which has not been set reads as `UNDEFINED`, where `get()` returned `None`. To test whether a field is set, compare it with `UNDEFINED`, instead of using `in`:

```python
from homeassistant.helpers.typing import UNDEFINED

# Old
if "name" not in device_info:
    device_info["name"] = "My device"

# New
if device_info.name is UNDEFINED:
    device_info.name = "My device"
```

Set each field, instead of using `update()`:

```python
# Old
device_info.update({"model": "My model", "manufacturer": "My manufacturer"})

# New
device_info.model = "My model"
device_info.manufacturer = "My manufacturer"
```

## Getting the fields which are set

Use `as_dict()`, instead of `keys()`, `items()`, or `dict(device_info)`. It returns the fields which are set:

```python
# Old
data = dict(device_info)

# New
data = device_info.as_dict()
```

To register a device from a device info, pass it to `async_get_or_create_from_info`, or to `async_get_or_create_child_from_info` for a `ChildDeviceInfo`, instead of unpacking it:

```python
# Old
device_registry.async_get_or_create(
    config_entry_id=entry.entry_id, **device_info
)

# New
device_registry.async_get_or_create_from_info(
    config_entry_id=entry.entry_id, device_info=device_info
)
```

## Comparing with a dict

Comparing a device info with a plain dict is deprecated. This is common in tests. Compare `as_dict()` instead, or compare with another `DeviceInfo`:

```python
# Old
assert device_info == {"identifiers": {(DOMAIN, "1234")}, "name": "My device"}

# New
assert device_info == DeviceInfo(
    identifiers={(DOMAIN, "1234")}, name="My device"
)
```

## Checking which fields exist

`__required_keys__` and `__optional_keys__` come from the time `DeviceInfo` was a `TypedDict`. To check which fields a device info has, for example to support older Home Assistant versions, use `dataclasses.fields()`:

```python
import dataclasses

# Old
has_via_device_id = "via_device_id" in DeviceInfo.__optional_keys__

# New
has_via_device_id = "via_device_id" in {
    field.name for field in dataclasses.fields(DeviceInfo)
}
```

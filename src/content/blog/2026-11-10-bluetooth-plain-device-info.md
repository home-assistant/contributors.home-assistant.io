---
title: "Plain device info dicts are deprecated in Bluetooth data updates"
description: "Passing a plain dict as a device info in PassiveBluetoothDataUpdate will stop working in Home Assistant Core 2027.12. Here is what to change, and how to keep advertisements fast."
date: 2026-11-10
authors:
  - epenet
areas:
  - core
---

As of Home Assistant Core 2026.12, passing a plain dict as a device info in `PassiveBluetoothDataUpdate(devices=...)` is deprecated. It will stop working in Home Assistant Core 2027.12. Until then, Home Assistant converts the dict to a `DeviceInfo` and logs a warning.

This only concerns integrations that use a [Bluetooth processor coordinator](/core/integrations/bluetooth-data/#processor-coordinators), either `PassiveBluetoothProcessorCoordinator` or `ActiveBluetoothProcessorCoordinator`. If yours doesn't, you can stop reading here.

## What you need to change

Look at what your integration passes to `devices`:

| What you pass to `devices` | What to do |
| --- | --- |
| The result of `sensor_device_info_to_hass_device_info()`, unmodified | Nothing. It is already cached for you. |
| A `DeviceInfo` you build once or cache | Nothing. |
| A new `DeviceInfo` for every advertisement | Nothing is required, but [caching it](#why-caching-matters) is worth doing. |
| A plain dict | [Replace it](#replacing-a-plain-dict) before Home Assistant Core 2027.12. |
| The result of `sensor_device_info_to_hass_device_info()`, with fields changed | [Fix this now](#changing-the-result-of-the-helper). It has raised a `TypeError` since Home Assistant Core 2026.11. |

To check whether you are affected by the deprecation, search your logs for `passes a plain dict as a device info in a PassiveBluetoothDataUpdate`. The warning is logged the first time an update with a plain dict arrives, so your device needs to have sent an advertisement. You won't get it for every advertisement.

## Replacing a plain dict

A `DeviceInfo` in place of the dict is all the deprecation asks for. We recommend also caching it, in a function that takes the values that can change:

```python
from functools import lru_cache

from homeassistant.helpers.device_registry import DeviceInfo


# Old
def sensor_update_to_bluetooth_data_update(
    parsed: ExampleUpdate,
) -> PassiveBluetoothDataUpdate:
    return PassiveBluetoothDataUpdate(
        devices={
            None: {
                "name": parsed.name,
                "manufacturer": "Acme",
                "model": parsed.model,
            }
        },
        ...
    )


# New
@lru_cache(maxsize=64)
def _device_info(name: str, model: str) -> DeviceInfo:
    return DeviceInfo(name=name, manufacturer="Acme", model=model)


def sensor_update_to_bluetooth_data_update(
    parsed: ExampleUpdate,
) -> PassiveBluetoothDataUpdate:
    return PassiveBluetoothDataUpdate(
        devices={None: _device_info(parsed.name, parsed.model)},
        ...
    )
```

The conversion quietly drops keys that are not device info fields, but `DeviceInfo(...)` raises a `TypeError` on them. If your dict has any, remove them when you migrate.

## Why caching matters

A device can send many advertisements per second, and each one goes through your code and through `PassiveBluetoothDataUpdate.update()`, which compares the device info with the one it has stored. If both are the same object, that check is over immediately. If they aren't, it compares every field, even though almost every advertisement carries the same values.

A plain dict is the slow way around this: it becomes a new `DeviceInfo` for every advertisement, so it never passes the quick check.

Here is what that looked like for a thermometer with four entities, measured while [`DeviceInfo` became a dataclass](https://github.com/home-assistant/core/pull/180251). The machine was slow, so compare the ratios and not the absolute numbers:

| Device info, per unchanged advertisement | Time for the whole update |
| --- | --- |
| Cached, using `sensor_device_info_to_hass_device_info()` | About 6.7 µs |
| A new `DeviceInfo(...)` | About 9.3 µs |
| A copy of the cached one, with `sw_version` set | About 12.4 µs |

These are microseconds, so a single device won't make a difference you can notice. They do add up, because Home Assistant does this for every device in range. A cached `DeviceInfo` of your own passes the same quick check as the one from the helper.

When you cache a device info yourself, keep these in mind:

- The same object is shared by every advertisement with those values, so don't change it after your function returns it. `PassiveBluetoothProcessorEntity` copies the fields it needs, so the framework leaves it alone too.
- Pass every value that can change as an argument, or a change won't reach the device registry. Arguments of an `lru_cache` function must be hashable. Strings are, but sets aren't, so build `connections` and `identifiers` inside the function.
- Set `maxsize` above the number of different devices you expect. With more devices than that, entries keep getting evicted, and you pay for rebuilding them.

> [!IMPORTANT]
> `sensor_device_info_to_hass_device_info()` leaves values that are `None` unset. `DeviceInfo(name=None)` does not: it sets the name to `None`, and your entity loses its fallback to the coordinator name. If a value can be `None`, only set the field when it has a value.

## Changing the result of the helper

`sensor_device_info_to_hass_device_info()` [returns a shared, read-only device info](/blog/2026/10/13/device-info-class/#modifying-a-converted-sensor-device-info), so setting a field on it raises a `TypeError`. The error message suggests copying it first. That works, but doing it for every advertisement is the slowest option in the table above. Build and cache your own instead, with the extra fields as arguments:

```python
# Old: raises a TypeError
device_info = sensor_device_info_to_hass_device_info(parsed.device_info)
device_info.sw_version = parsed.sw_version


# New
@lru_cache(maxsize=64)
def _device_info(
    name: str, manufacturer: str, model: str, sw_version: str
) -> DeviceInfo:
    return DeviceInfo(
        name=name,
        manufacturer=manufacturer,
        model=model,
        sw_version=sw_version,
    )


device_info = _device_info(
    parsed.device_info.name,
    parsed.device_info.manufacturer,
    parsed.device_info.model,
    parsed.sw_version,
)
```

A new firmware version gives you a different object with a different `sw_version`, so `update()` still sees the device change.

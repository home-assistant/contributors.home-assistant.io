---
title: "ScannerEntity now handles devices like other entities"
description: As of Home Assistant Core 2026.11, the integration decides which device a ScannerEntity is included in, like for any other entity, and a ScannerEntity is disabled by default.
date: 2026-10-28
authors:
  - Erik Montnémery
areas:
  - core
---

As of Home Assistant Core 2026.11, `ScannerEntity`, the base class for device trackers of clients seen by a router or another network scanner, has fewer special rules. It now handles devices like any other entity, and it is disabled by default.

## Devices work like for any other entity

Until now, the `device_info` of a `ScannerEntity` was final and always `None`. The base class added a device for the MAC address of the tracker itself, but only once another integration had registered a device with the same MAC address. A tracker created before that got an entity ID without the device name, and kept it. A tracker the user enabled only got a device once another integration knew its MAC address.

Now, `device_info` is no longer final. Set `_attr_device_info` to include the tracker in a device, like for any other entity. To include it in a device for the tracked client, use the MAC address of the client as connection.

Until Home Assistant Core 2028.11, the base class still sets device info for a tracker that has a MAC address but no device info: a device with the MAC address as connection, named after the hostname, or after the MAC address when the device is new. Starting with 2028.11, a tracker without device info is not included in a device.

If your tracker should not be included in a device, set `_attr_device_info = DeviceInfo()` during the deprecation period. An empty device info means no device, and the default only applies when the device info is `None`, so the base class leaves your tracker alone.

## A tracker that is the main feature of its device has no name

When the tracker is the main feature of its device, like a tracker for a client of a router in a device for that client, a name of its own gives a doubled name, like `device_tracker.printer_printer`. That also applies to a tracker that gets the default device info from the base class, because that device is named after the client. Give such a tracker no name, and put the name of the client on the device instead:

```python
class ExampleClientTracker(ScannerEntity):
    """A client connected to an example router."""

    _attr_has_entity_name = True
    _attr_name = None

    def __init__(self, client: ExampleClient) -> None:
        """Initialize the tracker."""
        self._attr_mac_address = client.mac
        self._attr_hostname = client.hostname
        self._attr_device_info = DeviceInfo(
            connections={(CONNECTION_NETWORK_MAC, client.mac)}, name=client.name
        )
```

When the name of the client changes while Home Assistant runs, rename the device with `async_update_device`. Code in the tracker only runs while it is enabled; a disabled tracker gets the current name on its device the next time the integration is set up.

## Trackers are disabled by default

A `ScannerEntity` is now always disabled by default. Before, it was enabled when its MAC address belonged to a device of another integration, and a disabled tracker was enabled when such a device showed up later. Both rules are gone. The devices users most want to track, like phones, are usually tracked with the Home Assistant Companion app, which does not report a MAC address, so the rules rarely helped. Trackers that already exist keep their state.

Override `_attr_entity_registry_enabled_default` when the tracker is not just another client seen on a network. For example, when tracking is the purpose of the device, like for the Zigbee presence tags that ZHA models as device trackers, or when the user set up the tracked device on its own.

## What to change in your integration

- Set `_attr_device_info` for the device you want the tracker in. For a device for the tracked client, use the MAC address of the client as connection and the name of the client as `name`. Do not rely on the default device info from the base class, it will be removed in 2028.11. To keep the tracker out of a device, set `_attr_device_info = DeviceInfo()`.
- When the tracker is the main feature of its device, remove the name of the tracker: an `_attr_name`, or a `name` property.
- When the name of the client changes at runtime, rename the device.
- When your integration reads `original_name` from the entity registry entry of a tracker, like to restore clients that are offline at startup, read the name of the device instead: `original_name` is `None` for a tracker without a name.
- When a base class of your tracker sets `_attr_device_info` for another device, like the router, check that you want the tracker in that device. It was ignored before, and now includes the tracker in that device.

Read more about [`ScannerEntity`](/core/entities/device-tracker/#scannerentity), or see how the core integrations were migrated in [core PR #188883](https://github.com/home-assistant/core/pull/188883).

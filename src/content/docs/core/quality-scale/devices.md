---
title: Create devices
description: "Gold rule devices: entities are grouped in devices, with complete device information."
sidebarLabel: devices
sidebarGroup: Gold
order: 1
---

This is a Gold rule. In `quality_scale.yaml`, it is called `devices`.

The integration creates [devices](/glossary/device/) and adds its entities to them. A device stands for one physical device, or for one service. Fill in the device information as completely as the integration can: name, manufacturer, model, serial number, software and hardware versions, and the connections and identifiers that make the device recognizable.

## Why it matters

People think in devices, not in entities. They add a thermostat or a weather service to Home Assistant, not a list of sensors. Devices group those entities in one place, with a device page that shows what the device is and which firmware it runs.

Complete device information pays off elsewhere too. The serial number and model help users and support find the right device, and connections like a MAC address let other integrations and discovery recognize the same device.

## Example

Set `_attr_device_info` on the entity. Entities with the same identifiers end up on the same device:

```python
class MySensor(SensorEntity):
    """A sensor of My device."""

    _attr_has_entity_name = True

    def __init__(self, device: MyDevice) -> None:
        """Initialize the sensor."""
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, device.serial)},
            connections={(CONNECTION_NETWORK_MAC, device.mac)},
            name=device.name,
            manufacturer="My Company",
            model="My Sensor",
            model_id="ABC-123",
            serial_number=device.serial,
            sw_version=device.firmware,
            hw_version=device.revision,
        )
```

A device that sits behind a hub can point to the hub with `via_device_id`, the device registry ID of the hub. When the device is a service instead of a physical device, like a weather service or a cloud account, add `entry_type=DeviceEntryType.SERVICE`.

Most integrations set the device information once, in a shared base entity in `entity.py`. See [common-modules](/core/quality-scale/common-modules/).

## How it is checked

Checked in review. `DeviceInfo` is a dataclass with typed fields, so mypy catches unknown fields when the integration is typed.

## Exceptions

There are no exceptions to this rule.

## Related rules

- [has-entity-name](/core/quality-scale/has-entity-name/): use has_entity_name.

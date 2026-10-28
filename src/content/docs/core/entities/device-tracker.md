---
title: Device tracker entity
description: Report where a device is, either by its position or by whether it is connected to a network or beacon.
sidebarLabel: Device tracker
sidebarGroup: Sensors and status
---

A device tracker reports presence: whether a phone, a tag, or a car is home, away, or in a [zone](/glossary/zone/). It is read-only. There are three base classes, all imported from `homeassistant.components.device_tracker`, and you pick one by how your device knows where it is:

- `TrackerEntity`: the device reports its position, as GPS coordinates or as the zones it is in. Like a phone app or a car.
- `ScannerEntity`: the device is seen on the local IP network, and is identified by its MAC address. Like a router that lists connected clients.
- `BaseScannerEntity`: the device is connected or not, without the MAC address assumptions of `ScannerEntity`. Like a Bluetooth beacon.

All three get the `diagnostic` [entity category](/glossary/entity-category/) by default, and set the `tracking_type` capability attribute: `position` for `TrackerEntity`, `connection` for the scanners.

## Properties

The generic properties every entity has, like `name` or `available`, are on [the entity class](/core/entities/entity-class/).

### All device trackers

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `source_type` | `SourceType` | Required for `BaseScannerEntity`. `SourceType.GPS` for `TrackerEntity`, `SourceType.ROUTER` for `ScannerEntity` | How the device is tracked: `GPS`, `ROUTER`, `BLUETOOTH`, or `BLUETOOTH_LE`. |

The `battery_level` property is deprecated and stops working in Home Assistant 2027.7. Report the battery level with a [sensor](/core/entities/sensor/) with the `battery` device class.

### `TrackerEntity`

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `latitude` | `float \| None` | `None` | The latitude of the device. |
| `longitude` | `float \| None` | `None` | The longitude of the device. |
| `location_accuracy` | `float` | `0` | The accuracy of the location, in meters. |
| `in_zones` | `list[str] \| None` | `None` | The entity IDs of the zones the device is in, passive zones included. When set, even to an empty list, it takes precedence over the coordinates. The order does not matter: the base class sorts the list by zone radius and drops zones that do not exist. |

Set either `in_zones` or `latitude` and `longitude`. Without `in_zones`, the base class works out the zones from the coordinates and the accuracy. The `location_name` property is deprecated and stops working in Home Assistant 2027.7.

A `TrackerEntity` does not poll by default, and every update is written to the state machine, even when nothing changed.

### `BaseScannerEntity`

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `is_connected` | `bool \| None` | Required | Whether the device is connected. |

### `ScannerEntity`

`ScannerEntity` builds on `BaseScannerEntity`, so it also needs `is_connected`.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `mac_address` | `str \| None` | `None` | The MAC address of the device. It is also the unique ID of the entity. |
| `ip_address` | `str \| None` | `None` | The IP address of the device. |
| `hostname` | `str \| None` | `None` | The hostname of the device. |

A `ScannerEntity` behaves differently from most entities, because it is keyed on the MAC address:

- Its unique ID is the MAC address. You do not set one yourself.
- You do not provide device info: `device_info` is final. Instead, once a device with the same MAC address is in the [device registry](/core/entities/registry/), Home Assistant creates a device for your config entry with that MAC address as connection, and links the entity to it. The device is linked before the entity is registered, so a new entity ID is based on the device name.
- `name` is final: set the name with `_attr_name` or an [entity description](/glossary/entity-description/). How Home Assistant uses it depends on the resulting `device_info` from above:
  - When `device_info` got set, the tracker is named after the device. Your name is used as the device's name; an existing device is never renamed to its MAC address.
  - When `device_info` is `None`, the tracker is named with your name.

  In both cases, without a name the hostname is used, then the MAC address.
- It is enabled by default when its MAC address belongs to a known device, or when it has no MAC address. Trackers for every other client on the network start disabled, so a router does not flood the user with entities. When a device with that MAC address shows up in the device registry later, Home Assistant enables the tracker. That only happens when the integration disabled the tracker, not the user, and when the user did not turn off new entities for the config entry.
- When you set the MAC address and IP address, DHCP discovery uses them, with the hostname when you set one, to discover integrations for the device. That happens when Home Assistant sets up the entity while the device is connected, even when the tracker is disabled. DHCP discovery also looks at trackers with the `router` source type that are `home`: once when DHCP discovery starts, and when such a tracker gets its first state. A tracker that changes from `not_home` to `home` later does not trigger this.

## Supported features

This entity has no supported features.

## Methods

There are no methods to implement. Keep the properties current, by polling in `update` or `async_update`, or by pushing with `async_write_ha_state`. See [updating state](/core/entities/state-updates/).

## States

The base classes set the state. Do not set `state` yourself.

| State | `TrackerEntity` | Scanners |
| --- | --- | --- |
| `home` | The first active zone is the home zone. | Connected, and the associated zone is home. |
| `not_home` | No active zone. | Not connected. |
| A zone name | The first active zone is another zone. | Connected, and the associated zone is another zone. |
| `unknown` | No coordinates and no `in_zones`. | `is_connected` is `None`, or the associated zone does not exist. |

A scanner is associated with the home zone by default. Users can pick another zone in the entity settings, like the office for a beacon there. When that zone is removed, Home Assistant raises a [repair](/glossary/repair/) issue.

The `in_zones` state attribute lists the zones the device is in, smallest first. When the zones are worked out from coordinates, zones of the same size are sorted by the distance to their center, closest first. A scanner lists its associated zone and the zones that contain it. When the scanner is not connected, `in_zones` is an empty list.

## Example

A tracker for a car that reports its GPS position:

```python
from homeassistant.components.device_tracker import TrackerEntity


class ExampleCarTracker(TrackerEntity):
    """Location of an example car."""

    _attr_has_entity_name = True
    _attr_translation_key = "location"

    def __init__(self, car: ExampleCar) -> None:
        """Initialize the tracker."""
        self._car = car
        self._attr_unique_id = f"{car.vin}_location"

    async def async_added_to_hass(self) -> None:
        """Subscribe to position updates."""
        self.async_on_remove(self._car.subscribe(self._update))

    def _update(self) -> None:
        """Handle a new position from the car."""
        self._attr_latitude = self._car.latitude
        self._attr_longitude = self._car.longitude
        self._attr_location_accuracy = self._car.accuracy
        self.async_write_ha_state()
```

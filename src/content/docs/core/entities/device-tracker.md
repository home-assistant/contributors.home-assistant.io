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

A `ScannerEntity` is keyed on the MAC address, and has a few defaults of its own:

- Its unique ID is the MAC address. You do not set one yourself.
- Until Home Assistant Core 2027.5, the base class sets device info for a tracker that has a MAC address but no device info: a device with the MAC address as connection, named after the hostname, or after the MAC address when the device is new. The MAC address never replaces the name of an existing device. Do not rely on it: starting with 2027.5, a tracker without device info is not included in a device, like any other entity. To keep a tracker out of a device until then, set `_attr_device_info = DeviceInfo()`. An empty device info means no device, and the default only applies when the device info is `None`.
- It is disabled by default. A router sees many clients, and most of them are not worth tracking: the devices users most want to track, like phones, are usually tracked with the Home Assistant Companion app instead. Override `_attr_entity_registry_enabled_default` when the tracker is not just another client seen on a network. For example, when tracking is the purpose of the device, like for the Zigbee presence tags that ZHA models as device trackers, or when the user set up the tracked device on its own.
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

A tracker for a client of a router, included in a device for the client. The client name goes on the device, and the device is renamed when the name changes on the router. That rename only happens while the tracker is enabled: Home Assistant does not add a disabled entity, so it gets no coordinator updates. The device info of a disabled tracker is still used each time the integration is set up, so its device gets the current name then.

```python
from homeassistant.components.device_tracker import ScannerEntity
from homeassistant.core import callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.device_registry import CONNECTION_NETWORK_MAC, DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity


class ExampleClientTracker(CoordinatorEntity[ExampleCoordinator], ScannerEntity):
    """A client connected to an example router."""

    _attr_has_entity_name = True
    _attr_name = None

    def __init__(self, coordinator: ExampleCoordinator, client: ExampleClient) -> None:
        """Initialize the tracker."""
        super().__init__(coordinator)
        self._attr_mac_address = client.mac
        self._attr_hostname = client.hostname
        self._attr_device_info = DeviceInfo(
            connections={(CONNECTION_NETWORK_MAC, client.mac)},
            name=client.name,
            via_device_id=coordinator.router_device_id,
        )

    @property
    def is_connected(self) -> bool:
        """Return if the client is connected to the router."""
        return self.mac_address in self.coordinator.data.connected

    @callback
    def _handle_coordinator_update(self) -> None:
        """Rename the device when the client is renamed on the router."""
        name = self.coordinator.data.clients[self.mac_address].name
        if name and (device := self.device_entry) and device.name != name:
            dr.async_get(self.hass).async_update_device(device.id, name=name)
        super()._handle_coordinator_update()
```

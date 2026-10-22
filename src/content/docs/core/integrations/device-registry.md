---
title: Device registry
description: Register the devices of your integration, link them to hubs, split products into child devices, and let users remove devices.
sidebarGroup: Devices and registries
order: 1
---

The device registry is where Home Assistant keeps track of [devices](/glossary/device/). A device groups the entities that belong together: a temperature and humidity sensor with a battery is one device with three entities. Users see devices on their own page, put them in areas, and target them in automations.

## What is a device

A device is a physical device with its own control unit, or a service. The control unit does not have to be smart, but it has to be in control of what happens.

- A thermostat with four room sensors is five devices: one for the thermostat with its built-in sensors, and one per room sensor.
- A sensor connected to another device to read its data is a separate device from that other device. The sensor could be moved to read another device.
- A product with several independent parts, like a power strip with separately switched outlets, can be split into a parent device with [child devices](#child-devices).

Devices belong to the config entry that registered them. A physical device that is set up by two integrations is two devices, one per config entry.

## Device properties

| Property | What it is |
| --- | --- |
| `id` | The ID Home Assistant generated for the device |
| `identifiers` | A set of `(DOMAIN, identifier)` tuples, like a serial number. Each one is unique within the config entry. |
| `connections` | A set of `(connection_type, value)` tuples, like a MAC address. Each one is unique within the config entry. The types are `CONNECTION_NETWORK_MAC`, `CONNECTION_BLUETOOTH`, `CONNECTION_UPNP`, and `CONNECTION_ZIGBEE`. |
| `config_entry_id` | The config entry the device belongs to |
| `config_subentry_id` | The [subentry](/core/integrations/subentries/) the device belongs to, or `None` |
| `name` | The name of the device |
| `name_by_user` | The name the user gave it |
| `manufacturer` | The manufacturer |
| `model` | The model name |
| `model_id` | The model identifier |
| `serial_number` | The serial number. Unlike a serial number in `identifiers`, it does not have to be unique. |
| `sw_version` | The firmware version |
| `hw_version` | The hardware version |
| `configuration_url` | Where the device or service can be configured. Use `homeassistant://<path>` to link to a page inside Home Assistant. |
| `entry_type` | `None`, or `DeviceEntryType.SERVICE` for a service |
| `via_device_id` | The device Home Assistant reaches this device through, like a hub |
| `parent_device_id` | For a child device: its parent. Only child devices (`ChildDeviceEntry`) have this attribute. The WebSocket API reports it as `null` for other devices. |
| `area_id` | The area the device is in |
| `labels` | The labels of the device |
| `disabled_by` | Who disabled the device, as a `DeviceEntryDisabler`, or `None` |
| `created_at`, `modified_at` | When the device was created and last changed. Managed by the registry. |

## Register a device through an entity

The usual way: give your entities a `device_info`. Home Assistant creates or updates the device when the entity is added. That only works for entities added from a config entry, with a [unique ID](/glossary/unique-id/).

```python
from homeassistant.helpers.device_registry import DeviceInfo


class ExampleEntity(CoordinatorEntity[ExampleCoordinator]):
    """Base entity of the Example integration."""

    _attr_has_entity_name = True

    def __init__(self, coordinator: ExampleCoordinator) -> None:
        """Initialize the entity."""
        super().__init__(coordinator)
        device = coordinator.data.device
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, device.serial_number)},
            manufacturer="Example",
            model=device.model_name,
            model_id=device.model_id,
            name=device.name,
            sw_version=device.firmware_version,
        )
```

`DeviceInfo` takes `identifiers`, `connections`, `name`, `manufacturer`, `model`, `model_id`, `serial_number`, `sw_version`, `hw_version`, `configuration_url`, `entry_type`, `suggested_area`, `via_device_id`, and `translation_key` with `translation_placeholders` for a translated name.

The registry looks for an existing device of the same config entry, by identifiers first and then by connections. One match is enough: the other identifiers and connections you pass are then added to that device. If they already belong to another device of the same config entry, that is a collision, and the registry raises an error.

## Register a device yourself

A device without entities, like a hub, is registered directly. Do this in `async_setup_entry`:

```python
from homeassistant.helpers import device_registry as dr

device_registry = dr.async_get(hass)

hub = device_registry.async_get_or_create(
    config_entry_id=entry.entry_id,
    connections={(dr.CONNECTION_NETWORK_MAC, dr.format_mac(info.mac))},
    identifiers={(DOMAIN, info.bridge_id)},
    manufacturer="Signify",
    model=info.model_name,
    model_id=info.model_id,
    name=info.name,
    sw_version=info.sw_version,
)
```

It returns the `DeviceEntry`, with its `id`.

When you already hold a `DeviceInfo`, for example one built by a helper or shared with your entities, pass it as it is to `async_get_or_create_from_info`:

```python
hub = device_registry.async_get_or_create_from_info(
    config_entry_id=entry.entry_id, device_info=hub_device_info
)
```

## Link devices to a hub

`via_device_id` tells Home Assistant which device it reaches another device through, like the bulbs behind a bridge. It shows the topology of the network. It takes the Home Assistant ID of the hub device, so the hub has to be registered first.

If you registered the hub yourself, you already have its ID: pass `hub.id` to your entities. Otherwise, look it up from the identifiers of the hub:

```python
via_device_id = dr.async_get_device_id_by_identifier(
    hass, (DOMAIN, bridge_id), config_entry_id=entry.entry_id
)
```

It raises `ValueError` when the hub does not exist yet.

## Child devices

A child device is a lightweight device for a logical part of one physical product, like one outlet of a power strip or one gang of a wall switch. The parent device holds what belongs to the whole product, like the network connection and firmware updates. Each child holds the entities of its part, like a switch and an energy sensor per outlet. Users can put each part in a different area.

Do not mix this up with `via_device_id`: that is about connectivity between separate products. Child devices are about the parts of one product.

A child device:

- Belongs to one parent, referenced by the device ID of the parent (`parent_device_id`).
- Belongs to the same config entry and subentry as its parent.
- Has no identity of its own: no `connections`, `via_device_id`, `manufacturer`, `model`, firmware versions, or serial number. Those belong to the parent.
- Gets the area of its parent, unless it has its own.
- Cannot have child devices of its own.

### Register a child device

Through an entity, return a `ChildDeviceInfo` with `identifiers` and `parent_device_id`. The parent must already be registered:

```python
from homeassistant.helpers.device_registry import ChildDeviceInfo

self._attr_device_info = ChildDeviceInfo(
    identifiers={(DOMAIN, f"{strip_id}_outlet_{number}")},
    name=f"Outlet {number}",
    parent_device_id=parent_device_id,
)
```

Or directly:

```python
outlet = device_registry.async_get_or_create_child(
    config_entry_id=entry.entry_id,
    parent_device_id=parent.id,
    identifiers={(DOMAIN, f"{strip_id}_outlet_1")},
    name="Outlet 1",
)
```

Besides the required `config_entry_id`, `parent_device_id`, and `identifiers`, `async_get_or_create_child` takes `config_subentry_id`, `name`, `suggested_area`, `disabled_by`, `translation_key`, and `translation_placeholders`. There is deliberately no `via_device_id`, `connections`, `manufacturer`, `model`, or firmware argument: a child device doesn't have those. When you already hold a `ChildDeviceInfo`, pass it as it is to `async_get_or_create_child_from_info`.

If the parent belongs to a subentry, pass its `config_subentry_id` as well. It is not inherited. The registry never creates the parent for you: it raises a `DeviceInfoError` when the parent does not exist, is a child device itself, or belongs to another config entry or subentry.

### Move existing devices to child devices

If the identifiers of a child device match an existing device of the same config entry, that device becomes a child device, and keeps its ID. Automations that use the device keep working. That makes it easy to move an integration that already split products into separate devices.

This only works if the config entry has not registered the device as a normal device since the entry was set up: the registry raises a `DeviceInfoError` then. It forgets those registrations when the config entry unloads. So register the part only as a child device, and don't leave a `DeviceInfo` for it on one of its entities.

The other way around is not supported directly. `async_update_child_device` can't change the parent, and `async_get_or_create` with the identifiers of an existing child device raises an error instead of turning it into a normal device. To turn a child device back into a normal device, remove it with `async_remove_device`, then register it again with `async_get_or_create`, with the same identifiers. The order matters: the identifiers are only free once the child device is removed. Removing a device also removes the entity registry entries of its entities, so this fits a child device without entities. Entities only come back when your integration adds them again, with their settings, like the entity ID and name, restored.

### What follows the parent

- Removing a parent removes its children.
- Disabling a parent disables its children, and enabling the parent enables the children it disabled again. A child of a disabled parent cannot be enabled on its own.
- A child without an area of its own is in the area of its parent. `dr.async_get_effective_area_id(hass, device)` returns the area that applies.
- Labels are not inherited.
- A parent with children cannot move to another config entry or subentry.
- An action that targets a parent device also targets the entities of its children. An action that targets a child only targets the entities of that child. That way, automations that target a device keep working when an integration moves entities of that device to child devices.

## Look up devices

Inside an entity, use `self.device_entry`. Elsewhere, scope lookups to the config entry: identifiers and connections are only unique within one config entry.

```python
device_registry = dr.async_get(hass)

# By the ID Home Assistant gave it
device = device_registry.async_get(device_id)

# By one of its identifiers or connections
device = device_registry.async_get_device_by_identifier(
    (DOMAIN, serial_number), entry.entry_id
)
device = device_registry.async_get_device_by_connection(
    (dr.CONNECTION_NETWORK_MAC, mac), entry.entry_id
)

# All devices of a config entry
devices = dr.async_entries_for_config_entry(device_registry, entry.entry_id)
```

`async_get` returns normal devices and child devices. Pass `include_child_devices=False` to only get a normal device. To only get a child device, pass both `include_main_devices=False` and `include_composite_devices=False`: by default, `async_get` also returns a read-only stand-in for the ID of a [device that was split into one device per config entry](/blog/2026/07/21/device-registry-single-config-entry/#backwards-compatibility), and that is not a child device. The other lookups return normal devices, not child devices. For child devices, use `async_get_child_device_by_identifier(identifier, config_entry_id)`, or `dr.async_entries_for_parent_device(device_registry, parent_device_id)` for all children of a device. To get every device with an identifier or connection across config entries, use `device_registry.async_get_devices()`.

To get a device together with the config entry of your integration that owns it, for example in an action, use `dr.async_get_device_and_config_entry_for_domain(hass, device_id, domain=DOMAIN)`. It returns `(None, None)` when the device is unknown, and `(device, None)` when no config entry of your domain owns it. It takes the same `include_child_devices` and `include_main_devices` arguments as `async_get`.

## Update devices

When something changes, like the firmware version after an update, update the device:

```python
device_registry.async_update_device(device.id, sw_version=new_version)
```

## Let users remove devices

Users can only delete a device from the UI if your integration allows it. Implement `async_remove_config_entry_device` in `__init__.py`. Return `True` if the device can go, after any cleanup it needs:

```python
from homeassistant.helpers.device_registry import DeviceEntry


async def async_remove_config_entry_device(
    hass: HomeAssistant, entry: ExampleConfigEntry, device_entry: DeviceEntry
) -> bool:
    """Allow removing a device that is no longer connected."""
    return not any(
        identifier
        for identifier in device_entry.identifiers
        if identifier[0] == DOMAIN
        and identifier[1] in entry.runtime_data.data.devices
    )
```

This example only allows removing devices that the hub no longer reports. The integration can also act on `EVENT_DEVICE_REGISTRY_UPDATED` instead, if that is more convenient.

Integrations that see devices disappear should also remove stale devices by themselves: that is a rule of the Gold tier of the [quality scale](/core/quality-scale/).

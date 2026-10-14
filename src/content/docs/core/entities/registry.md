---
title: The entity registry
description: Give entities a unique ID so the entity registry can remember them, link them to a device, and decide whether they start enabled, visible, or categorized.
sidebarLabel: Entity registry
sidebarGroup: Basics
order: 7
---

This page is about how your entities get into the entity registry, from the side of the entity. To look up or migrate registry entries from the code of your integration, see [entity registry](/core/integrations/entity-registry/) in building integrations.

The entity [registry](/glossary/registry/) is where Home Assistant remembers every entity it has seen. It keeps the entity ID, the device and area it belongs to, and everything the user changed: the name, the icon, the entity ID, whether it is enabled, and options like a preferred unit. Those settings survive restarts, reinstalls of the device, and updates of your integration.

An entity only gets a registry entry when it has a [unique ID](/glossary/unique-id/). Without one, users can't rename it, change its icon, put it in an area, or disable it from the interface. So give every entity a unique ID.

## Unique ID

The registry finds an entity by three things together: its domain (like `sensor`), the integration that provides it (like `hue`), and its unique ID. The unique ID only has to be unique within that combination. Don't put your integration domain or the entity domain in it, Home Assistant already keeps track of those.

The unique ID must never change, and users must not be able to change it. When it changes, Home Assistant sees a brand new entity, and everything the user set up for the old one is gone.

Good sources for a unique ID:

- The serial number of the device
- The MAC address of the device, formatted with `format_mac` from `homeassistant.helpers.device_registry`. Read it from the device API or from discovery, never from the ARP table of the network
- A unique identifier printed on the device or stored in its firmware
- A fixed location, like latitude and longitude, for entities that describe a place

As a last resort, for entities set up from a [config entry](/glossary/config-entry/), use the config entry ID.

Never use these: the IP address, the hostname, a URL, the name of the device, an email address, or a username. They all change.

When a device has several entities, combine the unique ID of the device with something that tells the entities apart, like the key of the [entity description](/glossary/entity-description/): `f"{serial}_{description.key}"`.

## Linking to a device

Set `device_info` to link an entity to a [device](/glossary/device/). Home Assistant creates the device in the device registry the first time it sees it, and updates it when the information changes. All entities with the same identifiers end up on the same device.

```python
from homeassistant.helpers.device_registry import DeviceInfo

self._attr_device_info = DeviceInfo(
    identifiers={(DOMAIN, device.serial)},
    manufacturer="Example",
    model="Pump 3000",
    name=device.name,
    sw_version=device.firmware,
)
```

Only entities that have a unique ID and belong to a config entry can link to a device. Other entities that try get a warning, and the link will stop working in Home Assistant 2027.8.

The fields of `DeviceInfo` are all optional, but a device needs at least `identifiers` or `connections`:

| Field | Description |
| --- | --- |
| `identifiers` | Set of `(domain, id)` tuples that identify the device in your integration. |
| `connections` | Set of `(type, id)` tuples, like a MAC address, that other integrations can match on. |
| `name` | The name of the device. |
| `manufacturer`, `model`, `model_id` | Who made it, and the model name and model number. |
| `serial_number` | The serial number. |
| `sw_version`, `hw_version` | Firmware and hardware version. |
| `configuration_url` | A URL to configure the device, like its web interface. |
| `suggested_area` | The area the device should land in when it is first created. |
| `entry_type` | `DeviceEntryType.SERVICE` for something that is not a physical device, like a web service. |
| `via_device_id` | The device registry ID of the device this one is connected through, like a hub. |
| `translation_key`, `translation_placeholders` | A translated device name, from the `device` section of `strings.json`. |

`via_device_id` replaces the older `via_device` field, which took an identifier tuple and is removed in Home Assistant 2027.8.

### Child devices

Some devices are made of logical parts, like the outlets of a power strip. Use `ChildDeviceInfo` to register such a part as a child of a device you already registered. It takes the `identifiers` of the child, the `parent_device_id` (the device registry ID of the parent), and optionally `name`, `suggested_area`, and a translation key with placeholders. The parent must be registered by the same config entry and belong to the same config subentry.

## Entity categories

Not every entity is a main feature of its device. Mark the others with an [entity category](/glossary/entity-category/) from `homeassistant.const`:

- `EntityCategory.CONFIG`: the entity changes a setting of the device, like a switch for the status LED, or a number for the sensitivity of a motion sensor.
- `EntityCategory.DIAGNOSTIC`: the entity shows information about the device without changing it, like the signal strength or the IP address. Also use it for a button that makes a device identify itself.

Categorized entities are shown in their own sections on the device page, aren't added to auto-generated dashboards, aren't exposed to voice assistants by default, and aren't targeted when an action targets a whole device or area. Sensors and binary sensors can't use the `CONFIG` category.

## Enabled and visible by default

Some entities are useful for a few people and noise for everyone else, like a signal strength sensor or a sensor that changes every second. Set `entity_registry_enabled_default` to `False` for those. The entity is registered disabled: it doesn't run, doesn't write states, and doesn't fill the database, until a user enables it.

`entity_registry_visible_default` set to `False` registers the entity as hidden instead. It still runs, but it is left out of auto-generated dashboards, isn't exposed to voice assistants by default, and isn't targeted when an action targets a whole device or area. Use it for entities that are part of something bigger, like the members of a group.

Both only apply when the entity is registered for the first time. After that, the user decides.

## Disabled entities

The `disabled_by` field of a registry entry says why an entity is disabled. A disabled entity is not added to Home Assistant when your integration passes it to `async_add_entities`.

| Value | Meaning |
| --- | --- |
| `user` | The user disabled it in the interface. |
| `integration` | The integration registered it disabled with `entity_registry_enabled_default`, or the user turned off **Enable newly added entities** for the config entry. |
| `config_entry` | The config entry is disabled. |
| `device` | The device of the entity is disabled. |
| `hass` | Home Assistant disabled it. |

When the user disables an entity, Home Assistant removes it right away. When the user enables an entity of a config entry, Home Assistant reloads the config entry to add it. It waits until 30 seconds after the last entity was enabled, so a user who enables several entities causes one reload. Your integration must support unloading for that to work without a restart.

Make sure your integration copes with entities that are never added. If you keep references to entity objects, register them in `async_added_to_hass`, which only runs for entities that are actually added. See [the entity lifecycle](/core/entities/lifecycle/).

If your integration lets users choose which entities to create, like in an [options flow](/glossary/options-flow/), don't use `disabled_by` for it. Don't create the entities the user deselected, and remove them from the entity and device registries.

A single config entry can have at most 10,000 enabled entities. Beyond that, Home Assistant doesn't add new ones and logs a warning, so a misbehaving integration can't take the whole system down. A few integrations that manage large networks, like Z-Wave and Matter, are exempt.

## Entity options

The registry also stores options per entity, grouped by domain. The user sets most of them in the entity settings, like the display precision or the unit of a sensor, or the color of a calendar. The platform base class reads them from `self.registry_entry.options` and handles them for you. Your integration normally doesn't need to read or write them.

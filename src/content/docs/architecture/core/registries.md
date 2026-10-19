---
title: Registries and storage
description: Where Home Assistant keeps what it knows about entities, devices, and areas, how users' changes are kept apart from what integrations report, and how data is stored.
order: 10
---

The [state machine](/core/internals/states/) knows what is true right now, and forgets it at a restart. The [registries](/glossary/registry/) remember the rest: which entities and devices exist, where they are, what they are called, and what users changed about them.

This page is the overview. How an integration works with each registry is in the Core and integrations area, linked below.

## In short

- There is a registry for entities, devices, areas, floors, labels, and categories, and one for issues shown under Repairs.
- An integration fills them, through the unique IDs of its entities and the device info it gives.
- Users change them in the UI: a name, an area, an icon. Those changes are kept next to what the integration reports, and they win.
- Registries, config entries, and most other data live in JSON files in the `.storage` folder.

## Two sources, one result

Take an entity. The integration says it is called "Temperature" and is a temperature sensor. The user renames it to "Outside" and puts it in the garden area. Both are kept, in different fields:

| Field from the integration | Field from the user |
| --- | --- |
| `original_name` | `name` |
| `original_icon` | `icon` |
| `original_device_class` | `device_class` |

When the entity writes its state, the user's value wins when it is set. The integration can update its own fields at any time, without overwriting the user's choice. That is the principle that [the user's choices win](/architecture/principles/#the-users-choices-win).

## The registries

| Registry | What it holds | The details |
| --- | --- | --- |
| Entities | Every entity with a [unique ID](/glossary/unique-id/), and what the user changed about it | [The entity registry](/core/entities/registry/), for entity authors, and [Entity registry](/core/integrations/entity-registry/), to look up and migrate entries |
| Devices | Every device, from the device info of an integration's entities | [Device registry](/core/integrations/device-registry/) |
| Areas and floors | How the user describes their home | [Area registry](/core/integrations/area-registry/) |
| Labels and categories | How the user groups things, and sorts automations and scripts | The code, linked below |
| Issues | What the user needs to act on, shown under **Settings** > **Repairs** | [Repairs](/core/integrations/repairs/) |

Entities without a unique ID still work, but users can't change anything about them in the UI.

The registries follow the hierarchy of config entry, device, and entity. Disable a config entry, and its devices and entities are disabled too. Disable a device, and its entities follow. Remove a device or a config entry, and the entities that belong to it are removed from the registry.

An enabled entity in the registry that no integration provides right now, like when its integration failed to set up, still shows up in the state machine: as `unavailable`, with the attribute `restored: true`.

## Storage

Home Assistant stores its own data in JSON files in `.storage`, in the configuration folder: the registries, config entries, users, dashboards, and more. Integrations can do the same with `Store`, which versions the data, migrates it when the version changes, combines writes close together into one, and by default refuses to read data with a newer major version than it knows, like after a downgrade.

Files in `.storage` are internal. They change between versions, and users shouldn't edit them by hand. `configuration.yaml` is the other place configuration lives. It is written by users, and Home Assistant only reads it.

## In the code

| What | Where |
| --- | --- |
| Entity registry | [`homeassistant/helpers/entity_registry.py`](https://github.com/home-assistant/core/blob/dev/homeassistant/helpers/entity_registry.py) |
| Device registry, `DeviceInfo` | [`homeassistant/helpers/device_registry.py`](https://github.com/home-assistant/core/blob/dev/homeassistant/helpers/device_registry.py) |
| Area, floor, label, and category registries | `area_registry.py`, `floor_registry.py`, `label_registry.py`, `category_registry.py` in [`homeassistant/helpers/`](https://github.com/home-assistant/core/tree/dev/homeassistant/helpers) |
| Issue registry | [`homeassistant/helpers/issue_registry.py`](https://github.com/home-assistant/core/blob/dev/homeassistant/helpers/issue_registry.py) |
| `Store` | [`homeassistant/helpers/storage.py`](https://github.com/home-assistant/core/blob/dev/homeassistant/helpers/storage.py) |

## Work on this

- New to Core? Start with [your first contribution to Core](/core/first-contribution/).
- Give your entities a unique ID and a device: the [entity unique ID](/core/quality-scale/entity-unique-id/) and [devices](/core/quality-scale/devices/) rules of the quality scale.

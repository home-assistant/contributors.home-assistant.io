---
title: Area registry
description: What Home Assistant knows about areas, and how your integration can suggest one for a device.
sidebarGroup: Devices and registries
order: 3
---

The area registry keeps track of [areas](/glossary/area/): the physical locations in a home, like the kitchen or the garage. Users put devices and entities in areas, and areas on [floors](/glossary/floor/).

Areas belong to the user. Your integration does not create or change them. What it can do is suggest an area for a new device, with `suggested_area` in the `DeviceInfo` you give an entity or pass to the [device registry](/core/integrations/device-registry/). Use it when the device or service knows which room it is in, like a room name set in its own app.

## Area properties

| Property | What it is |
| --- | --- |
| `id` | The ID Home Assistant generated for the area |
| `name` | The name of the area |
| `aliases` | Other names for the area, for example for voice commands |
| `floor_id` | The floor the area is on |
| `icon` | The icon of the area |
| `picture` | The picture of the area |
| `labels` | The labels of the area |
| `temperature_entity_id` | The entity that gives the temperature of the area |
| `humidity_entity_id` | The entity that gives the humidity of the area |
| `created_at`, `modified_at` | When the area was created and last changed |

## Read areas

```python
from homeassistant.helpers import area_registry as ar

area_registry = ar.async_get(hass)
area = area_registry.async_get_area(area_id)
```

An entity without an area of its own is in the area of its device. To get the area that applies, use `er.async_get_effective_area_id(hass, entity_entry)` for an entity, or `dr.async_get_effective_area_id(hass, device)` for a device.

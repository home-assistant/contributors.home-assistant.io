---
title: Naming entities
description: How has_entity_name, translation keys, and device classes give your entities a name, and how Home Assistant turns that into a friendly name and an entity ID.
sidebarLabel: Naming
sidebarGroup: Basics
order: 2
---

A good entity name is short and only says what the entity is: "Battery", "Power usage", "Child lock". Home Assistant adds the device name in front of it by itself. Your job as an integration author is to give the entity that short name, in a way that can be translated.

## Use `has_entity_name`

Set `has_entity_name` to `True` on every entity. It is required for new integrations. It tells Home Assistant that the name of the entity describes only the entity, not the device it belongs to.

```python
class ExampleSensor(SensorEntity):
    _attr_has_entity_name = True
```

With `has_entity_name` set, the name of the entity is one of three things:

- **A name of its own**, like "Battery", for an entity that is one of several on a device. Give it through a [translation key](#translated-names).
- **`None`**, for the entity that is the main feature of its device, like the light of a smart bulb. The entity then takes the name of the device.
- **Not set**, for some platforms: the entity is then named after its [device class](#names-from-the-device-class).

Entity names start with a capital letter, and the rest is lowercase, unless a word is a proper noun or an abbreviation that is always written in capitals.

Integrations that don't set `has_entity_name` use the legacy behavior, where `name` holds the full name including the device. Don't use it for anything new.

## Translated names

Don't hard code an English name. Set a `translation_key` instead, and put the name in the `entity` section of your integration's `strings.json`. Translated names only work for entities that set `has_entity_name` to `True`:

```json
{
  "entity": {
    "sensor": {
      "water_temperature": {
        "name": "Water temperature"
      }
    }
  }
}
```

The key under `entity` is the domain of the entity, and the key below it is the translation key. The same translation key is used to translate the states and state attributes of the entity, its unit of measurement, and to look up its [icons](/core/entities/icons/). For the full picture of the `strings.json` file, see [translations](/core/integrations/translations/).

```python
class ExampleSensor(SensorEntity):
    _attr_has_entity_name = True
    _attr_translation_key = "water_temperature"
```

Only skip translation for names that are the same in every language: proper nouns, model names, or names that come from the device or its library. In those cases, set `name` directly.

> [!NOTE]
> Translated names are resolved in the language of the Home Assistant server when the entity is first created, not in the language of the user's interface. Changing the server language later doesn't rename existing entities.

### Placeholders

When the name has a part that differs per entity, like a channel number, use a placeholder in the translation and fill it with `translation_placeholders`:

```json
{
  "entity": {
    "switch": {
      "outlet": {
        "name": "Outlet {number}"
      }
    }
  }
}
```

```python
class ExampleOutlet(SwitchEntity):
    _attr_has_entity_name = True
    _attr_translation_key = "outlet"

    def __init__(self, number: int) -> None:
        self._attr_translation_placeholders = {"number": str(number)}
```

If the placeholders don't match the name, Home Assistant raises an error on development and beta versions, and logs a warning on stable releases.

## Names from the device class

Some platforms name an entity after its device class when you don't set a name: `binary_sensor`, `button`, `event`, `number`, `sensor`, and `update`, and the emitter and receiver entities of `infrared`. A sensor with the `temperature` device class and no name is called "Temperature", translated to the server language. In many cases that is all you need. Sensors with the `enum` device class are the exception: they don't get a name from it.

This only happens when the name is not set at all. `_attr_name = None` still means "use the device name".

## Friendly name and entity ID

From the entity name and the device name, Home Assistant builds the `friendly_name` attribute:

| Situation | Friendly name |
| --- | --- |
| The entity has no device | The entity name |
| The entity has a device and a name | Device name, then entity name: "Nightlight Battery" |
| The entity has a device, and its name is `None` | The device name: "Nightlight" |

The entity ID is built from name parts too, when the entity is first registered. By default those are the area, the name of the parent device (for a child device), the device name, and the entity name, so a battery sensor of a device called "Nightlight" without an area becomes `sensor.nightlight_battery`, and its light becomes `light.nightlight`. The names come from the English translations, unless the server language is one of the languages that get entity IDs in their own language. Users can choose which parts Home Assistant uses for new entity IDs. Because of that, never rely on a specific entity ID in your integration: look entities up by their unique ID in the [entity registry](/core/entities/registry/).

When the user renames an entity or its device, Home Assistant uses the new names. Your code never needs to know.

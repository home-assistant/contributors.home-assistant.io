---
title: Use icon translations
description: "Gold rule icon-translations: entity icons are defined in icons.json."
sidebarLabel: icon-translations
sidebarGroup: Gold
order: 18
---

This is a Gold rule. In `quality_scale.yaml`, it is called `icon-translations`.

Entities that need an icon of their own get it from `icons.json`, by their [translation key](/glossary/translation-key/), instead of setting an `icon` in Python. The name sounds odd: nothing is translated. The translation key is just the reference that links an entity to its icon, the same way it links an entity to its name.

`icons.json` can set a default icon, an icon per state, and for numeric entities, an icon per range of values. It can also set icons for the values of state attributes, like the preset modes of a climate entity.

> [!NOTE]
> Entities also get icons from their device class. When the entity means exactly what the device class means, keep that icon. A PM2.5 sensor does not need its own icon.

## Why it matters

Icons used to be part of the state of an entity, written to the state machine with every update, even though they hardly ever changed. With icon translations, the frontend picks the icon from the state, so the state machine does less work. The icons of an integration are all in one file, where they are easy to review and to change.

## Example

The entity sets a translation key:

```python
class MyPollenSensor(SensorEntity):
    """The tree pollen level."""

    _attr_has_entity_name = True
    _attr_translation_key = "tree_pollen"
```

`icons.json` gives it a default icon, and another icon for the `high` state:

```json
{
  "entity": {
    "sensor": {
      "tree_pollen": {
        "default": "mdi:tree",
        "state": {
          "high": "mdi:tree-outline"
        }
      }
    }
  }
}
```

For a numeric entity, `range` picks the icon of the highest range value that is less than or equal to the state:

```json
{
  "entity": {
    "sensor": {
      "water_level": {
        "default": "mdi:water-off",
        "range": {
          "0": "mdi:water-outline",
          "50": "mdi:water-percent",
          "90": "mdi:water"
        }
      }
    }
  }
}
```

A state of 60 shows `mdi:water-percent`, and anything from 90 up shows `mdi:water`. The default is used when the state is below the lowest range, unavailable, or not a number. Range keys can be whole or decimal numbers, like `"0.5"`, and must be in ascending order. When an entity has both `state` and `range` icons, the `state` icons win.

## How it is checked

- Hassfest validates `icons.json`: the format, range keys that must be numeric and in ascending order, and state icons that must differ from the default icon.
- Pylint fails on `mdi:` icons that do not exist, in `icons.json` (`home-assistant-mdi-icon-json-not-found`) and in Python code (`home-assistant-mdi-icon-not-found`).
- Whether icons are set in Python where they belong in `icons.json` is checked in review.

## Exceptions

- If the integration has no entities, this rule does not apply.
- If the entities do not use icons of their own, for example because the icons of their device class fit, this rule does not apply.

## Related rules

- [entity-translations](/core/quality-scale/entity-translations/): translate entity names.
- [entity-device-class](/core/quality-scale/entity-device-class/): use device classes.

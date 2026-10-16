---
title: Icons
description: Give your entities icons that follow their state with icon translations in icons.json, and when to use the icon property instead.
sidebarLabel: Icons
sidebarGroup: Basics
order: 6
---

Every entity has an icon. Home Assistant uses [Material Design Icons](https://pictogrammers.com/library/mdi/), written as `mdi:` followed by the name of the icon, like `mdi:water-pump`.

In most cases you don't need to do anything. Home Assistant picks an icon from the domain, the device class, and the state of the entity: a door sensor shows an open or a closed door, a temperature sensor shows a thermometer. Stick with those defaults when they fit. They make your entities look like every other entity of the same kind, which helps people find their way.

When your entity needs its own icon, use icon translations. Whatever you pick, users can always set their own icon in the entity settings, and theirs wins.

## Icon translations

Icon translations map a [translation key](/glossary/translation-key/) to icons, in an `icons.json` file next to the `strings.json` of your integration. They work like translated states, but give an icon instead of a word.

```json
{
  "entity": {
    "sensor": {
      "moon_phase": {
        "default": "mdi:moon-full",
        "state": {
          "new_moon": "mdi:moon-new",
          "first_quarter": "mdi:moon-first-quarter",
          "last_quarter": "mdi:moon-last-quarter"
        }
      }
    }
  }
}
```

The entity picks it up through its translation key:

```python
class MoonPhaseSensor(SensorEntity):
    _attr_has_entity_name = True
    _attr_translation_key = "moon_phase"
```

- `default` is used when no state matches. Without it, the entity falls back to the icon of its domain and device class.
- `state` maps states to icons. State keys are `snake_case`, like all translation keys. Don't repeat the default icon here: a state icon that is the same as the default adds nothing.

### Icons for numeric states

For numeric states, like a battery level or a fill percentage, use `range` instead of listing every value. The keys are numbers in ascending order. The frontend picks the icon of the highest key that is not above the current value, and uses `default` for values below the lowest key.

```json
{
  "entity": {
    "sensor": {
      "tank_level": {
        "default": "mdi:gauge-empty",
        "range": {
          "25": "mdi:gauge-low",
          "50": "mdi:gauge",
          "90": "mdi:gauge-full"
        }
      }
    }
  }
}
```

An exact match in `state` still wins over `range`.

### Icons for state attributes

Some attributes get an icon in the frontend, like the preset mode or the fan mode of a climate entity. Add them under `state_attributes`, with the same `default`, `state`, and `range` keys:

```json
{
  "entity": {
    "climate": {
      "heat_pump": {
        "state_attributes": {
          "preset_mode": {
            "default": "mdi:thermostat",
            "state": {
              "vacation": "mdi:beach",
              "night": "mdi:weather-night"
            }
          }
        }
      }
    }
  }
}
```

This only works for attributes the frontend shows with an icon. It doesn't give arbitrary attributes an icon.

## The icon property

You can also set the `icon` property, or `_attr_icon`. It overrides the icon translations, the device class, and the state of the entity. Because it is code, it can depend on anything:

```python
from homeassistant.util import dt as dt_util


class ExampleSensor(SensorEntity):
    @property
    def icon(self) -> str:
        """Show a moon at night."""
        if dt_util.now().hour < 7:
            return "mdi:weather-night"
        return "mdi:weather-sunny"
```

Prefer icon translations. They keep the icons out of the state object, so they don't end up in the database on every state change, and the frontend can show the right icon for a state before it happens, like in the history or in a state selector. The `icon` property can't give state attributes an icon.

## For entity platforms

An entity platform, like `sensor` or `light`, defines the default icons of its domain in its own `icons.json`, under `entity_component`. The `_` key is the default for the domain, and the other keys are device classes. You only touch that when you work on the domain itself.

For how icons look and behave in the interface, see the [state icon](/design/components/state-icon/) in the Design area.

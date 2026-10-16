---
title: Translate entity names
description: "Gold rule entity-translations: entity names come from strings.json, so they can be translated."
sidebarLabel: entity-translations
sidebarGroup: Gold
order: 16
---

This is a Gold rule. In `quality_scale.yaml`, it is called `entity-translations`.

Entities get their names from `strings.json`, through a [translation key](/glossary/translation-key/), instead of a hardcoded English name in Python. The translators of Home Assistant then translate those names into every language it supports.

## Why it matters

Home Assistant is used all over the world, and many people use it in a language other than English. An entity called "Phase voltage" in a Dutch, Japanese, or Brazilian interface is a small thing, but a few hundred of them make Home Assistant feel like it was not made for you.

Translated names only work for entities with `has_entity_name` set to `True`, which is the [has-entity-name](/core/quality-scale/has-entity-name/) rule.

## Example

Set the translation key on the entity:

```python
class MyVoltageSensor(SensorEntity):
    """The phase voltage of My device."""

    _attr_has_entity_name = True
    _attr_translation_key = "phase_voltage"
```

And add the name under `entity` in `strings.json`, by platform and translation key:

```json
{
  "entity": {
    "sensor": {
      "phase_voltage": {
        "name": "Phase voltage"
      }
    }
  }
}
```

With a device called "My device", the entity is shown as "My device Phase voltage".

An entity on the `binary_sensor`, `button`, `event`, `infrared`, `number`, `sensor`, or `update` platform with a device class needs no translation key when the name of the device class fits. It is named after the device class, like "Temperature", and that name is already translated. This does not work for sensors with the `enum` device class.

See [Make your strings translatable](/translate/guides/developers/) for how to write strings that translators can work with.

## How it is checked

- Hassfest validates the format of `strings.json`.
- Pylint warns when a translation key only repeats the name of the device class (`home-assistant-redundant-translation-key`).
- Whether every entity has a translated name is checked in review.

## Exceptions

- If the integration has no entities, this rule does not apply.
- If the entities only have names that users define themselves, which cannot be translated, this rule does not apply.
- If all entities use the name of their device, with `_attr_name = None`, this rule does not apply.

## Related rules

- [has-entity-name](/core/quality-scale/has-entity-name/): use has_entity_name.
- [entity-device-class](/core/quality-scale/entity-device-class/): use device classes.
- [icon-translations](/core/quality-scale/icon-translations/): use icon translations.
- [exception-translations](/core/quality-scale/exception-translations/): translate exception messages.

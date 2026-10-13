---
title: State and attributes
description: What ends up in the state object of your entity, when to add extra attributes, and how to keep attributes out of the history.
sidebarLabel: State and attributes
sidebarGroup: Basics
order: 5
---

Every time an entity writes its state, Home Assistant turns it into a state object in the [state machine](/glossary/state-machine/). That object is what automations, the frontend, and the history see. It has two parts: the [state](/glossary/state/) itself, and a set of [attributes](/glossary/attribute/).

## The state

The state is one short string, like `on`, `21.5`, or `cleaning`. You don't build it yourself: the base class of your platform calculates it from its own properties, like `is_on` for a switch or `native_value` for a sensor. The platform pages list the possible states of each domain.

A few rules apply to every entity:

- When `available` is `False`, the state is `unavailable`.
- When the state is `None`, it becomes `unknown`.
- Numbers are converted to a string. Floats are rounded to a readable precision.
- A state can be at most 255 characters. A longer state is logged as an error and replaced by `unknown`. Long text belongs in an attribute, or in a different kind of entity.

Use the states your platform defines. If a domain uses `on` and `off`, don't invent `running`. If you need words the domain doesn't have, check if another platform fits better, like an enum [sensor](/core/entities/sensor/) or a [select](/core/entities/select/).

## Attributes

Home Assistant fills the attributes from several sources, in this order:

1. The capability attributes of the domain, like the list of supported color modes of a light. They describe what the entity can do, and are stored in the entity registry too.
2. The state attributes of the domain, like the current brightness of a light. Left out while the entity is unavailable.
3. Your `extra_state_attributes`. Also left out while the entity is unavailable.
4. The generic attributes: `unit_of_measurement`, `assumed_state`, `attribution`, `device_class`, `entity_picture`, `icon`, `friendly_name`, and `supported_features`, when they are set.

The first two come from the platform base class. Don't override `state_attributes` or `capability_attributes` in an integration.

### Extra state attributes

`extra_state_attributes` is for the integration specific information that explains the state. A good attribute helps someone understand or use the current state, like the source of a reading or the next scheduled run.

```python
class ExampleSensor(SensorEntity):
    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return the station that measured the value."""
        return {"station": self._station.name}
```

Or set `_attr_extra_state_attributes` when you have the values ready.

Before adding an attribute, ask whether it should be an entity of its own. Attributes can't be used in the energy dashboard, don't have long term statistics, and can't be translated as easily. A value that changes on its own, like a battery level or a signal strength, almost always works better as its own sensor. Static information about the device, like its firmware version or serial number, belongs in the [device info](/core/entities/registry/#linking-to-a-device), not in an attribute.

Attribute names are lowercase `snake_case`. Values must be JSON serializable.

### Attributes don't come and go

Someone who uses an attribute in an automation or a template needs to tell "this entity doesn't have it" apart from "it has no value right now". These rules apply to every state attribute, not only the extra ones:

- An attribute that is expected is always in the dictionary. When it has no value right now, its value is `None`.
- An attribute that is not expected is not in the dictionary at all.

An attribute is expected when the entity supports it: when it belongs to a feature in `supported_features` that the entity supports, or, for an extra state attribute, when the device provides that value. The light base class works this way. A light that supports effects always has the `effect` attribute, and it is `None` while the light is off. A light without effect support has no `effect` attribute.

This was decided in the [architecture discussion on entity attributes](https://github.com/home-assistant/architecture/discussions/680).

## Keep attributes out of the history

The recorder stores every state change, including its attributes. It leaves out only a few, like `attribution` and `supported_features`, and it drops all attributes of a state, with a warning in the log, when together they are larger than 16 KiB. Attributes that never change, or that are not useful later, only fill the database. Exclude them with a class attribute:

```python
from homeassistant.const import MATCH_ALL


class ExampleCamera(Camera):
    _unrecorded_attributes = frozenset({"access_token", "snapshot_url"})
```

- `_unrecorded_attributes` is for your integration's entity class.
- `_entity_component_unrecorded_attributes` is for the base class of a domain, like the `preset_modes` of a fan.

Both must be class attributes. Setting them on an instance does nothing. Use `MATCH_ALL` to exclude everything at once. Even then, Home Assistant keeps recording `device_class`, `unit_of_measurement`, `friendly_name`, and `state_class`, because other features depend on them.

## Things to avoid

- Don't change attributes on every update when nothing meaningful changed, like a "last checked" timestamp. Every change is a new row in the database and a state change event that automations see.
- Don't put the same value in an attribute and in the state.
- Don't use attributes to work around a missing feature in a domain. [Propose the feature](/core/entities/entity-class/#proposing-changes-to-an-entity-model) instead.

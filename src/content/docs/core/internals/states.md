---
title: States
description: How the state machine keeps the current state of every entity, what a state object holds, and why integrations write states through entities.
sidebarGroup: The core
order: 3
---

The state machine on `hass.states` holds the current state of every entity in Home Assistant. Dashboards read it, automations trigger on it, and the recorder stores every change. It is a simple store with few rules, and that is on purpose.

## Write states through entities

Before anything else: as an integration developer, you almost never call the state machine yourself. You create [entities](/core/entities/), and the entity base class writes their state with `async_write_ha_state()`. It takes care of the entity ID, the name, the unit, the icon, the device class, availability, and the attributes every entity has. Writing states by hand skips all of that, and the user cannot rename, hide, or configure what you wrote.

Read on to understand what happens underneath.

## The state object

Every state is a `State` object from `homeassistant.core`. States are immutable: a change creates a new object.

| Attribute | Description |
| --- | --- |
| `entity_id` | The entity ID, like `light.kitchen_ceiling`: the domain, a dot, and the object ID. |
| `domain` | The part before the dot, like `light`. |
| `object_id` | The part after the dot, like `kitchen_ceiling`. |
| `state` | The state itself, always a string of at most 255 characters, like `on` or `21.5`. |
| `attributes` | A read-only dictionary with extra information. Keep it JSON serializable. |
| `last_changed` | When `state` last changed. |
| `last_updated` | When `state` or any attribute last changed. |
| `last_reported` | When the state was last written, even if nothing changed. |
| `context` | The `Context` that caused this state. |
| `name` | The friendly name, from the `friendly_name` attribute, or else the object ID with spaces for underscores. |

The [state object page on home-assistant.io](https://www.home-assistant.io/docs/configuration/state_object/) describes the same object from the user's side.

## Read states

```python
state = hass.states.get("sun.sun")
if state is not None:
    elevation = state.attributes.get("elevation")
```

- `hass.states.get(entity_id)` returns the `State`, or `None` if the entity does not exist. Always handle `None`: entities come and go.
- `hass.states.async_all(domain)` returns all states, or all states of one or more domains.
- `hass.states.async_entity_ids(domain)` returns just the entity IDs.
- `hass.states.is_state(entity_id, "on")` is a shortcut to compare.

Remember that the state can also be `unavailable` or `unknown`. The constants `STATE_UNAVAILABLE` and `STATE_UNKNOWN` live in `homeassistant/const.py`.

## Write states

`hass.states.async_set(entity_id, state, attributes)` creates or replaces a state. What happens next depends on what changed:

- **The state or attributes changed**: the state machine stores a new `State` and fires a `state_changed` event with `entity_id`, `old_state`, and `new_state` in its data. `last_changed` only moves when `state` itself changed.
- **Nothing changed**: the state machine updates `last_reported` and fires a `state_reported` event instead. Listening to `state_reported` requires an `event_filter`, because it fires a lot.
- **`force_update=True`**: a `state_changed` event is fired even if nothing changed, and `last_changed` moves too.

A state longer than 255 characters is not stored. The state machine logs an error and stores `unknown` instead.

`hass.states.async_remove(entity_id)` removes a state and fires a `state_changed` event with `new_state` set to `None`. Listeners must expect that, and the same goes for `old_state` being `None` when an entity is new.

Like everything starting with `async_`, these must run in the event loop. From another thread, use `hass.states.set` and `hass.states.remove`.

## Extra attributes on your entity

On an entity, extra information goes in the `extra_state_attributes` property. It returns a dictionary that ends up in `attributes`.

```python
@property
def extra_state_attributes(self) -> dict[str, Any]:
    """Return extra attributes of the entity."""
    return {"filter_life": self._filter_life}
```

Do not override `state_attributes`: entity base classes, like the light, use it for the attributes of their domain. And think twice before you add attributes at all. Every attribute is stored with every state change, and a value that changes often belongs in its own entity. See [entities](/core/entities/) for the details.

---
title: Entity lifecycle
description: What happens when Home Assistant adds and removes an entity, and the hooks you use to subscribe, clean up, and react to registry changes.
sidebarLabel: Lifecycle
sidebarGroup: Basics
order: 4
---

You create entity objects in the platform setup of your integration and hand them to Home Assistant with `async_add_entities`. From then on, Home Assistant decides when the entity is added, updated, and removed. Lifecycle hooks let you run code at each of those moments. All of them are optional.

## Adding an entity

When you pass an entity to `async_add_entities`, Home Assistant goes through these steps:

1. It gives the entity its `hass` and `platform` attributes.
2. It calls `async_prepare_to_add_to_hass()`.
3. If you passed `update_before_add=True`, it calls the update method. If the update raises, adding stops here.
4. If the entity has a unique ID, it registers the device and the entity in the [registries](/core/entities/registry/), and picks the entity ID. If the entity is disabled, or its unique ID or entity ID is already taken, adding stops here.
5. It calls `async_added_to_hass()`.
6. It writes the first state.

Your `__init__` runs before all of this, so `self.hass` and `self.entity_id` aren't set there yet. Keep `__init__` about storing what the entity needs, and do the rest in the hooks.

### `async_added_to_hass()`

The main hook. It runs only when adding succeeds, right before the first state is written. The entity has its entity ID and registry entry by then. Use it to subscribe to updates, register listeners, or restore an earlier state.

```python
async def async_added_to_hass(self) -> None:
    """Subscribe to the device once the entity is added."""
    await super().async_added_to_hass()
    self.async_on_remove(
        self._device.subscribe(self._handle_update)
    )
```

Call `super()` when you inherit from a class that might implement the hook too, like `CoordinatorEntity` or `RestoreEntity`.

Because disabled entities are never added, this hook is also the right place to keep a reference to an entity, if your integration needs one. Anything you register here is only registered for entities that are actually running.

### `async_prepare_to_add_to_hass()`

Runs on every attempt to add the entity, before Home Assistant looks at the registry. It also runs for entities that won't be added in the end, for example because they are disabled. You rarely need it. If you set anything up here, register its cleanup with `async_on_remove`, because `async_will_remove_from_hass` doesn't run when adding is aborted.

## Removing an entity

An entity is removed when its config entry unloads, when the user disables it, or when it is deleted from the entity registry. Stopping Home Assistant does not remove entities, so these hooks don't run on shutdown. If something must happen on shutdown, listen for `EVENT_HOMEASSISTANT_STOP`. When an entity is removed, Home Assistant:

1. Calls every callback registered with `async_on_remove`.
2. Calls `async_will_remove_from_hass()`.
3. Removes the state. Or, when the entity is still in the registry and enabled, like when the config entry is just unloaded, it sets the state to `unavailable` with a `restored` attribute.

### `async_on_remove(func)`

Registers a function to call when the entity is removed, or when adding it is aborted. Most subscription helpers return an unsubscribe function, so you can pass that straight in. This is the cleanest way to make sure you never leak a listener.

### `async_will_remove_from_hass()`

The counterpart of `async_added_to_hass`. Use it to undo work that `async_on_remove` can't, like closing a connection that belongs to this entity only.

### `async_removed_from_registry()`

Runs when the entity is deleted from the entity registry, not just removed for now. Use it to clean up data stored outside the entity, like a file or a setting on the device that only made sense for this entity.

## Registry changes

The user can change an entity in the registry while it runs: rename it, give it another entity ID, change its options.

### `async_registry_entry_updated()`

Runs after the registry entry of the entity changed. `self.registry_entry` holds the new entry. Use it when your entity depends on registry options, like a unit or a precision the user picked.

### `async_entity_id_changed(old_entity_id)`

Runs when the user changed the entity ID. By then, `self.entity_id` is the new ID, and Home Assistant has moved its own bookkeeping to it. If you track something by entity ID, like a state change listener on your own entity, move it to the new ID here and call `super()`. The method must not await. Home Assistant writes the state under the new ID after it returns.

## Restoring state

Some entities have to remember their state across restarts, because the device can't tell them. Inherit from `RestoreEntity` in `homeassistant.helpers.restore_state` as well, and read the last state in `async_added_to_hass`:

```python
from homeassistant.helpers.restore_state import RestoreEntity


class ExampleSwitch(SwitchEntity, RestoreEntity):
    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        if (last_state := await self.async_get_last_state()) is not None:
            self._attr_is_on = last_state.state == "on"
```

Sensors use `RestoreSensor` instead, and read the last state with `RestoreSensor.async_get_last_sensor_data()`, which also restores the native value and unit. See [the sensor entity](/core/entities/sensor/).

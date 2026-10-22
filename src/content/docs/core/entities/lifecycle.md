---
title: Entity lifecycle
description: What happens when Home Assistant adds and removes an entity, and the hooks you use to subscribe, clean up, and react to registry changes.
sidebarLabel: Lifecycle
sidebarGroup: Basics
order: 4
source: https://github.com/home-assistant/core/blob/dev/homeassistant/helpers/entity.py
lastVerified: 2026-10-21
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

The main hook. It runs as the last step of adding, right before the first state is written. The entity has its entity ID and registry entry by then. Use it to subscribe to updates, register listeners, or restore an earlier state.

The hook doesn't run when adding stops at an earlier step. But adding can still fail after the hook has started: when the hook raises, when adding is cancelled, or when writing the first state raises. `async_will_remove_from_hass` doesn't run in that case, so register the cleanup of anything you set up here with `async_on_remove`, like in the example below.

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

The hook doesn't run again when the user changes the entity ID, except for some entities of custom integrations. See [`async_entity_id_changed`](#async_entity_id_changedold_entity_id).

### `async_prepare_to_add_to_hass()`

Runs on every attempt to add the entity, before Home Assistant looks at the registry. It also runs for entities that won't be added in the end, for example because they are disabled. Use it for work that must happen before Home Assistant processes the registry entry, or even when the entity turns out to be disabled. For example, seed entity registry options that are read when the registry entry is created or looked up, or register the entity with a helper of your integration, so an entity that is created disabled can be enabled later.

You rarely need it. Keep in mind:

- Don't rely on `entity_id` or `registry_entry` here. Depending on how the entity is added, they may be unset, set by your integration, or left over from an earlier attempt.
- Raising an exception aborts adding.
- `async_added_to_hass` may never run, and `async_will_remove_from_hass` doesn't run when adding is aborted. `async_on_remove` callbacks do run, right when adding is aborted, also when the entity is disabled. Use `async_on_remove` to clean up what only matters for this attempt to add the entity. Don't use it for a registration that has to survive a disabled entity, like in the example below: that registration belongs to your integration, so keep it there, keyed on something stable like the unique ID.
- Don't write the state, and don't subscribe to updates that write it. The entity may not have an entity ID yet, so writing the state fails. Subscribe in `async_added_to_hass` instead.

```python
async def async_prepare_to_add_to_hass(self) -> None:
    """Run before the entity is added."""
    await super().async_prepare_to_add_to_hass()
    # Let the hub know about the entity, even when it turns out to be
    # disabled, so it can be enabled later. Not undone when adding is aborted.
    self._hub.register_known_entity(self.unique_id, self._channel)
```

> [!WARNING]
> `add_to_platform_start()`, `add_to_platform_finish()`, and `add_to_platform_abort()` of `Entity` are implementation details of the entity platform. Don't override them in your integration. Use the hooks on this page instead.

## Removing an entity

An entity is removed when its config entry unloads, when the user disables it, or when it is deleted from the entity registry. Stopping Home Assistant does not remove entities, so these hooks don't run on shutdown. If something must happen on shutdown, listen for `EVENT_HOMEASSISTANT_STOP`. When an entity is removed, Home Assistant:

1. Calls every callback registered with `async_on_remove`.
2. Calls `async_will_remove_from_hass()`.
3. Removes the state. Or, when the entity is still in the registry and enabled, like when the config entry is just unloaded, it sets the state to `unavailable` with a `restored` attribute.

### `async_on_remove(func)`

Registers a function to call when the entity is removed, or when adding it is aborted. Most subscription helpers return an unsubscribe function, so you can pass that straight in. This is the cleanest way to make sure you never leak a listener. The one exception is a subscription you replace later, for example when the entity ID changes. See [`async_entity_id_changed`](#async_entity_id_changedold_entity_id).

### `async_will_remove_from_hass()`

The counterpart of `async_added_to_hass`. Use it to undo work that `async_on_remove` can't, like closing a connection that belongs to this entity only.

It only runs for an entity that was added. When adding is aborted or fails, even after `async_added_to_hass` already ran, only the `async_on_remove` callbacks run. It also doesn't run when the user changes the entity ID, because the entity isn't removed, except for some entities of custom integrations. See [`async_entity_id_changed`](#async_entity_id_changedold_entity_id).

### `async_removed_from_registry()`

Runs when the entity is deleted from the entity registry, not just removed for now. Use it to clean up data stored outside the entity, like a file or a setting on the device that only made sense for this entity.

## Registry changes

The user can change an entity in the registry while it runs: rename it, give it another entity ID, change its options.

### `async_registry_entry_updated()`

Runs after the registry entry of the entity changed. `self.registry_entry` holds the new entry. Use it when your entity depends on registry options, like a unit or a precision the user picked.

### `async_entity_id_changed(old_entity_id)`

Runs when the user changed the entity ID. The entity is changed in place: it isn't removed and added again, so `async_will_remove_from_hass` and `async_added_to_hass` don't run. Unlike those hooks, this one is a `@callback` that runs in the event loop, so it must not await.

> [!IMPORTANT]
> Until Home Assistant 2027.11, custom integrations have to opt in to in-place changes. If a class of a custom integration implements `async_prepare_to_add_to_hass`, `async_added_to_hass`, or `async_will_remove_from_hass`, but neither that class nor a subclass of it implements `async_entity_id_changed`, its entities are still removed and added again when the entity ID changes. Then the add and remove hooks run again, and this hook doesn't run. See the [blog post about the new lifecycle hooks](/blog/2026/10/12/new-entity-lifecycle-hooks/).

By then, `self.entity_id` is the new ID, and the old ID is passed as `old_entity_id`. The state under the old ID is already removed, `async_registry_entry_updated` already ran, and Home Assistant has moved its own bookkeeping to the new ID, like registry tracking and restore state. The state under the new ID isn't written yet.

If you track something by your own entity ID, like a state change listener or a dispatcher signal keyed on `self.entity_id`, or a lookup table from entity IDs to entities, move it to the new ID here. Always call `super()`, so base classes can do the same. If your entity sets up nothing keyed on its own entity ID, you don't need this hook. A custom integration that implements the add or remove hooks still needs it to opt in to in-place changes, and then a hook that only calls `super()` is enough.

Home Assistant writes the state under the new ID when the hook returns, unless you already did. If you need your own state under the new ID, for example to render a template that references `this`, write it with `self.async_write_ha_state()` yourself, but only after calling `super()`, so base classes have updated what the state depends on.

Work that has to await can run in a task. Registry updates don't wait for that task, so after each `await`, check that the entity is still added and that `self.entity_id` didn't change again.

If the hook raises, Home Assistant logs the exception and the change completes anyway: the state is written under the new ID.

Take care that whatever you subscribe again is still cleaned up when the entity is removed. `self.async_on_remove(self._unsub_signal)` registers the unsubscribe function of the *first* subscription. After the entity ID changed, removing the entity calls that stale function again, and the new subscription leaks. Instead, register a callback once that calls the current unsubscribe function:

```python
async def async_added_to_hass(self) -> None:
    """Subscribe once the entity is added."""
    await super().async_added_to_hass()
    self._subscribe_signal()
    self.async_on_remove(lambda: self._unsub_signal())

@callback
def _subscribe_signal(self) -> None:
    """Subscribe to the signal for the current entity ID."""
    self._unsub_signal = async_dispatcher_connect(
        self.hass, f"{DOMAIN}_{self.entity_id}", self._handle_signal
    )

@callback
def async_entity_id_changed(self, old_entity_id: str) -> None:
    """Move the subscription to the new entity ID."""
    super().async_entity_id_changed(old_entity_id)
    self._unsub_signal()
    self._subscribe_signal()
```

Unsubscribing in `async_will_remove_from_hass` avoids the stale function too, but that hook doesn't run when adding fails after `async_added_to_hass` ran.

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

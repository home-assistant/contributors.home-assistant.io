---
title: Updating state
description: Keep an entity in sync with its device by polling or by push, write the state at the right moment, and report availability honestly.
sidebarLabel: Updating state
sidebarGroup: Basics
order: 3
---

An entity mirrors something outside Home Assistant: a device, a cloud service, a file. Something has to keep the two in sync. There are two ways to do that: Home Assistant asks the entity for news on a schedule (polling), or the entity tells Home Assistant when something changed (push).

Push is better when the device supports it. Changes show up right away, and nobody sends requests for nothing. Poll when the device or service only answers questions.

## Polling

[Polling](/glossary/polling/) is the default: `should_poll` is `True`. Home Assistant calls the update method of the entity at a fixed interval, and writes the state afterwards. Implement one of them:

```python
class ExampleSensor(SensorEntity):
    async def async_update(self) -> None:
        """Fetch the latest value from the device."""
        self._attr_native_value = await self._device.read_temperature()
```

Use `update()` instead when your library is synchronous. Home Assistant then runs it in a thread for you. Like every property, the state properties should only return what the update method stored.

### Polling interval

The interval comes from `SCAN_INTERVAL` in the platform module of your integration, like `sensor.py`:

```python
from datetime import timedelta

SCAN_INTERVAL = timedelta(minutes=5)
```

Without it, the default of the domain is used, like 30 seconds for sensors and switches, or 15 seconds for domains that don't set one. When an update takes longer than 10 seconds, Home Assistant logs a warning. Pick an interval the device or the API can handle comfortably.

### Parallel updates

`PARALLEL_UPDATES` in the platform module limits how many entities of that platform update or run an action at the same time:

```python
# One request at a time: the device can't handle more
PARALLEL_UPDATES = 1
```

Without it, the first entity of the platform that is added decides the limit for the whole platform: 1 when it has a synchronous `update()` method, and no limit otherwise. `0` also means no limit.

### Polling through a coordinator

When one request returns the data of many entities, polling each entity separately is wasteful. Use a [coordinator](/glossary/coordinator/) instead: it fetches the data once per interval, and its entities (based on `CoordinatorEntity`) are push entities that write their state when the coordinator has new data. Most integrations with more than a handful of polled entities work this way.

## Push

For push, set `should_poll` to `False`, subscribe to the updates of your device or library when the entity is added, and write the state when a message arrives.

```python
class ExampleSensor(SensorEntity):
    _attr_should_poll = False

    async def async_added_to_hass(self) -> None:
        """Subscribe to updates once the entity is added."""
        self.async_on_remove(
            self._device.subscribe(self._handle_update)
        )

    @callback
    def _handle_update(self, value: float) -> None:
        """Store the new value and write it."""
        self._attr_native_value = value
        self.async_write_ha_state()
```

`async_on_remove` makes sure the subscription is cleaned up when the entity goes away. See [the entity lifecycle](/core/entities/lifecycle/).

## Writing the state

These methods write the state of the entity to the state machine. Pick the one that fits the thread you are in.

| Method | Use it |
| --- | --- |
| `async_write_ha_state()` | From the event loop, after you changed the `_attr_` values. This is the one you use most. It doesn't fetch anything. |
| `schedule_update_ha_state()` | From another thread, like a callback of a synchronous library. It schedules the write on the event loop. |
| `async_schedule_update_ha_state(force_refresh=True)` | From the event loop, when Home Assistant should call your update method first. |
| `schedule_update_ha_state(force_refresh=True)` | The same, from another thread. |

Calling `async_write_ha_state()` from outside the event loop is not thread safe, and Home Assistant reports it. With `force_refresh=False`, the `async_schedule_update_ha_state` method just calls `async_write_ha_state`.

What to write after an action, like turning on a light, has its own section: [after a command](#after-a-command).

### Update before add

Pass `update_before_add=True` to `async_add_entities` to call the update method once before the entity is added, so it starts with real data instead of `unknown`. The first state is then delayed until that update finishes, which slows down the setup of your integration. With a coordinator, fetch the first data during setup instead.

## After a command

When a user turns on a light, your entity sends a command to the device. Then you have a choice: show the new state right away, or wait until the device confirms it. Writing the expected state right away is called an _optimistic update_.

There is no universal right answer. It depends on how the device behaves:

- **The device pushes its new state back.** Wait for it. Local devices with push updates confirm a change within moments, and the state you then write is the real one. Don't write anything after the command.
- **You poll a device that reports its state.** Don't wait for the next interval: ask for a refresh right after the command. With a coordinator, call `await self.coordinator.async_request_refresh()`. The first request refreshes right away, and more requests within 10 seconds are batched into one refresh. The switches of the AirGradient integration (`airgradient/switch.py`) work this way.
- **The device is slow to confirm.** A cloud service that takes a while to reflect a change, or an API you can only poll every few minutes, leaves the user looking at the old state for too long. An optimistic update makes sense here. The next poll corrects the state if the command didn't stick.
- **The device can't report its state at all.** Think of a device controlled with infrared or radio frequency, or an MQTT switch without a state topic. Optimistic is the only option, and the entity also sets `assumed_state`, see below.

An optimistic update looks like this. Write the state only after the command succeeded: when sending fails, raise an error and leave the state alone. Don't show a state the device never accepted.

```python
async def async_turn_on(self, **kwargs: Any) -> None:
    """Turn the fan on."""
    await self._device.send(Command.ON)
    self._attr_is_on = True
    self.async_write_ha_state()
```

### Assumed state

Set `_attr_assumed_state = True` when the state is a guess, because the device can't report it. The frontend then shows separate on and off buttons instead of a toggle, and keeps both open and close available for a cover, so the user can always send the command they need, even when the guess is wrong.

Entities like this can restore their last state after a restart with `RestoreEntity`, because there is nothing to ask. Two examples in Core:

- The fan of the Dyson infrared integration (`dyson_infrared/fan.py`) always assumes its state. It writes the new state right after sending each infrared command.
- An MQTT switch (`mqtt/switch.py`) without a state topic, or with `optimistic` set by the user, is optimistic. It sets `assumed_state`, writes the state after publishing a command, and restores its last state on startup.

## Availability

The `available` property tells Home Assistant if it can reach the device. When it returns `False`, the state becomes [`unavailable`](/glossary/unavailable/), the state attributes and extra state attributes are left out (capability attributes, the unit, and the device class stay), and the frontend shows the entity as unavailable.

```python
async def async_update(self) -> None:
    try:
        value = await self._device.read_temperature()
    except ExampleConnectionError:
        self._attr_available = False
        return

    self._attr_available = True
    self._attr_native_value = value
```

Mark an entity unavailable when you can't get data, not when the data is just missing: a sensor that has no value right now should report `None`, which becomes `unknown`. Log the first failure, and log once when the device is back, instead of on every update.

## Force update

By default, Home Assistant only writes a new state when the state or the attributes changed. Writing the same value again just updates the `last_reported` timestamp. Set `force_update` to `True` when every reading should count as an update, like for a sensor that reads directly from hardware. Use it sparingly: every forced update is a state change event that automations and the recorder process.

## Keep the database small

Every state change ends up in the database. An entity that changes often, with attributes that change often, quickly fills it. Keep extra attributes few and stable, and move fast changing values into their own sensor entities. See [state and attributes](/core/entities/state-attributes/).

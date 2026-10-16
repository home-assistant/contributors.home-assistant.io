---
title: Events in integrations
description: Make events of your devices available to users, and react to what happens inside Home Assistant with the event helpers.
sidebarGroup: Data and updates
order: 2
sidebarLabel: Events
---

Everything that happens in Home Assistant goes over the event bus: state changes, action calls, and the start and stop of Home Assistant itself. Your integration can put its own [events](/glossary/event/) on that bus, and it can listen to what happens.

This page is about using events in your integration. How the bus works underneath, like what an event object holds, how listeners run, and event filters, is on [how core works: events](/core/internals/events/).

## Make device events available

Many devices have events that are not a state: a button was pressed, motion was detected, a doorbell rang.

The preferred way to offer them is an [event entity](/core/entities/event/). Users can find all events of a device in one place, and use them in automations like any other entity.

### Fire events on the bus

Some integrations fire events on the event bus directly. Name the event type `<domain>_event`, like `zha_event`, and add the `device_id` from the [device registry](/core/integrations/device-registry/) when the event belongs to a device:

```python
hass.bus.async_fire(
    "example_event",
    {
        "device_id": device_entry.id,
        "type": "button_pressed",
    },
)
```

If a device only fires events and has no entities, [register it in the device registry yourself](/core/integrations/device-registry/#register-a-device-yourself), so there is a device to attach the events to.

A few rules:

- Turn events of your devices into Home Assistant events from the setup of the integration (`async_setup_entry` in `__init__.py`), not from entity code.
- Do not fake events with state. A binary sensor that is `on` for 30 seconds after a button press is not an event.
- Users find bus events hard to discover. [Device triggers](/core/integrations/device-automations/) used to be how integrations made them visible, but new device automations are no longer accepted. Use an event entity.

## Listen to Home Assistant

Your integration may need to act when something happens inside Home Assistant. Use the helpers in `homeassistant.helpers.event` when one fits: they are optimized to call your code only for the changes you care about, which matters on a system with thousands of entities. Listen to the bus directly only when there is no helper.

Every helper returns a function that removes the listener. Register it with `entry.async_on_unload` (or `self.async_on_remove` in an entity), so the listener stops when the config entry unloads:

```python
from homeassistant.core import Event, EventStateChangedData, callback
from homeassistant.helpers.event import async_track_state_change_event


@callback
def _async_outside_temperature_changed(
    event: Event[EventStateChangedData],
) -> None:
    """React to a new outside temperature."""
    if (new_state := event.data["new_state"]) is None:
        return
    ...


entry.async_on_unload(
    async_track_state_change_event(
        hass, ["sensor.outside_temperature"], _async_outside_temperature_changed
    )
)
```

Most helpers also exist without the `async_` prefix, for code that does not run in the event loop.

### State changes

| Helper | Use it to |
| --- | --- |
| `async_track_state_change_event` | Follow state changes of specific entities |
| `async_track_state_added_domain` | Follow entities that are added to one or more domains |
| `async_track_state_removed_domain` | Follow entities that are removed from one or more domains |
| `async_track_state_change_filtered` | Follow state changes with a filter you can update later |
| `async_track_same_state` | Run something when entities keep a state for a period of time |

### Templates

| Helper | Use it to |
| --- | --- |
| `async_track_template` | Run something when a template becomes true |
| `async_track_template_result` | Run something when the result of a template changes |

### Registries

| Helper | Use it to |
| --- | --- |
| `async_track_entity_registry_updated_event` | Follow registry changes of specific entities |
| `async_track_device_registry_updated_event` | Follow registry changes of specific devices |

### Time

| Helper | Use it to |
| --- | --- |
| `async_call_later` | Run something once, after a delay |
| `async_track_point_in_time` | Run something once, at a point in time |
| `async_track_point_in_utc_time` | Run something once, at a point in time in UTC |
| `async_track_time_interval` | Run something repeatedly, at an interval |
| `async_track_time_change` | Run something when the local time matches a pattern |
| `async_track_utc_time_change` | Run something when the UTC time matches a pattern |
| `async_track_sunrise` | Run something every day, at an offset from sunrise |
| `async_track_sunset` | Run something every day, at an offset from sunset |

Most time helpers call your function with the moment it runs, as a `datetime`. The sunrise and sunset helpers call it without arguments. Watch the order of the arguments: `async_track_point_in_time(hass, action, point_in_time)` and `async_track_time_interval(hass, action, interval)` take your function first, but `async_call_later(hass, delay, action)` takes the delay first, in seconds or as a `timedelta`.

If you need to poll, use a [coordinator](/core/integrations/fetching-data/) instead of `async_track_time_interval`.

### Start of Home Assistant

To run something once Home Assistant has started, use `async_at_started` from `homeassistant.helpers.start`. It runs right away if Home Assistant is already running, which is the case when a user adds your integration later. `async_at_start` does the same for the earlier start phase.

```python
from homeassistant.helpers.start import async_at_started

entry.async_on_unload(async_at_started(hass, _async_start_export))
```

## Listen to the bus directly

When there is no helper, listen to the bus with `hass.bus.async_listen` or, for an event that you only need once, `hass.bus.async_listen_once`. Both return a function that removes the listener.

```python
from homeassistant.const import EVENT_HOMEASSISTANT_STOP

entry.async_on_unload(
    hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STOP, _async_disconnect)
)
```

`EVENT_HOMEASSISTANT_START`, `EVENT_HOMEASSISTANT_STARTED`, and `EVENT_HOMEASSISTANT_STOP` only fire once per run, so `async_listen_once` is the right call for them.

| Event | Fired when |
| --- | --- |
| `EVENT_HOMEASSISTANT_START` | Setup is done, and Home Assistant enters the start phase |
| `EVENT_HOMEASSISTANT_STARTED` | All integrations have had a chance to load. Often used by voice assistants and by integrations that export states. |
| `EVENT_HOMEASSISTANT_STOP` | Home Assistant enters the stop phase |
| `EVENT_HOMEASSISTANT_FINAL_WRITE` | The last chance to write data to disk |
| `EVENT_HOMEASSISTANT_CLOSE` | Teardown |
| `EVENT_STATE_CHANGED` | The state of an entity changed. Use the [state change helpers](#state-changes) instead. |
| `EVENT_ENTITY_REGISTRY_UPDATED` | The entity registry changed. Use the [registry helpers](#registries) instead. |
| `EVENT_COMPONENT_LOADED` | An integration finished loading. Use `async_at_start` instead. |
| `EVENT_SERVICE_REGISTERED`, `EVENT_SERVICE_REMOVED` | An action was registered or removed |
| `EVENT_CALL_SERVICE` | An action was called |
| `EVENT_CORE_CONFIG_UPDATE` | The core configuration changed |
| `EVENT_THEMES_UPDATED` | The themes changed |

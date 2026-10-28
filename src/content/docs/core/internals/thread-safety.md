---
title: Thread safety
description: Which API to call when your code runs outside the event loop, and how to fix the thread safety errors Home Assistant reports.
sidebarGroup: Async
order: 11
---

Nearly everything in asyncio is not thread safe, and neither are the core objects of Home Assistant. Calling an `async_` method from another thread can corrupt the internal state of the event loop. The result is not a clean error, but random misbehavior and restarts that are very hard to trace back.

So Home Assistant checks. Many `async_` APIs verify they are called from the event loop thread. If not, Home Assistant reports the call with a stack trace, and blocks it to keep the system stable. If you got here from such a report: the stack trace points at the code that made the call.

## The rule

- In the event loop, in a coroutine or a `@callback`: call the `async_` version.
- In another thread, like an executor job or a callback from a sync library: call the version without `async_`, or schedule the work on the event loop.

## The usual cause: a missing @callback

Helpers that take a function decide how to run it by looking at it. A coroutine function or a function decorated with `@callback` runs in the event loop. Anything else is assumed to be blocking and runs in the executor.

```python
from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import Event, EventStateChangedData, callback
from homeassistant.helpers.event import async_track_state_change_event


async def async_added_to_hass(self) -> None:
    """Start tracking the other light."""
    self.async_on_remove(
        async_track_state_change_event(
            self.hass, ["light.other"], self._async_light_changed
        )
    )


@callback
def _async_light_changed(
    self, event: Event[EventStateChangedData]
) -> None:
    """Follow the state of the other light."""
    new_state = event.data["new_state"]
    if new_state is None or new_state.state in (
        STATE_UNAVAILABLE,
        STATE_UNKNOWN,
    ):
        return

    self.async_write_ha_state()
```

Without `@callback`, `_async_light_changed` runs in a thread, and `async_write_ha_state` is called from the wrong thread. The fix is one line.

## From a thread: what to call instead

| In the event loop | From another thread |
| --- | --- |
| `hass.async_create_task` | `hass.create_task` |
| `hass.bus.async_fire` | `hass.bus.fire` |
| `hass.services.async_register` | `hass.services.register` |
| `hass.services.async_remove` | `hass.services.remove` |
| `hass.states.async_set` | `hass.states.set` |
| `self.async_write_ha_state()` | `self.schedule_update_ha_state()` |
| `async_dispatcher_send` | `dispatcher_send` |
| `issue_registry.async_create_issue` | `issue_registry.create_issue` |
| `issue_registry.async_delete_issue` | `issue_registry.delete_issue` |

Some APIs have no thread safe version at all:

- The area, category, device, entity, floor, and label registries, including `async_get_or_create`, `async_update_entity`, `async_update_device`, and `async_remove`.
- `hass.config_entries.async_update_entry` and `hass.config_entries.async_update_subentry`.
- Rendering templates, like `async_render_to_info`.
- Ignoring an issue with `issue_registry.async_ignore_issue`.
- Refreshing a set of issues with `issue_registry.async_refresh_issues`, and keeping an issue with `issue_registry.async_keep_issue`. See [refresh from another thread](/core/integrations/repairs/#refresh-from-another-thread).

For those, schedule a function on the event loop that makes the call. `hass.add_job` does that from any thread:

```python
from homeassistant.core import callback


@callback
def _async_update_title(entry: ConfigEntry, title: str) -> None:
    """Update the title of the config entry."""
    hass.config_entries.async_update_entry(entry, title=title)


# In a thread:
hass.add_job(_async_update_title, entry, "New title")
```

Better still: ask yourself why the code runs in a thread. Often it is a sync library that could be wrapped once, at the edge, so the rest of your integration lives in the event loop.

## Find errors early

Turn on debug mode while you develop, with `debug: true` under `homeassistant:` in `configuration.yaml`. Home Assistant then checks more calls, and reports them right away. See [async in Home Assistant](/core/internals/asyncio/#find-mistakes-early).

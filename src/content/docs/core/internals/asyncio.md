---
title: Async in Home Assistant
description: Why Home Assistant runs on one asyncio event loop, the kinds of functions you write, and how to move work in and out of the loop.
sidebarLabel: Async in Home Assistant
sidebarGroup: Async
order: 10
---

Home Assistant Core runs on Python's `asyncio`. All core objects, like the state machine, the event bus, and the registries, live in one thread: the [event loop](/glossary/event-loop/). Only one piece of code runs there at a time. Between two `await`s, your code runs without anything else running in between, so a state change is never half done when other code looks at it.

That has two sides. When a coroutine awaits something, like a network response, other code runs in the meantime. So a job that spans an `await` can still need an `asyncio.Lock` to keep two runs of it apart. The coordinator does that for its refreshes, for example. But when code in the event loop _blocks_, like a network call from a synchronous library or reading a file from disk, _everything_ waits. A single blocking call makes the whole system sluggish. Most of this page is about avoiding that.

New to asyncio? The Python documentation on [developing with asyncio](https://docs.python.org/3/library/asyncio-dev.html) is a good start, and so is [this talk by Robert Smallshire](https://www.youtube.com/watch?v=M-UcUs7IMIM) on how and why asyncio works the way it does.

## The kinds of functions

Home Assistant has a naming convention: a function whose name starts with `async_` must be run in the event loop. There are four kinds of functions you deal with.

### Coroutine functions

Declared with `async def`. Calling one returns a coroutine, which does nothing until it is awaited or scheduled as a task. While it awaits, other work runs in the event loop.

```python
async def async_update_data(self) -> None:
    """Fetch the latest data from the device."""
    self._data = await self._client.async_get_status()
```

Use these for anything that waits on I/O, as long as the library you call is async.

### Callbacks

A plain function decorated with `@callback` from `homeassistant.core`. It promises to be safe to run in the event loop: it does no I/O and never blocks. It cannot await anything, but it can schedule a task.

```python
from homeassistant.core import Event, callback


@callback
def _async_handle_event(self, event: Event) -> None:
    """Handle an event from the bus."""
    self._last_event = event.data
    self.async_write_ha_state()
```

Why not make everything a coroutine? Speed and consistency. Home Assistant runs a callback right away. A coroutine must be wrapped in a task and scheduled, and every `await` is a point where other code runs in between. Event listeners, state change handlers, and small helpers are callbacks in core.

Forgetting `@callback` is a common bug. Home Assistant then treats the function as blocking and runs it in a thread, where calling `async_` APIs is not thread safe. See [thread safety](/core/internals/thread-safety/).

### Thread safe functions

Functions that only compute, like `sum()` or merging two dictionaries, are safe anywhere. There is no marker for them. When in doubt, read their implementation.

### Everything else

Functions that do I/O, sleep, or are not known to be safe. They must not run in the event loop. Run them in the executor.

## Move blocking work to the executor

The executor is a pool of threads for blocking code. From the event loop, hand a function to it with `hass.async_add_executor_job` and await the result:

```python
data = await hass.async_add_executor_job(client.get_status)
```

Arguments go after the function. For keyword arguments, wrap the call in `functools.partial`:

```python
from functools import partial

data = await hass.async_add_executor_job(
    partial(client.get_status, include_history=True)
)
```

Prefer async libraries when they exist. An executor thread is much more expensive than a coroutine, and the pool is not unlimited. See [blocking operations](/core/internals/blocking-operations/) for the calls Home Assistant detects, and what to do about them.

## Start work in the background

To start a coroutine without waiting for it, create a task. In an integration, use the methods on the config entry, so the task is tied to the life of the entry:

```python
entry.async_create_background_task(
    hass, self._async_listen(), "my_integration listener"
)
```

- `entry.async_create_task(hass, coro)` and `hass.async_create_task(coro)` create a task that Home Assistant waits for during startup.
- `entry.async_create_background_task(hass, coro, name)` and `hass.async_create_background_task(coro, name)` create a task for something that runs a long time, like a listener on a socket. It does not hold up startup, and it is cancelled on shutdown. The config entry version is also cancelled when the entry is unloaded.

## Call async code from a thread

Sometimes you are in a thread, like a callback from a sync library, and need to call something async. Use the sync version of the API if there is one, like `hass.bus.fire` instead of `hass.bus.async_fire`. Otherwise, schedule a coroutine on the loop and wait for the result:

```python
import asyncio


def say_hello(hass: HomeAssistant, target: str) -> str:
    """Call async code from a thread and wait for it."""
    return asyncio.run_coroutine_threadsafe(
        async_say_hello(hass, target), hass.loop
    ).result()
```

> [!WARNING]
> Never do this from inside the event loop: it deadlocks. And be careful when the coroutine itself uses the executor, because that can deadlock too.

## Make your code async

If you work on an integration that still uses sync code, these are the async counterparts:

| Sync | Async |
| --- | --- |
| `def setup(hass, config)` | `async def async_setup(hass, config)` |
| `def update(self)` on an entity | `async def async_update(self)` |
| `def turn_on(self, **kwargs)` | `async def async_turn_on(self, **kwargs)` |

Entity properties are read from the event loop. Never do I/O in a property: fetch the data in the update method or a [coordinator](/glossary/coordinator/), and return what you stored.

## Find mistakes early

Turn on debug mode while you develop. It makes Home Assistant check for many thread safety and blocking errors, and report them with a stack trace. Add this to `configuration.yaml`:

```yaml
homeassistant:
  debug: true
```

You can also start Home Assistant with Python's [asyncio debug mode](https://docs.python.org/3/library/asyncio-dev.html#debug-mode), which reports coroutines that are never awaited and callbacks that take too long.

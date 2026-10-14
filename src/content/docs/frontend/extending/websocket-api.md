---
title: Add a WebSocket command
description: Make data from your integration available to the frontend with a WebSocket command in Core, and call it from the frontend.
order: 3
---

The frontend talks to Core over a WebSocket connection. When your integration has data the frontend needs, and it is not an entity state or an attribute, add a WebSocket command. Commands can answer once, or keep sending updates as a subscription.

## In Core

A command is a function with a decorator that sets its message type and the schema of its data. The type is prefixed with the domain of your integration.

```python
from typing import Any

import probatio

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback


@websocket_api.websocket_command(
    {
        probatio.Required("type"): "example/get_status",
        probatio.Required("device_id"): str,
    }
)
@callback
def ws_get_status(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return the status of a device."""
    status = hass.data[DOMAIN].get(msg["device_id"])
    if status is None:
        connection.send_error(msg["id"], "not_found", "Device not found")
        return

    connection.send_result(msg["id"], {"status": status})
```

Register the command when your integration is set up:

```python
async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the example integration."""
    websocket_api.async_register_command(hass, ws_get_status)
    return True
```

Your integration does not need `websocket_api` as a dependency in its manifest. The command is registered either way, and is available as soon as the WebSocket API runs.

A function decorated with `@callback` runs in the [event loop](/glossary/event-loop/), so it must not do any I/O. When your command has to wait, for a device or the network, make it `async` and add `@websocket_api.async_response` below `websocket_command`:

```python
@websocket_api.websocket_command(
    {probatio.Required("type"): "example/refresh"}
)
@websocket_api.async_response
async def ws_refresh(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Refresh all devices."""
    await hass.data[DOMAIN].async_refresh()
    connection.send_result(msg["id"])
```

Add `@websocket_api.require_admin` to a command that only administrators may use.

### Subscriptions

For data that changes, send the first result, then send an event with the same message ID on every change. Store a function that stops the updates in `connection.subscriptions`, and Core calls it when the frontend unsubscribes or disconnects:

```python
@websocket_api.websocket_command(
    {probatio.Required("type"): "example/subscribe_status"}
)
@callback
def ws_subscribe_status(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Send status updates to the frontend."""

    @callback
    def on_update(status: dict[str, Any]) -> None:
        connection.send_event(msg["id"], status)

    connection.subscriptions[msg["id"]] = hass.data[DOMAIN].subscribe(
        on_update
    )
    connection.send_result(msg["id"])
```

The [WebSocket API reference](/core/internals/websocket-api/) covers the WebSocket API of Core in more depth.

## In the frontend

Add the types and a function for your command to a module in `src/data/`, named after your integration. Components call that function, never the raw message:

```ts
export interface ExampleStatus {
  status: string;
}

export const fetchExampleStatus = (
  hass: HomeAssistant,
  deviceId: string
) =>
  hass.callWS<ExampleStatus>({
    type: "example/get_status",
    device_id: deviceId,
  });

export const subscribeExampleStatus = (
  conn: Connection,
  onChange: (status: ExampleStatus) => void
) =>
  conn.subscribeMessage<ExampleStatus>(onChange, {
    type: "example/subscribe_status",
  });
```

`hass.callWS()` returns a promise that rejects with the error when Core sends one. `subscribeMessage()` returns a promise of a function that unsubscribes. In a component, return it from `hassSubscribe()` and `SubscribeMixin` cleans it up. [The data layer](/frontend/architecture/data/) explains the patterns.

Custom cards and panels can call your command the same way, with `hass.callWS()` or `hass.connection.subscribeMessage()`.

---
title: The action registry
description: How the action registry works underneath, what an action handler gets, and how to call actions from code.
sidebarGroup: The core
order: 4
sidebarLabel: Actions
---

This page explains how the action registry works underneath: what a handler gets, how the data is validated, and how actions are called. To register actions in your integration, describe them in `services.yaml`, and return response data, see [actions in integrations](/core/integrations/actions/).

An [action](/glossary/action/) is something Home Assistant can do on request, like `light.turn_on` or `weather.get_forecasts`. Automations, scripts, dashboards, voice assistants, and the APIs all call actions. Every action lives in the action registry on `hass.services`.

> [!NOTE]
> Actions used to be called services. The code still says service almost everywhere: `hass.services`, `ServiceCall`, `services.yaml`, and the `call_service` event. In text, write action. In code, use the names the code uses.

## The registry

`hass.services.async_register(domain, service, handler)` adds an action to the registry. It takes an optional `schema`, and `supports_response` for actions that return data. Integrations should register their actions from `async_setup`, through `async_setup_services` in their `services.py`. See [register actions in async_setup](/core/integrations/actions/#register-actions-in-async_setup).

Home Assistant uses `probatio` for schemas. Import it as `probatio`, without an alias. When you register a schema, it runs before your handler, so invalid data never reaches you. Without a schema, `call.data` is whatever the caller sent.

## The handler

The handler gets a `ServiceCall` with:

- `call.data`: the validated data, read-only.
- `call.context`: the `Context` of the call, with the user who started it. Pass it on to anything you do on their behalf. See [permissions](/core/internals/permissions/).
- `call.domain` and `call.service`: which action was called.
- `call.return_response`: whether the caller asked for response data.
- `call.hass`: the Home Assistant instance.

The handler can be a coroutine function, a function decorated with `@callback`, or a plain function. A plain function runs in the executor, like an [event listener](/core/internals/events/#listen-for-events).

When something goes wrong, the handler raises an exception. It never returns an error code, also not in response data. Which exception to raise is on [raise errors](/core/integrations/actions/#raise-errors).

Actions that act on entities do not register a plain handler. `async_register_platform_entity_service` from `homeassistant.helpers.service` resolves the target the user picked (entities, devices, areas, floors, or labels), checks permissions, and calls a method on each targeted entity. See [entity actions](/core/integrations/actions/#entity-actions).

## Call an action

```python
await hass.services.async_call(
    "light",
    "turn_on",
    {"brightness": 255},
    target={"entity_id": "light.kitchen"},
    blocking=True,
    context=call.context,
)
```

- `blocking=True` waits until the action is done, and raises its exceptions. With `blocking=False`, the call is started in the background, and errors only end up in the log.
- `return_response=True` returns the response data. It only works together with `blocking=True`, and only for actions that support responses.
- `context`: pass the context of whatever caused this call, so it is attributed correctly.

Calling an action from your own integration is unusual. Talk to your own code directly. Calling another integration's actions is mostly something automations and scripts do.

## What happens under the hood

When an action is called, the registry looks up the handler, validates the data against the schema if there is one, fires a `call_service` event on the [event bus](/core/internals/events/), and runs the handler. `hass.services.async_services()` returns everything that is registered, and `hass.services.has_service(domain, service)` checks for one. Registering and removing actions fire the `service_registered` and `service_removed` events.

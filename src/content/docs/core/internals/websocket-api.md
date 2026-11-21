---
title: WebSocket API
description: The API the frontend uses. How a connection works, the core commands, error handling, and how to add your own commands from an integration.
sidebarGroup: APIs
order: 31
---

Home Assistant serves a WebSocket API at `/api/websocket`. It is the main API: the frontend and the companion apps use it for nearly everything, and it can stream changes as they happen. Integrations add their own commands to it, so there are far more commands than this page lists.

For JavaScript, use the [home-assistant-js-websocket](https://github.com/home-assistant/home-assistant-js-websocket) library. It handles authentication, reconnecting, and subscriptions, and it is what the frontend uses.

## How a connection works

1. The client connects. The server sends `auth_required`.
2. The client sends an `auth` message with an access token.
3. The server answers `auth_ok`, or `auth_invalid` and closes the connection.
4. The command phase starts. The client sends commands, and the server sends results and subscription messages.
5. Either side closes the connection.

Every message is a JSON object with a `type`. In the command phase, every message from the client also has an `id`: a number that increases with each command. The server puts that `id` on everything it sends back, so you can match answers to commands.

## Authentication

Right after connecting, the server sends:

```json
{
  "type": "auth_required",
  "ha_version": "2026.10.0"
}
```

Send an access token. See the [authentication API](/core/internals/auth-api/) for how to get one.

```json
{
  "type": "auth",
  "access_token": "ABCDEFGH"
}
```

If the token is valid:

```json
{
  "type": "auth_ok",
  "ha_version": "2026.10.0"
}
```

If not, you get `auth_invalid` with a `message`, and the server disconnects.

## Enable features

Right after authenticating, a client can turn on optional features with `supported_features`. Today, the one feature is `coalesce_messages`: the server then bundles messages and sends them in bulk, as a JSON list, instead of one by one.

```json
{
  "id": 1,
  "type": "supported_features",
  "features": {
    "coalesce_messages": 1
  }
}
```

## Results and errors

The server answers each command with a `result`, except `ping`, which gets a `pong`:

```json
{
  "id": 6,
  "type": "result",
  "success": true,
  "result": null
}
```

When something goes wrong, `success` is `false` and `error` has a `code` and a `message`:

```json
{
  "id": 12,
  "type": "result",
  "success": false,
  "error": {
    "code": "invalid_format",
    "message": "Message incorrectly formatted: required key not provided"
  }
}
```

Error codes include `invalid_format`, `not_found`, `not_allowed`, `not_supported`, `unauthorized`, `unknown_command`, `id_reuse`, `home_assistant_error`, `service_validation_error`, `template_error`, `timeout`, and `unknown_error`. When the error comes from a `HomeAssistantError` with translation information, the error also has `translation_domain`, `translation_key`, and `translation_placeholders`, so the frontend can show it in the user's language.

## Core commands

These are the commands of the `websocket_api` integration itself.

### Subscribe to events

```json
{
  "id": 18,
  "type": "subscribe_events",
  "event_type": "state_changed"
}
```

Leave out `event_type` to get all events. That, and most event types, need an admin. Every event comes in as a message of type `event`, with the `id` of the subscription:

```json
{
  "id": 18,
  "type": "event",
  "event": {
    "event_type": "state_changed",
    "data": {
      "entity_id": "light.kitchen",
      "old_state": {},
      "new_state": {}
    },
    "origin": "LOCAL",
    "time_fired": "2026-10-10T10:37:24.265429+00:00",
    "context": {
      "id": "01J9Z7K1M3S8TQ0Y6E4H2B5N7C",
      "parent_id": null,
      "user_id": null
    }
  }
}
```

The states are shortened here. To follow states, `subscribe_entities` is more efficient.

### Unsubscribe

Ends any subscription. `subscription` is the `id` of the command that started it.

```json
{
  "id": 19,
  "type": "unsubscribe_events",
  "subscription": 18
}
```

### Subscribe to entities

`subscribe_entities` is how the frontend follows states. It sends all states the user may read first, then only the changes, in a compact format. Pass `entity_ids` to limit it.

```json
{
  "id": 20,
  "type": "subscribe_entities",
  "entity_ids": ["light.kitchen"]
}
```

Each `event` message holds a map with up to three keys: `a` for added entities with their full compressed state, `c` for changed entities with only what changed (under `+`, and removed attributes under `-`), and `r` for the IDs of removed entities. In a compressed state, `s` is the state, `a` the attributes, `c` the context, `lc` last changed, and `lu` last updated.

### Subscribe to a trigger

**Admin.** Subscribes to one or more [triggers](/glossary/trigger/), in the same format as in automations. You get an `event` message each time a trigger fires, with the trigger variables.

```json
{
  "id": 2,
  "type": "subscribe_trigger",
  "trigger": {
    "trigger": "state",
    "entity_id": "binary_sensor.motion",
    "to": "on"
  }
}
```

### Call an action

```json
{
  "id": 24,
  "type": "call_service",
  "domain": "light",
  "service": "turn_on",
  "service_data": {
    "brightness": 255
  },
  "target": {
    "entity_id": "light.kitchen"
  }
}
```

`service_data` and `target` are optional. The result has the `context` of the call. To get [response data](/core/integrations/actions/#return-response-data), add `"return_response": true`. The result then also has a `response`:

```json
{
  "id": 24,
  "type": "result",
  "success": true,
  "result": {
    "context": {
      "id": "01J9Z7K1M3S8TQ0Y6E4H2B5N7C",
      "parent_id": null,
      "user_id": "31ddb597e03147118cf8d2f8fbea5553"
    },
    "response": {}
  }
}
```

### Fire an event

**Admin.** Fires an event, with optional `event_data`. The result has the `context`.

```json
{
  "id": 25,
  "type": "fire_event",
  "event_type": "my_integration_button_pressed",
  "event_data": {
    "button_id": "front_door"
  }
}
```

### Get things

Each of these takes only an `id` and a `type`, and returns its data in the `result`:

- `get_states`: all states the user may read.
- `get_config`: the [core configuration](/core/internals/hass/#the-core-configuration).
- `get_services`: all actions, with their descriptions.
- `get_panels`: the registered panels. This one comes from the `frontend` integration.

### Ping

Send `{"id": 19, "type": "ping"}` and the server answers `{"id": 19, "type": "pong"}`. Use it as a heartbeat to check the connection is alive.

### Validate configuration

`validate_config` checks `triggers`, `conditions`, and `actions` as if they were part of an automation. Each key is optional, and only the keys you send come back.

```json
{
  "id": 30,
  "type": "validate_config",
  "triggers": [],
  "conditions": [],
  "actions": []
}
```

```json
{
  "id": 30,
  "type": "result",
  "success": true,
  "result": {
    "triggers": {"valid": true, "error": null},
    "conditions": {"valid": false, "error": "Invalid condition"},
    "actions": {"valid": true, "error": null}
  }
}
```

### Work with targets

These commands take a `target` in the same format as an action call, with `entity_id`, `device_id`, `area_id`, `floor_id`, and `label_id`. The target can have an `exclude` block with the same keys, and the results leave out whatever it matches:

- `extract_from_target`: resolves the target into `referenced_entities`, `referenced_devices`, and `referenced_areas`, and lists what does not exist under `missing_devices`, `missing_areas`, `missing_floors`, and `missing_labels`. With `"expand_group": true`, groups are replaced by their members. Defaults to `false`.
- `get_triggers_for_target`, `get_conditions_for_target`, and `get_services_for_target`: return the triggers, conditions, or actions that apply to at least one entity of the target, like `light.turn_on`. Here, `expand_group` defaults to `true`.

### More commands

The core commands also include `render_template`, `subscribe_condition`, `test_condition`, `execute_script`, `entity/source`, `manifest/list`, `manifest/get`, and `integration/setup_info`. Beyond those, almost every integration with a UI registers commands of its own. A few that apps and other clients rely on are described below, under [integration commands](#integration-commands). For the rest, the frontend source is the best place to see how they are called.

## Integration commands

These commands don't come from `websocket_api` itself, but from integrations that are always loaded when the frontend is. Companion apps and other clients use them, so their format is a contract.

### List entities for display

`config/entity_registry/list_for_display` comes from the `config` integration. It returns the entity registry in a compact format: just what a client needs to show entities, with short keys to keep the message small. Any authenticated user can call it. It takes no parameters.

```json
{
  "id": 40,
  "type": "config/entity_registry/list_for_display"
}
```

```json
{
  "id": 40,
  "type": "result",
  "success": true,
  "result": {
    "entity_categories": {"0": "config", "1": "diagnostic"},
    "entities": [
      {
        "ei": "light.living_room",
        "pl": "hue",
        "ai": "living_room",
        "lb": [],
        "di": "a1b2c3d4e5f6",
        "np": "area",
        "hn": true,
        "en": "Ceiling"
      },
      {
        "ei": "sensor.living_room_signal",
        "pl": "esphome",
        "lb": [],
        "di": "f6e5d4c3b2a1",
        "np": "device",
        "tk": "signal",
        "ec": 1,
        "hn": true,
        "dp": 0
      }
    ]
  }
}
```

`entity_categories` maps a number to an [entity category](/core/entities/registry/). Entities refer to their category with that number, in `ec`, instead of repeating the string. JSON keys are always strings, so the numbers arrive as `"0"` and `"1"`.

`entities` holds every entity in the registry that is not disabled. Disabled entities are left out, whoever disabled them. Entities without a registry entry, like entities without a unique ID, are not in the list either. Each entity has these keys. Only `ei`, `pl`, and `lb` are always there. The others are left out when they have no value.

| Key | Type | Meaning |
| --- | --- | --- |
| `ei` | string | The entity ID. |
| `pl` | string | The platform: the integration that provides the entity, like `hue`. |
| `lb` | list of strings | The IDs of the labels of the entity. An empty list when it has none. |
| `ai` | string | The ID of the area the entity itself is assigned to. Not set when the entity only gets its area from its device. |
| `di` | string | The ID of the device the entity belongs to. |
| `np` | string | Which name comes next when you build the full name of the entity: `area` when the entity has its own area, otherwise `device` when it belongs to a device. |
| `ic` | string | The icon the user picked, like `mdi:lightbulb`. It overrides the icon of the state. |
| `tk` | string | The translation key of the entity, used to translate its name and state. |
| `ec` | number | The entity category, as a key of `entity_categories`. |
| `hb` | boolean | `true` when the entity is hidden, by the user or by the integration. |
| `hn` | boolean | `true` when the entity [uses `has_entity_name`](/core/entities/naming/), so its name doesn't include the device name. |
| `en` | string | The entity name. The name the user set, otherwise the name from the integration. For an integration that doesn't use `has_entity_name`, the name from the integration has the device name stripped from its start, when it starts with it. |
| `dp` | number | Sensors only: the number of decimals to show. The precision the user set, otherwise the precision the integration suggests. |

For the full registry entries, with all fields, use `config/entity_registry/list` (all entries) or `config/entity_registry/get_entries` (the entries for a list of `entity_ids`).

### Expose entities to voice assistants

The `homeassistant` integration keeps track of which entities are exposed to which voice assistant. These commands manage that. All of them need an admin.

The assistants are identified by these IDs, and the commands accept no others:

- `conversation`: Assist
- `cloud.alexa`: Amazon Alexa through Home Assistant Link
- `cloud.google_assistant`: Google Assistant through Home Assistant Link

#### Expose or unexpose entities

`homeassistant/expose_entity` exposes or unexposes entities to one or more assistants. The change applies right away.

```json
{
  "id": 41,
  "type": "homeassistant/expose_entity",
  "assistants": ["conversation", "cloud.alexa"],
  "entity_ids": ["light.living_room", "sensor.outside"],
  "should_expose": true
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `assistants` | list of strings | Required. The assistants to change the setting for. |
| `entity_ids` | list of strings | Required. The entities to change. The IDs are not checked against existing entities. |
| `should_expose` | boolean | Required. `true` to expose, `false` to unexpose. |

The result is `null`.

#### List exposed entities

`homeassistant/expose_entity/list` takes no parameters and returns the entities that are exposed to at least one assistant. Each entity maps to the assistants it is exposed to, always with the value `true`. An assistant the entity is not exposed to is left out, and so is an entity that is exposed to none.

```json
{
  "id": 42,
  "type": "homeassistant/expose_entity/list"
}
```

```json
{
  "id": 42,
  "type": "result",
  "success": true,
  "result": {
    "exposed_entities": {
      "light.living_room": {
        "conversation": true,
        "cloud.alexa": true
      },
      "sensor.outside": {
        "conversation": true
      }
    }
  }
}
```

The list holds what is stored. Home Assistant stores the setting of an entity when someone exposes or unexposes it, and also the first time an assistant asks whether it may use the entity. Until then, an entity is not in the list, even when the default rules below would expose it.

#### Expose new entities by default

Each assistant has a setting that decides whether new entities are exposed to it automatically. `homeassistant/expose_new_entities/get` reads it for one `assistant`:

```json
{
  "id": 43,
  "type": "homeassistant/expose_new_entities/get",
  "assistant": "conversation"
}
```

```json
{
  "id": 43,
  "type": "result",
  "success": true,
  "result": {
    "expose_new": true
  }
}
```

Until it is changed, the setting is `true` for `conversation` and `false` for the other assistants.

`homeassistant/expose_new_entities/set` changes it. Both `assistant` and `expose_new` (a boolean) are required. The result is `null`.

```json
{
  "id": 44,
  "type": "homeassistant/expose_new_entities/set",
  "assistant": "cloud.alexa",
  "expose_new": true
}
```

With the setting on, not every new entity is exposed. An entity is exposed by default when it has no entity category and isn't hidden, and one of these is true:

- Its domain is `climate`, `cover`, `fan`, `humidifier`, `light`, `media_player`, `scene`, `switch`, `todo`, `vacuum`, or `water_heater`.
- It is a binary sensor with the device class `door`, `garage_door`, `lock`, `motion`, `opening`, `presence`, or `window`.
- It is a sensor with the device class `aqi`, `carbon_monoxide`, `carbon_dioxide`, `humidity`, `pm10`, `pm25`, `temperature`, or `volatile_organic_compounds`.

## Add your own command

An integration registers commands with `websocket_api.async_register_command`, usually in `async_setup`. Name the command after your domain, like `my_integration/devices`.

```python
from typing import Any

import probatio

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.typing import ConfigType


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up my integration."""
    websocket_api.async_register_command(hass, websocket_list_devices)
    return True


@websocket_api.websocket_command(
    {
        probatio.Required("type"): "my_integration/devices",
        probatio.Optional("include_offline", default=False): bool,
    }
)
@websocket_api.async_response
async def websocket_list_devices(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return the devices of my integration."""
    devices = await async_get_devices(hass, msg["include_offline"])
    connection.send_result(msg["id"], {"devices": devices})
```

- `websocket_command` sets the schema. The message is validated before your handler runs.
- `async_response` is for handlers that are coroutine functions. A handler that does not await can be a `@callback` instead, without `async_response`.
- `require_admin` limits the command to administrators. Put it above the other decorators.
- `connection.user` is the user. Use `connection.context(msg)` as the context for anything you do on their behalf. See [permissions](/core/internals/permissions/).
- `connection.send_result(msg["id"], result)` answers the command. `connection.send_error(msg["id"], code, message)` reports an error, with one of the codes from `websocket_api`, like `websocket_api.ERR_NOT_FOUND`.

### Subscriptions

For a command that streams updates, store a function that ends the subscription in `connection.subscriptions[msg["id"]]`. Home Assistant calls it when the client unsubscribes or disconnects. Send updates with `connection.send_message(websocket_api.event_message(msg["id"], data))`.

```python
@callback
@websocket_api.websocket_command(
    {probatio.Required("type"): "my_integration/subscribe"}
)
def websocket_subscribe(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Send updates of my integration to the client."""

    @callback
    def forward(data: dict[str, Any]) -> None:
        connection.send_message(
            websocket_api.event_message(msg["id"], data)
        )

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(
        hass, SIGNAL_UPDATE, forward
    )
    connection.send_result(msg["id"])
```

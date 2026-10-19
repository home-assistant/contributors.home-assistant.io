---
title: REST API
description: The HTTP endpoints under /api/ to read states, call actions, fire events, and render templates, with the permissions each one needs.
sidebarGroup: APIs
order: 30
---

Home Assistant serves a REST API under `/api/`, on the same port as the frontend: 8123 by default, or 80 when Home Assistant runs with the Supervisor, like on Home Assistant OS. The `SETUP_PORT` environment variable overrides that default. It accepts and returns JSON. The `api` integration provides it, and it is loaded whenever the frontend is.

The REST API is good for simple, one-off requests from scripts and other systems. For anything that needs to stay connected or follow changes, use the [WebSocket API](/core/internals/websocket-api/). The frontend uses that one, and it has many more commands.

## Authentication

Every request needs an access token in the `Authorization` header. For a script, create a long-lived access token on your profile, under **Security**. For an app, see the [authentication API](/core/internals/auth-api/).

```shell
curl \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  http://homeassistant.local:8123/api/
```

The same request in Python, with `requests`:

```python
import requests

response = requests.get(
    "http://homeassistant.local:8123/api/states/sun.sun",
    headers={"Authorization": "Bearer TOKEN"},
    timeout=10,
)
print(response.json())
```

Successful requests return status 200, or 201 when something was created. The usual errors are 400 (bad request), 401 (unauthorized), 404 (not found), and 405 (method not allowed). An action that fails with an error returns 500, and while Home Assistant is shutting down, every endpoint returns 503.

Some endpoints need an administrator. They are marked **Admin** below. Others return only what the user may read, following their [permissions](/core/internals/permissions/).

## Status and configuration

### GET /api/

Returns `{"message": "API running."}` if the API is up. Mind the trailing slash: the path is `/api/`, not `/api`.

### GET /api/config

Returns the [core configuration](/core/internals/hass/#the-core-configuration): location, units, time zone, version, loaded components, and more.

```json
{
  "location_name": "Home",
  "latitude": 52.37,
  "longitude": 4.89,
  "elevation": 0,
  "unit_system": {
    "length": "km",
    "mass": "g",
    "temperature": "°C",
    "volume": "L"
  },
  "time_zone": "Europe/Amsterdam",
  "version": "2026.10.0",
  "components": ["api", "frontend", "http", "sun"],
  "state": "RUNNING"
}
```

The example is shortened. The response holds more keys.

### GET /api/core/state

Returns whether core is running, and whether a database migration is in progress. Meant as a fast health check, for example for the Supervisor.

```json
{
  "state": "RUNNING",
  "recorder_state": {
    "migration_in_progress": false,
    "migration_is_live": false
  }
}
```

### GET /api/components

Returns the list of loaded components.

### POST /api/config/core/check_config

**Admin.** Checks `configuration.yaml`. Returns `result` (`valid` or `invalid`), and `errors` and `warnings` as text, or `null`.

## States

### GET /api/states

Returns all states the user may read, as a list of [state objects](/core/internals/states/#the-state-object).

### GET /api/states/&lt;entity_id&gt;

Returns the state of one entity, or 404.

```json
{
  "entity_id": "sun.sun",
  "state": "below_horizon",
  "attributes": {
    "friendly_name": "Sun",
    "elevation": -17.67
  },
  "last_changed": "2026-10-10T21:43:29.204838+00:00",
  "last_reported": "2026-10-10T21:50:30.529465+00:00",
  "last_updated": "2026-10-10T21:50:30.529465+00:00",
  "context": {
    "id": "01J9Z7K1M3S8TQ0Y6E4H2B5N7C",
    "parent_id": null,
    "user_id": null
  }
}
```

### POST /api/states/&lt;entity_id&gt;

**Admin.** Creates or replaces a state. The body needs a `state`, and can have `attributes`:

```json
{
  "state": "25",
  "attributes": {
    "unit_of_measurement": "°C"
  }
}
```

Returns 201 if the state is new and 200 if it existed, with the new state in the body and a `Location` header pointing to it. Add `"force_update": true` to fire a state change even if nothing changed.

> [!IMPORTANT]
> This only changes what Home Assistant shows. It does not talk to the device, and the next update of the entity overwrites it. To control a device, call an action.

### DELETE /api/states/&lt;entity_id&gt;

**Admin.** Removes a state. Returns 404 if it did not exist.

## Actions

### GET /api/services

Returns the registered actions, grouped by domain. The path still uses the old name, services.

### POST /api/services/&lt;domain&gt;/&lt;service&gt;

Calls an action and waits until it is done. The body is the action data, and can include the target:

```shell
curl \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "light.kitchen"}' \
  http://homeassistant.local:8123/api/services/light/turn_on
```

Returns the list of states that changed because of this call. To get [response data](/core/integrations/actions/#return-response-data), add `?return_response` to the URL. The response then looks like this:

```json
{
  "changed_states": [],
  "service_response": {
    "weather.forecast_home": {
      "forecast": []
    }
  }
}
```

Use `?return_response` for actions that support it, and only for those. Leaving it out for an action that only returns data, or adding it for an action without response data, gets you a 400.

## Events

### GET /api/events

Returns the event types that have listeners, with the number of listeners each.

### POST /api/events/&lt;event_type&gt;

**Admin.** Fires an event. The optional body is the event data:

```json
{
  "button_id": "front_door"
}
```

Returns `{"message": "Event front_door_pressed fired."}`, with your event type in the message. Events are stored in the database, so be mindful of what you fire.

### GET /api/stream

**Admin.** A stream of all events as server-sent events. Pass `?restrict=state_changed,call_service` to limit it to some event types. The WebSocket API's `subscribe_events` is the better choice for new code.

## Templates

### POST /api/template

**Admin.** Renders a [template](/glossary/template/) and returns the result as plain text.

```json
{
  "template": "It is {{ states('sensor.temperature') }} degrees."
}
```

## History and logbook

These come from the `history` and `logbook` integrations, which are part of the default configuration.

### GET /api/history/period/&lt;timestamp&gt;

Returns the state history of entities. The timestamp, like `2026-10-01T00:00:00+02:00`, is the start of the period and is optional: it defaults to one day ago. Query parameters:

- `filter_entity_id`: required. One or more entity IDs, separated by commas.
- `end_time`: the end of the period, URL encoded. Defaults to one day after the start.
- `minimal_response`: only return `state` and `last_changed` for the states between the first and the last. Much faster.
- `no_attributes`: skip the attributes. Also faster.
- `significant_changes_only=0`: return every change. By default, you only get significant changes.
- `skip_initial_state`: leave out the state at the start of the period.

The response is a list with one list of states per entity.

### GET /api/logbook/&lt;timestamp&gt;

Returns logbook entries, starting from the optional timestamp. Without a timestamp, it starts at the beginning of the current day, in local time. Query parameters:

- `entity`: one or more entity IDs, separated by commas.
- `end_time`: the end of the period, URL encoded.
- `period`: the number of days to return when there is no `end_time`. Defaults to 1.
- `context_id`: only the entries of one context. Cannot be combined with `entity`.

## Other integrations

Several integrations add their own endpoints:

- `GET /api/error_log` (**Admin**): the log of the current session, as plain text.
- `GET /api/camera_proxy/<entity_id>`: the current image of a camera.
- `GET /api/calendars`: the calendar entities. `GET /api/calendars/<entity_id>?start=<timestamp>&end=<timestamp>` returns the events of one calendar in that period.
- `POST /api/intent/handle`: handles an [intent](/core/internals/intents/#fire-an-intent).
- `POST /api/conversation/process`: sends text to a conversation agent. See the [conversation API](/core/internals/conversation-api/).

## Add your own endpoint

An integration can add endpoints with a `HomeAssistantView` from `homeassistant.helpers.http`, registered with `hass.http.register_view(MyView())`. Set `url` and `name`, and implement `get`, `post`, or another method. Views require authentication unless you set `requires_auth = False`. See [permissions](/core/internals/permissions/#in-an-http-view) for an example.

Think twice before you do. Most features belong in the WebSocket API, which the frontend can use directly. HTTP views fit when something outside Home Assistant has to call in, like a webhook, or when you serve files.

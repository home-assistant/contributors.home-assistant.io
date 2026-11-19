---
title: Send data
description: The mobile_app webhook. Which URL to use, the request format, the responses, and every request type the webhook accepts.
order: 2
---

After [registration](/companion/mobile-app-api/setup/), everything the app sends goes to one webhook. It doesn't need an access token: the webhook ID is the credential. Treat it like a password.

## Which URL to use

Build the webhook URL from the webhook ID: `<instance_url>/api/webhook/<webhook_id>`. Then try the URLs you have in this order, and move to the next one when a request fails:

1. The `cloudhook_url`, if registration gave you one.
2. `<remote_ui_url>/api/webhook/<webhook_id>`, if registration gave you a `remote_ui_url`.
3. `<instance_url>/api/webhook/<webhook_id>`, with the URL the user set up.

Both Home Assistant Link URLs can come and go, as the user's subscription changes. The [`get_config`](#get_config) response has the current ones.

### Home and away

Some routers can't reach a device on the local network through its external address (no NAT loopback, or hairpinning). If the user reaches Home Assistant through a dynamic DNS name, requests from inside the home fail. Let the user tell the app which Wi-Fi network is home, and use the internal URL there.

## Sending over the WebSocket API

When the app already has a [WebSocket](/core/internals/websocket-api/) connection, it can send webhook requests over it, with the `webhook/handle` command:

```json
{
  "id": 5,
  "type": "webhook/handle",
  "webhook_id": "abcdefgh",
  "method": "POST",
  "body": "{\"type\": \"get_zones\"}",
  "headers": {
    "Content-Type": "application/json"
  }
}
```

`method` is one of `GET`, `HEAD`, `POST`, or `PUT`. `body` and `query` are optional strings, and `headers` is an optional object with string values. The result contains the `body`, `status`, and `headers` of the response:

```json
{
  "id": 5,
  "type": "result",
  "success": true,
  "result": {
    "body": "[]",
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    }
  }
}
```

## The request

Every request is an HTTP POST (PUT works too) with a JSON body:

```json
{
  "type": "<type of request>",
  "data": {}
}
```

Some types take no `data`. If the registration has encryption enabled, every request must be encrypted, see [encryption](/companion/mobile-app-api/encryption/).

## The response

| Status | Meaning |
| --- | --- |
| `200` | Handled. Also returned, with an empty `{}`, when the payload doesn't match the schema of the type, the encrypted payload can't be decrypted, or the type is unknown. Home Assistant logs the details |
| `201` | A sensor was registered |
| `400` | The body is not valid JSON, the request is not encrypted while encryption is enabled, `enable_encryption` was sent while encryption is already on, or `stream_camera` got an unknown camera |
| `404` | The webhook endpoint is not there, because the `webhook` integration is not loaded |
| `405` | The request used `GET`. The webhook only accepts `POST` and `PUT` |
| `410` | The registration was deleted. Tell the user, and register again. Until Home Assistant restarts after the deletion, the webhook answers like an unknown one instead, with an empty `200` |

A request for a webhook ID that Home Assistant doesn't know gets an empty `200`, also when `mobile_app` itself is not loaded. That way, the API doesn't reveal which webhooks exist.

Errors in the body look like this:

```json
{
  "success": false,
  "error": {
    "code": "encryption_required",
    "message": "Encryption required"
  }
}
```

If the registration uses encryption, responses with content are encrypted too. These are not: the empty `{}` response, the response to `enable_encryption`, and the two errors in the format above, `encryption_required` and `encryption_already_enabled`. Errors that a request type returns as its own result are encrypted like any other response. For example, `stream_camera` answers an unknown camera with an encrypted `{"success": false}` and a `400`. So don't go by the status code: check whether the body has `encrypted` set.

## Request types

### `update_location`

Updates the device tracker of the app.

```json
{
  "type": "update_location",
  "data": {
    "gps": [12.34, 56.78],
    "gps_accuracy": 120,
    "battery": 45
  }
}
```

| Key | Type | Description |
| --- | --- | --- |
| `gps` | list | Latitude and longitude. Requires `gps_accuracy` |
| `gps_accuracy` | number | Accuracy of the location in meters. Zero or more |
| `location_name` | string | The name of the zone the device is in |
| `in_zones` | list | Entity IDs of the zones the device is in |
| `battery` | integer | Battery level in percent. Zero or more |
| `speed` | integer | Speed in meters per second. Zero or more |
| `altitude` | number | Altitude in meters |
| `course` | integer | Direction of travel in degrees, relative to due north. Zero or more |
| `vertical_accuracy` | integer | Accuracy of the altitude in meters. Zero or more |

All keys are optional. When you send `in_zones`, Home Assistant ignores `location_name`.

### `register_sensor` and `update_sensor_states`

Register a sensor, and update one or more sensors. See [sensors](/companion/mobile-app-api/sensors/).

### `call_service`

Performs an [action](/glossary/action/) in Home Assistant. The type and keys still use the old name, service.

```json
{
  "type": "call_service",
  "data": {
    "domain": "light",
    "service": "turn_on",
    "service_data": {
      "entity_id": "light.kitchen"
    }
  }
}
```

| Key | Type | Description |
| --- | --- | --- |
| `domain` | string | The domain of the action |
| `service` | string | The name of the action |
| `service_data` | object | The data for the action. Optional |

The action runs as the user who registered the app. If it fails, Home Assistant logs the error, and the response is a `200` without a body.

### `fire_event`

Fires an event.

```json
{
  "type": "fire_event",
  "data": {
    "event_type": "my_custom_event",
    "event_data": {
      "something": 50
    }
  }
}
```

| Key | Type | Description |
| --- | --- | --- |
| `event_type` | string | The type of the event |
| `event_data` | object | The data of the event. Optional |

### `render_template`

Renders one or more templates in one request. Each key in `data` is a template you name yourself:

```json
{
  "type": "render_template",
  "data": {
    "greeting": {
      "template": "Hello {{ name }}, you are {{ states('person.paulus') }}.",
      "variables": {
        "name": "Paulus"
      }
    }
  }
}
```

| Key | Type | Description |
| --- | --- | --- |
| `template` | string | The template to render |
| `variables` | object | Extra variables for the template. Optional |

The response uses the same keys: `{"greeting": "Hello Paulus, you are home."}`. A template that fails returns `{"error": "<message>"}` under its key, the others still render.

### `update_registration`

Updates the registration, for example after an app update or when the push token changes.

```json
{
  "type": "update_registration",
  "data": {
    "app_data": {
      "push_token": "abcd",
      "push_url": "https://push.example.com/push"
    },
    "app_version": "2.0.0",
    "device_name": "Robbie's iPhone",
    "manufacturer": "Apple",
    "model": "iPhone XR",
    "os_version": "17.4"
  }
}
```

| Key | Required | Type | Description |
| --- | --- | --- | --- |
| `app_version` | Yes | string | The version of the app |
| `device_name` | Yes | string | The name of the device |
| `manufacturer` | Yes | string | The manufacturer of the device |
| `model` | Yes | string | The model of the device |
| `os_version` | No | string | The version of the operating system |
| `app_data` | No | object | Replaces the app data, for example to enable [notifications](/companion/mobile-app-api/notifications/) |

The response is the updated registration, without the secret values.

### `get_config`

Returns information to configure the app with.

```json
{
  "type": "get_config"
}
```

The response has the `latitude`, `longitude`, `elevation`, `unit_system`, `location_name`, `time_zone`, `components`, `version`, and `theme_color` of the instance, plus:

| Key | Description |
| --- | --- |
| `hass_device_id` | The ID of the app's device in the device registry |
| `instance_id` | The unique ID of the instance |
| `cloudhook_url`, `remote_ui_url` | The current Home Assistant Link URLs, when the instance has an active subscription and the user is not local only |
| `entities` | The enabled state of each entity of the registration, keyed by the unique ID you registered it with, see [keeping sensors in sync](/companion/mobile-app-api/sensors/#keep-the-enabled-state-in-sync) |

### `get_zones`

Returns the states of all zones, sorted by entity ID.

```json
{
  "type": "get_zones"
}
```

### `enable_encryption`

Turns on encryption for an existing registration. See [encryption](/companion/mobile-app-api/encryption/#enable-it-later).

### `stream_camera`

Returns the paths to stream a camera.

```json
{
  "type": "stream_camera",
  "data": {
    "camera_entity_id": "camera.front_door"
  }
}
```

```json
{
  "mjpeg_path": "/api/camera_proxy_stream/camera.front_door",
  "hls_path": "/api/hls/<token>/master_playlist.m3u8"
}
```

`hls_path` is `null` when the camera can't stream. Combine the paths with the URL you use for the instance. An unknown camera returns `{"success": false}` with a `400`. If the registration uses encryption, that body is encrypted too.

### `conversation_process`

Sends a sentence to [Assist](/glossary/assist/), and returns the response of the conversation agent.

```json
{
  "type": "conversation_process",
  "data": {
    "text": "Turn on the lights",
    "language": "en",
    "conversation_id": "ABCD"
  }
}
```

Only `text` is required. The response has the same format as the [conversation API](/core/internals/conversation-api/).

### `scan_tag`

Reports that the device scanned an NFC tag or QR code. Home Assistant fires a tag scanned event, with the app's device as the scanner.

```json
{
  "type": "scan_tag",
  "data": {
    "tag_id": "5f0ba733-172f-430d-a7f8-e4ad940c88d7"
  }
}
```

### `register_push_subscription`

Asks Home Assistant for a silent push whenever one of the listed entities changes state, so the app can refresh something like a widget. The push goes to the `push_url` of the registration. See [push subscriptions](/companion/mobile-app-api/notifications/#push-subscriptions).

```json
{
  "type": "register_push_subscription",
  "data": {
    "subscription_id": "lock-widget",
    "push_token": "my-secure-token",
    "entity_ids": [
      "lock.front_door",
      "cover.garage_door"
    ],
    "target": "lock-widget"
  }
}
```

| Key | Required | Type | Description |
| --- | --- | --- | --- |
| `subscription_id` | Yes | string | An ID the app picks for this subscription |
| `push_token` | Yes | string | The token the push is sent to |
| `entity_ids` | Yes | list | The entities to watch. 1 to 50 entity IDs. Duplicates are ignored |
| `target` | No | string | A value Home Assistant passes back in the push, so the app knows what to refresh |

Sending the same `subscription_id` again replaces that subscription, for example after the push token changed. A device can have 50 subscriptions. Registering one more removes the oldest.

### `remove_push_subscription`

Removes a push subscription. Home Assistant stops sending pushes for it.

```json
{
  "type": "remove_push_subscription",
  "data": {
    "subscription_id": "lock-widget"
  }
}
```

### `live_activity_token` and `live_activity_dismissed`

Used by the iOS app for Live Activities. See [notifications](/companion/mobile-app-api/notifications/#live-activities).

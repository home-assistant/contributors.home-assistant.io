---
title: Notifications
description: How mobile_app delivers notifications to an app, over the WebSocket connection or through a push server, and the contract a push server must follow.
order: 5
source: https://github.com/home-assistant/mobile-apps-fcm-push/blob/main/functions/handlers.js
lastVerified: 2026-10-14
---

`mobile_app` has notifications built in. Once an app enables them, Home Assistant gets a notify entity and a `notify.mobile_app_<device_name>` action for it, and users can send notifications from automations.

There are two ways to deliver a notification:

- **Over the WebSocket connection** (local push), while the app is connected. No server needed, but the app has to keep the connection open.
- **Through a push server** (cloud push). Home Assistant posts the notification to a URL you run, and your server hands it to Apple, Google, or another push service.

An app can support both. When it does, Home Assistant uses the WebSocket channel while one is open, and the push server when none is open, or when the app doesn't confirm a notification in time.

How users send notifications to the official apps is in the [notifications documentation](https://companion.home-assistant.io/docs/notifications/notifications-basic).

## Over the WebSocket

To enable it, set `push_websocket_channel` to `true` in `app_data`, at [registration](/companion/mobile-app-api/setup/#register-the-app) or with [`update_registration`](/companion/mobile-app-api/sending-data/#update_registration).

Then open a channel on an authenticated [WebSocket](/core/internals/websocket-api/) connection:

```json
{
  "id": 2,
  "type": "mobile_app/push_notification_channel",
  "webhook_id": "abcdefgh",
  "support_confirm": true
}
```

The webhook ID must belong to the user of the connection. Opening a new channel for the same webhook closes the old one.

Notifications arrive as events on that subscription:

```json
{
  "id": 2,
  "type": "event",
  "event": {
    "message": "Hello world",
    "title": "Hi",
    "hass_confirm_id": "6d8c3e2a1f4b4f0b9c0d5e7a8b9c0d1e"
  }
}
```

With `support_confirm`, every notification has a `hass_confirm_id`, and you have 10 seconds to confirm it:

```json
{
  "id": 3,
  "type": "mobile_app/push_notification_confirm",
  "webhook_id": "abcdefgh",
  "confirm_id": "6d8c3e2a1f4b4f0b9c0d5e7a8b9c0d1e"
}
```

If the confirmation doesn't come in time, Home Assistant closes the channel and sends the notification, and any other unconfirmed ones, through the push server instead. Without a push server, an app that is not connected doesn't get the notification, and the action fails with an error that the device is not connected.

## Through a push server

To enable it, set both keys in `app_data`:

| Key | Description |
| --- | --- |
| `push_token` | The push token of the device, like an APNs token or an FCM registration token |
| `push_url` | The URL Home Assistant posts notifications to |

`mobile_app` doesn't care how the notification reaches the device. It posts it to your server, and the rest is up to you. That keeps you in full control of your push setup. The official apps use the [project's push service](https://github.com/home-assistant/mobile-apps-fcm-push), which sends notifications through Firebase Cloud Messaging to both Android and iOS devices. Its code is a good starting point for your own.

### The request

Home Assistant sends a POST with a JSON body, and gives up after 10 seconds:

```json
{
  "message": "Hello World",
  "title": "Test message",
  "push_token": "my-secure-token",
  "registration_info": {
    "app_id": "io.robbie.HomeAssistant",
    "app_version": "2026.10.0",
    "os_version": "26.0",
    "webhook_id": "abcdefgh"
  },
  "data": {
    "key": "value"
  }
}
```

`title` and `data` are only there when the user set them. `data` holds everything else the user passed, and is where app specific options go.

### The response

Respond with `200`, `201`, or `202` when the notification was accepted. Always send a JSON body with the `application/json` content type, even when there is nothing to report, like `{}`. Home Assistant reads every response as JSON, and a response it can't read fails like an error, whatever the status.

On any other status, the notification fails with the error `Error sending notification to <device>`. A `429` gives `Rate limit exceeded sending notification to <device>` instead, and a request that takes longer than 10 seconds gives `Timeout sending notification to <device>`. The notify entity raises these errors, so its action fails. The `notify.mobile_app_<device_name>` action only logs them, as a warning for the rate limit and as an error otherwise, and the action itself succeeds. Your JSON response can explain what went wrong. Home Assistant logs that explanation at debug level:

| Key | Description |
| --- | --- |
| `message` | Logged as is, with a note that the message comes from outside Home Assistant |
| `errorMessage` | Added to a standard message: "Internal server error, please try again later: ..." |

Be as specific as you can, and tell the user how to fix the problem when you know.

### Rate limits

Push services cost money, and a broken automation can send thousands of notifications. Use a rate limit. The push service of the official apps allows 500 notifications per device per day by default, and the count resets at midnight UTC.

Home Assistant doesn't limit anything itself. Your server does, and tells Home Assistant about it. Add `rateLimits` to your responses:

```json
{
  "rateLimits": {
    "successful": 1,
    "errors": 5,
    "maximum": 500,
    "resetsAt": "2026-10-11T00:00:00.000Z"
  }
}
```

| Key | Type | Description |
| --- | --- | --- |
| `successful` | integer | Notifications sent in this period |
| `errors` | integer | Notifications that failed in this period |
| `maximum` | integer | The maximum per period |
| `resetsAt` | timestamp | When the period ends, in ISO 8601, in UTC |

Home Assistant logs these numbers at debug level, with the time left until the reset. When a user hits the limit, respond with `429` until the period ends, and reject as early as you can. Home Assistant logs a warning that the limit was reached.

## Live Activities

The iOS app shows Live Activities, like a timer or a delivery on the Lock Screen, that notifications can start, update, and end. Each activity has its own push token, and `mobile_app` keeps track of them. This only applies to notifications that go through the push server, for registrations with `Apple` as `manufacturer`:

- At registration, or later with `update_registration`, the app puts a `start_live_activity_token` in `app_data`, used to start a new Live Activity.
- When a Live Activity starts on the device, the app sends its update token with a `live_activity_token` webhook request: the `tag` of the activity, the `push_token`, and `expires_at` as a Unix timestamp.
- When the user dismisses it on the device, the app sends `live_activity_dismissed` with the `tag`.

When a notification has a `tag` and `live_update: true` in its `data`, Home Assistant adds a `live_activity_token` to the request for the push server, and an `event` of `start`, `update`, or `end` to `data`. A `clear_notification` message with the same tag ends the activity. Expired tokens are removed automatically.

For users, this is described in the [Live Activities documentation](https://companion.home-assistant.io/docs/notifications/live-activities).

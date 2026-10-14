---
title: External bus
description: The message bus between the frontend and an app that embeds it, like the companion apps. How messages are sent, and every message there is.
order: 4
---

An app that embeds the frontend, like the [companion apps](/companion/), can do things a browser can't: scan a barcode, write an NFC tag, commission a Matter device, or show a native screen. The external bus is how the frontend and the app talk about that. It works next to [external authentication](/frontend/reference/external-auth/), and uses the same bridges. The code is in [`src/external_app/`](https://github.com/home-assistant/frontend/tree/dev/src/external_app).

## Sending messages

Messages are JSON objects.

**From the frontend to the app**, the frontend uses the bridge that is available:

```js
// Android, V2: the message is wrapped and serialized
window.externalAppV2.postMessage(
  JSON.stringify({ type: "externalBus", payload: message })
);

// Android, V1: the message is serialized
window.externalApp.externalBus(JSON.stringify(message));

// iOS and macOS: the message is passed as an object
window.webkit.messageHandlers.externalBus.postMessage(message);
```

**From the app to the frontend**, the app calls a function the frontend defines:

```js
window.externalBus(message);
```

## Message format

Every message has an `id` and a `type`, and a `payload` when the type needs one:

```ts
interface Message {
  id: number;
  type: string;
  payload?: unknown;
}
```

Some messages expect an answer. The answer is a `result` message with the same `id`:

```ts
interface SuccessResult {
  id: number;
  type: "result";
  success: true;
  result: unknown;
}

interface ErrorResult {
  id: number;
  type: "result";
  success: false;
  error: { code: string; message: string };
}
```

Messages from the app to the frontend are commands, with `type: "command"` and the name of the command in `command`:

```json
{
  "id": 5,
  "type": "command",
  "command": "navigate",
  "payload": { "path": "/config/areas/dashboard" }
}
```

The frontend answers every command with a result. Go by when the two general error codes are sent, not by their names alone:

- `unknown_command`: the frontend has no command handler yet, because it is still starting up. The command itself may well be known.
- `not_ready`: the command handler is in place, but it does not handle this command.

Both are sent by `receiveMessage` in [`src/external_app/external_messaging.ts`](https://github.com/home-assistant/frontend/blob/dev/src/external_app/external_messaging.ts).

## From the frontend to the app

### Messages that expect an answer

#### config/get

The frontend asks what the app can do, right after it connects. Payload: none. The app answers with an object. All keys are optional:

| Key | Type | Meaning |
| --- | --- | --- |
| `hasSettingsScreen` | boolean | The app shows its own settings on `config_screen/show`. |
| `hasSidebar` | boolean | The app has a sidebar of its own. |
| `canWriteTag` | boolean | The device can write NFC tags. |
| `hasExoPlayer` | boolean | The app can play HLS video natively with ExoPlayer. |
| `canCommissionMatter` | boolean | The app can commission Matter devices. |
| `hasMatterStatusReport` | boolean | The app reports the end of Matter commissioning with `matter/commission/finish`. |
| `canImportThreadCredentials` | boolean | The app can import Thread credentials. |
| `canTransferThreadCredentialsToKeychain` | boolean | The app can store Thread credentials in the keychain of the platform. Apple only. |
| `hasAssist` | boolean | The app has a native Assist interface, used instead of the one of the frontend. |
| `hasAssistSettings` | boolean | The app has Assist settings for the device, shown in the voice assistant settings. |
| `hasBarCodeScanner` | number | `1` when the app can scan barcodes, `0` otherwise. |
| `canSetupImprov` | boolean | The app can set up Improv Wi-Fi devices. |
| `hasEntityAddTo` | boolean | The app can add entities to places of its own, like a widget, from the more-info dialog. |
| `hasSplashscreen` | boolean | The app covers the frontend with its own loading screen until `frontend/loaded`. |
| `appVersion` | string | The version of the app. |

#### entity/add_to/get_actions

The frontend asks where an entity can be added, like a home screen widget or a watch face.

Payload:

```ts
{ entity_id: string }
```

Answer:

```ts
{
  actions: Array<{
    enabled: boolean;
    name: string;
    details?: string;
    mdi_icon: string;
    app_payload: string;
  }>;
}
```

`name` and `details` are shown as they are, so translate them in the app. `mdi_icon` is an icon name like `mdi:car`. `app_payload` is any string, which the frontend sends back with `entity/add_to` when the user picks the action.

### Messages without an answer

| Type | Payload | Meaning |
| --- | --- | --- |
| `assist/settings` | | Open the Assist settings of the app. |
| `assist/show` | `{ pipeline_id, start_listening }`, optional | Show the native Assist interface. `pipeline_id` is an ID, `"preferred"`, or `"last_used"`. |
| `bar_code/scan` | `{ title, description, alternative_option_label? }` | Open the barcode scanner. Without `alternative_option_label`, hide the button for the alternative option. |
| `bar_code/notify` | `{ message }` | Show a message in the barcode scanner. |
| `bar_code/close` | | Close the barcode scanner. |
| `config_screen/show` | | Open the settings of the app. |
| `connection-status` | `{ event }` | The connection to Home Assistant changed. `event` is `"connected"`, `"disconnected"`, or `"auth-invalid"`. |
| `entity/add_to` | `{ entity_id, app_payload }` | Add the entity, with the `app_payload` from `entity/add_to/get_actions`. |
| `entity/controlled` | `{ entity_ids, domain, service }` | The user performed an action on these entities in the frontend. |
| `exoplayer/play_hls` | `{ url, muted }` | Play an HLS stream natively. |
| `exoplayer/resize` | `{ left, top, right, bottom }` | Move the native player to these coordinates. |
| `exoplayer/stop` | | Stop the native player. |
| `focus_element` | `{ element_id }` | Focus an element. |
| `frontend/loaded` | | The frontend has removed its launch screen. With `hasSplashscreen`, that is after the first page has rendered. |
| `frontend/reload_and_clear_cache` | | Clear the cache of the web view and reload. Sent to iOS and macOS only, when the frontend detects an outdated build. |
| `haptic` | `{ hapticType }` | Give haptic feedback: `"success"`, `"warning"`, `"failure"`, `"light"`, `"medium"`, `"heavy"`, or `"selection"`. |
| `improv/scan` | | Scan for Improv Wi-Fi devices. |
| `improv/configure_device` | `{ name }` | Set up the Improv Wi-Fi device with this name. |
| `matter/commission` | `{ mac_extended_address, extended_pan_id, border_agent_id, active_operational_dataset }`, optional | Start commissioning a Matter device. The payload describes the preferred Thread network. Each value can be `null`. |
| `more_info/opened` | `{ entity_id }` | The more-info dialog opened for this entity. |
| `more_info/closed` | `{ entity_id }` | The more-info dialog closed. |
| `sidebar/show` | | Show the sidebar of the app. |
| `tag/write` | `{ tag, name }` | Open the screen to write an NFC tag. `name` is `null` when the user did not name the tag. |
| `theme-update` | | The theme changed. Update the colors of the status bar and navigation bar. |
| `thread/import_credentials` | | Import Thread credentials from the device, and send them to Home Assistant over the WebSocket API. |
| `thread/store_in_platform_keychain` | `{ mac_extended_address, border_agent_id, active_operational_dataset, extended_pan_id }` | Store Thread credentials in the keychain of the platform. |

## From the app to the frontend

All commands get a result back. On success, `result` is `null`.

| Command | Payload | Meaning |
| --- | --- | --- |
| `automation/editor/show` | `{ config? }`, optional | Open the automation editor for a new automation. `config` can fill in `alias`, `description`, `triggers`, `conditions`, `actions`, `mode`, and `max`. |
| `bar_code/scan_result` | `{ rawValue, format }` | A scanned barcode. `format` is one of the [Barcode Detection API formats](https://developer.mozilla.org/docs/Web/API/Barcode_Detection_API#supported_barcode_formats), or `"unknown"`. |
| `bar_code/aborted` | `{ reason }` | The scan stopped. `reason` is `"canceled"` or `"alternative_options"`. |
| `improv/discovered_device` | `{ name }` | An Improv Wi-Fi device was found. |
| `improv/device_setup_done` | | Setting up the Improv Wi-Fi device is done. |
| `kiosk_mode/set` | `{ enable }` | Turn kiosk mode on or off. |
| `matter/commission/finish` | `{ name, success }` | Commissioning a Matter device ended. `name`, when not `null`, is proposed as the name of the new device. With `success: false`, the frontend closes its dialog and shows that adding the device failed, unless the device already showed up. |
| `navigate` | `{ path, options? }` | Go to a page. `path` starts with `/`, like `/config/voice-assistants/assistants`. `options.replace` replaces the current history entry, and `options.data` is stored in the history state. |
| `notifications/show` | | Open the notifications. |
| `restart` | | Reconnect the frontend to Home Assistant. |
| `sidebar/show` | | Open the sidebar. Fails with `not_allowed` while a dialog is open. |
| `sidebar/toggle` | | Open or close the sidebar. Fails with `not_allowed` while a dialog is open. |

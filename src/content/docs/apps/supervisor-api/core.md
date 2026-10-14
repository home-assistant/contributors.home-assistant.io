---
title: Home Assistant Core endpoints
description: Supervisor API endpoints to control Home Assistant Core, and the proxy your app uses to reach the Core REST and WebSocket API.
sidebarLabel: Home Assistant Core
order: 4
---

There are two kinds of endpoints under `/core`. The first kind controls the Home Assistant Core container: start, stop, update, and its settings. The second kind is a proxy to the API of Home Assistant itself, so your app can read states and call actions without knowing a password or port.

Most of these endpoints are also available under `/homeassistant` instead of `/core`, the older name. The proxy there has no `DELETE`. Use `/core`.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/core/info` | Information about Home Assistant Core |
| `POST` | `/core/options` | Change the Core settings |
| `POST` | `/core/update` | Update Home Assistant Core |
| `POST` | `/core/start` | Start Home Assistant Core |
| `POST` | `/core/stop` | Stop Home Assistant Core |
| `POST` | `/core/restart` | Restart Home Assistant Core |
| `POST` | `/core/rebuild` | Rebuild the Core container |
| `POST` | `/core/check` | Check the configuration |
| `GET` | `/core/stats` | Resource usage of Core |
| `GET` | `/core/logs` | Logs of Core, and the other [log endpoints](/apps/supervisor-api/#log-endpoints) |
| `GET`, `POST`, `DELETE` | `/core/api/<path>` | Proxy to the Home Assistant REST API |
| `GET` | `/core/api/stream` | Proxy to the event stream |
| `GET` | `/core/websocket` | Proxy to the Home Assistant WebSocket API |

## Control Home Assistant Core

To use these, your app needs `hassio_api: true` and the `homeassistant`, `manager`, or `admin` role. `GET /core/info` works with any role.

### `GET /core/info`

| Key | Type | Description |
| --- | --- | --- |
| `version` | string | Installed version |
| `version_latest` | string | Latest available version |
| `update_available` | boolean | `true` if an update is available |
| `machine` | string | Machine type, like `generic-x86-64` or `raspberrypi5-64` |
| `ip_address` | string | IP address of Core on the internal network |
| `arch` | string | Architecture |
| `image` | string | Container image |
| `boot` | boolean | `true` if Core starts at boot |
| `port` | integer | Port of the Home Assistant web server |
| `ssl` | boolean | `true` if the web server uses SSL |
| `watchdog` | boolean | `true` if the watchdog is on |
| `audio_input` | string or null | Selected audio input device |
| `audio_output` | string or null | Selected audio output device |
| `backups_exclude_database` | boolean | `true` if backups leave the database out by default |
| `duplicate_log_file` | boolean | `true` if Core also writes its log to a file |

```json
{
  "version": "2026.10.1",
  "version_latest": "2026.10.1",
  "update_available": false,
  "machine": "generic-x86-64",
  "ip_address": "172.30.32.1",
  "arch": "amd64",
  "image": "ghcr.io/home-assistant/generic-x86-64-homeassistant",
  "boot": true,
  "port": 8123,
  "ssl": false,
  "watchdog": true,
  "audio_input": null,
  "audio_output": null,
  "backups_exclude_database": false,
  "duplicate_log_file": false
}
```

### `POST /core/options`

Send only the keys you want to change.

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `boot` | boolean | No | Start Core at boot |
| `image` | string or null | No | Use another container image. `null` goes back to the default |
| `port` | integer | No | Port of the Home Assistant web server |
| `ssl` | boolean | No | The web server uses SSL |
| `watchdog` | boolean | No | Turn the watchdog on or off |
| `refresh_token` | string or null | No | Refresh token the Supervisor uses for Core |
| `audio_input` | string or null | No | Audio input device |
| `audio_output` | string or null | No | Audio output device |
| `backups_exclude_database` | boolean | No | Leave the database out of backups by default |
| `duplicate_log_file` | boolean | No | Also write the Core log to a file |

### `POST /core/update`

Updates Home Assistant Core. Fails while the Supervisor is still starting up or restoring a backup, and while Core runs a database migration.

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `version` | string | No | Version to install. Default is the latest version |
| `backup` | boolean | No | Make a backup before the update. Default `false` |
| `background` | boolean | No | Return a `job_id` right away instead of waiting. Default `false` |

### `POST /core/start`

Starts Home Assistant Core. Like restart and rebuild, it fails while the Supervisor is still starting up or restoring a backup.

### `POST /core/stop`

Stops Home Assistant Core.

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `force` | boolean | No | Stop even while Core runs a database migration. Default `false` |

### `POST /core/restart`

Restarts Home Assistant Core.

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `safe_mode` | boolean | No | Start in safe mode, with custom integrations turned off. Default `false` |
| `force` | boolean | No | Restart even while Core runs a database migration. Default `false` |

### `POST /core/rebuild`

Removes the Core container and creates it again from the same image. Takes the same keys as `POST /core/restart`.

### `POST /core/check`

Checks the Home Assistant configuration. Returns success when it is valid, and an error with the output of the check when it is not.

### `GET /core/stats`

Returns the resource usage of Home Assistant Core as a [stats model](/apps/supervisor-api/models/#stats). Add the `one_shot` query parameter to get a single quick sample.

## Home Assistant Core API proxy

The proxy forwards your requests to the REST API and WebSocket API of Home Assistant Core, using your app's token. Your app needs `homeassistant_api: true` in its configuration. It does not need `hassio_api` or a role. See [talk to Home Assistant](/apps/guides/communication/) for how to use it.

Paths that start with `hassio` are blocked through the proxy.

### `GET /core/api/<path>`

Also `POST` and `DELETE`. Forwards the request to `/api/<path>` on Home Assistant Core, and returns the response of Core as it is. The proxy does not wrap it in the Supervisor envelope.

```bash
curl -sSL \
  -H "Authorization: Bearer ${SUPERVISOR_TOKEN}" \
  http://supervisor/core/api/states/sun.sun
```

### `GET /core/api/stream`

Forwards the server-sent event stream of Home Assistant Core.

### `GET /core/websocket`

Opens a WebSocket connection to Home Assistant Core. `/core/api/websocket` works too. The handshake is the normal Home Assistant handshake, with your app's token as the access token:

```json
{
  "type": "auth",
  "access_token": "<your SUPERVISOR_TOKEN>"
}
```

After `auth_ok`, you use the WebSocket API as usual. Commands that start with `supervisor/` or `hassio/` are refused.

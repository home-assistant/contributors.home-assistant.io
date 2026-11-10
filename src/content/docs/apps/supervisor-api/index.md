---
title: Supervisor API
description: The REST API the Supervisor offers to apps, how to authenticate, what your app is allowed to call, and what the responses look like.
order: 40
---

The Supervisor runs a REST API on the internal network. Home Assistant Core uses it, the CLI uses it, and so can your app: to read its own configuration, find an MQTT broker, make a backup, or restart Home Assistant. This section is the reference for that API.

The paths still use the old name: apps live under `/addons` and `/store/addons`. That is the real API, so that is what you call.

## Base URL and authentication

From inside an app container, the API is at `http://supervisor/`. The Supervisor gives every app its own token in the `SUPERVISOR_TOKEN` environment variable. Send it with every request:

```bash
curl -sSL \
  -H "Authorization: Bearer ${SUPERVISOR_TOKEN}" \
  http://supervisor/info
```

The Supervisor accepts the token in any of these headers, checked in this order:

- `X-Supervisor-Token: <token>`
- `X-Hassio-Key: <token>` (legacy)
- `Authorization: Bearer <token>`

The same token is also available as `HASSIO_TOKEN`, the old name of the variable. Use `SUPERVISOR_TOKEN` in new code.

If you write your app scripts in Bash, [Bashio](/apps/bashio/) wraps most of this API in functions like `bashio::app.option` and `bashio::services`. It handles the token for you.

## What your app may call

Which endpoints your app can reach depends on its configuration in `config.yaml`. See [Talk to Home Assistant and the Supervisor](/apps/guides/communication/) for the full picture, and the [configuration reference](/apps/reference/configuration/) for the options.

### Without any extra permission

Every app can call these endpoints with its token, even without `hassio_api`:

| Path | What it is for |
| --- | --- |
| `/addons/self/<endpoint>` | One level below your own app, like `info`, `options`, `logs`, `stats`, `start`, or `restart`. Not `security` and `update`, and not deeper paths like `logs/follow` |
| `/addons/self/options/config` | Your own validated options |
| `/info` | General information about the system |
| `/services` and everything under it | [Services](/apps/supervisor-api/services/) like MQTT |
| `/discovery` and everything under it | [Discovery](/apps/supervisor-api/services/#discovery) messages |
| `/auth` | Check user credentials, needs `auth_api: true` |

`self` is an alias: wherever a path takes an app slug, your app can use `self` to mean itself.

### With `hassio_api: true`

Set `hassio_api: true` in `config.yaml` to get access to more of the API. What exactly depends on the role you set with `hassio_role`:

| Role | Can call |
| --- | --- |
| `default` | Every path that ends in `/info`, like `/core/info` or `/os/info` |
| `homeassistant` | Everything of `default`, plus everything under `/core/` and `/homeassistant/` |
| `backup` | Everything of `default`, plus everything under `/backups` |
| `manager` | Everything of `default`, plus `/addons` (except the `security` endpoint of other apps), `/addons/reload`, `/audio`, `/auth/cache`, `/available_updates`, `/backups`, `/cli`, `/core`, `/dns`, `/docker`, `/hardware`, `/homeassistant`, `/host`, `/jobs`, `/mounts`, `/multicast`, `/network`, `/observer`, `/os` (except `/os/datadisk/wipe`), `/refresh_updates`, `/resolution`, `/security`, `/store`, `/supervisor`, and `/time` |
| `admin` | Everything |

Only ask for the role your app needs. The `manager` and `admin` roles lower the [security rating](/apps/guides/security/) of your app.

### Never from an app

Some paths are off limits for every app, whatever its role:

- `/addons/<app>/sys_options` and `/os/ssh/authorized_keys` only accept calls from Home Assistant Core.
- `/core/api/hassio...` and `/homeassistant/api/hassio...` are blocked for everyone. Through these Core endpoints, a caller would act as the Supervisor itself.
- Through the [WebSocket proxy](/apps/supervisor-api/core/#get-corewebsocket), commands that start with `supervisor/` or `hassio/` are refused.

### Without a token

`GET /supervisor/ping` needs no token. Calls to the [Home Assistant Core proxy](/apps/supervisor-api/core/#home-assistant-core-api-proxy) are not checked against your role either: the proxy checks your token itself, and only lets you through when your app has `homeassistant_api: true`.

## Responses

Most endpoints answer with JSON in the same envelope. A successful call:

```json
{
  "result": "ok",
  "data": {}
}
```

`data` holds the response of the endpoint. The response tables in this reference describe what is inside `data`. Endpoints that only do something, like a restart, return an empty `data`.

A failed call:

```json
{
  "result": "error",
  "message": "App my_app does not exist",
  "error_key": "app_not_found_error",
  "extra_fields": {}
}
```

| Key | Description |
| --- | --- |
| `result` | `ok` or `error` |
| `data` | The response, only on success |
| `message` | A human readable error message |
| `error_key` | A stable key for the error, when the error has one. Use it in code instead of parsing `message` |
| `extra_fields` | Values that go with the `error_key`, when there are any |
| `job_id` | The ID of the [job](/apps/supervisor-api/supervisor/#jobs) that failed, when the error came from one |

Some endpoints do not use the envelope. Logs, changelogs, and documentation come back as plain text. Icons and logos come back as PNG images. Backup downloads come back as a tar file. When those fail, the error is plain text too.

### Status codes

| Code | Meaning |
| --- | --- |
| `200` | Success |
| `400` | The request failed. Read `message` to learn why. This is also what you get while the Supervisor is still starting up |
| `401` | No token, or a token the endpoint does not accept |
| `403` | Your app does not have the permission for this path |
| `404` | The app, backup, job, or other object does not exist |
| `409` | A conflict, like an operation that is already running |
| `500` | Something went wrong inside the Supervisor. Check the Supervisor logs |

### Background jobs

Long operations, like installing an app or making a backup, run as [jobs](/apps/supervisor-api/supervisor/#jobs). Several endpoints take a `background` option. With `background: true`, the call returns right away with a `job_id`, and you follow the progress with `GET /jobs/<job_id>`.

## Log endpoints

Apps, Home Assistant Core, the Supervisor, the plugins, and the host all have log endpoints that work the same way. They read from the systemd journal of the host and return plain text.

| Path | Returns |
| --- | --- |
| `<base>/logs` | The most recent log lines |
| `<base>/logs/follow` | The most recent lines, then keeps the connection open and streams new ones |
| `<base>/logs/latest` | All lines since the container last started |
| `<base>/logs/boots/<bootid>` | The lines of one boot |
| `<base>/logs/boots/<bootid>/follow` | The lines of one boot, then streams new ones |

`<bootid>` is either a boot ID from [`GET /host/logs/boots`](/apps/supervisor-api/host/#get-hostlogsboots), or an offset: `0` is the current boot, `-1` the one before, and so on. A positive number counts from the oldest boot the journal still has.

The log endpoints take these query parameters and headers:

| Parameter | Description |
| --- | --- |
| `lines` | Query parameter. The number of lines to return. The default is 100, the minimum is 2 |
| `format` | Query parameter. The log format: `plain`, `timestamp`, or `verbose`. See the formats below |
| `verbose` | Query parameter, no value needed. Selects the `verbose` format, unless you also set `format` |
| `no_colors` | Query parameter, no value needed. Strips ANSI color codes |
| `Accept` | Header. `text/plain` (the default) or `text/x-log`. `text/x-log` selects the `verbose` format, unless you also set `format` |
| `Range` | Header. A [systemd-journal-gatewayd](https://www.freedesktop.org/software/systemd/man/latest/systemd-journal-gatewayd.service.html) range like `entries=cursor[[:num_skip]:num_entries]`. Ignored when you set `lines` |

The `format` parameter sets what each line shows:

| Format | Example line |
| --- | --- |
| `plain` | `Hello, world!` |
| `timestamp` | `2026-10-13 07:32:51.123 Hello, world!` |
| `verbose` | `2026-10-13 07:32:51.123 homeassistant python[666]: Hello, world!` |

The timestamp is in the time zone of the Supervisor, with milliseconds. `verbose` adds the host name and the process, with its ID when the journal has one. An unknown `format` returns an error.

When you set `format`, it wins over `verbose` and `Accept: text/x-log`. Without any of them, most endpoints use `plain`. The host logs without an identifier and the DNS, audio, and multicast plugins use `verbose`.

The response has an `X-First-Cursor` header with the journal cursor of the first line. Pass it in a `Range` header to page back through older lines.

## Examples

Check that the Supervisor is up. This one needs no token:

```bash
curl -sSL http://supervisor/supervisor/ping
```

```json
{
  "result": "ok",
  "data": {}
}
```

Get the network configuration of the host. Your app needs `hassio_api: true` for this one, any role will do:

```bash
curl -sSL \
  -H "Authorization: Bearer ${SUPERVISOR_TOKEN}" \
  http://supervisor/network/info
```

Read the options of your own app, validated against its schema:

```bash
curl -sSL \
  -H "Authorization: Bearer ${SUPERVISOR_TOKEN}" \
  http://supervisor/addons/self/options/config
```

```json
{
  "result": "ok",
  "data": {
    "name": "world",
    "beer": true
  }
}
```

## The endpoints

- [Apps](/apps/supervisor-api/apps/): installed apps, their options, state, and logs.
- [Store](/apps/supervisor-api/store/): apps that can be installed, and app repositories.
- [Backups](/apps/supervisor-api/backups/): make, restore, and manage backups.
- [Home Assistant Core](/apps/supervisor-api/core/): control Core, and the proxy to its REST and WebSocket API.
- [Host and OS](/apps/supervisor-api/host/): the host, Home Assistant OS, hardware, network, time, mounts, and Docker.
- [Plugins](/apps/supervisor-api/plugins/): audio, CLI, DNS, multicast, and observer.
- [Supervisor](/apps/supervisor-api/supervisor/): the Supervisor itself, updates, jobs, resolution, and security.
- [Services, discovery, auth, and ingress](/apps/supervisor-api/services/): what apps use to work together and with Home Assistant.
- [Models](/apps/supervisor-api/models/): the objects that several endpoints return.

## API version 2

The Supervisor also has a second version of this API under `/v2`, where apps are under `/apps` and `/store/apps` instead of `/addons` and `/store/addons`. It is only there when the `supervisor_v2_api` development feature flag is on, and it is still changing. This reference covers the API without `/v2`, the one every installation has.

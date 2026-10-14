---
title: Supervisor endpoints
description: Supervisor API endpoints for the Supervisor itself, system information, updates, jobs, resolution, and security settings.
sidebarLabel: Supervisor
order: 7
---

These endpoints are about the Supervisor and the system as a whole. `GET /info` works for every app, without extra permissions. The other `/info` endpoints work with any role. The rest needs `hassio_api: true` with the `manager` or `admin` role.

## System

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/info` | Overview of the system |
| `GET` | `/available_updates` | Updates that are available |
| `POST` | `/reload_updates` | Check for updates |
| `POST` | `/refresh_updates` | Check for updates and reload the store |

### `GET /info`

| Key | Type | Description |
| --- | --- | --- |
| `supervisor` | string | Version of the Supervisor |
| `homeassistant` | string or null | Version of Home Assistant Core |
| `hassos` | string or null | Version of Home Assistant OS, `null` on other systems |
| `docker` | string | Version of Docker |
| `hostname` | string or null | Host name |
| `operating_system` | string or null | Name of the operating system |
| `features` | list | Features the host supports |
| `machine` | string | Machine type, like `generic-x86-64` |
| `machine_id` | string or null | Machine ID of the host |
| `arch` | string | Main architecture |
| `supported_arch` | list | All architectures the system can run |
| `state` | string | State of the Supervisor, like `running` |
| `supported` | boolean | `true` if the installation is supported |
| `channel` | string | Update channel: `stable`, `beta`, or `dev` |
| `logging` | string | Log level of the Supervisor |
| `timezone` | string | Time zone |

```json
{
  "supervisor": "2026.10.0",
  "homeassistant": "2026.10.1",
  "hassos": "17.0",
  "docker": "28.3.3",
  "hostname": "homeassistant",
  "operating_system": "Home Assistant OS 17.0",
  "features": ["reboot", "shutdown", "services", "network", "hostname"],
  "machine": "generic-x86-64",
  "machine_id": "d4d2b9f5a6b84e2f9c3e1a7b8c9d0e1f",
  "arch": "amd64",
  "supported_arch": ["amd64"],
  "state": "running",
  "supported": true,
  "channel": "stable",
  "logging": "info",
  "timezone": "Europe/Amsterdam"
}
```

### `GET /available_updates`

Returns the updates that are available for Core, the Supervisor, the OS, and installed apps. The older path `/supervisor/available_updates` returns the same.

| Key | Type | Description |
| --- | --- | --- |
| `available_updates` | list | One entry per update, with `update_type` (`core`, `supervisor`, `os`, or `addon`), `panel_path`, and `version_latest`. App updates also have `name` and `icon` |

### `POST /reload_updates`

Checks for new versions of Core, the Supervisor, the OS, and the plugins.

### `POST /refresh_updates`

Does the same as `POST /reload_updates`, and also reloads the app store. Prefer `POST /reload_updates` and [`POST /store/reload`](/apps/supervisor-api/store/#post-storereload).

## Supervisor

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/supervisor/ping` | Check that the Supervisor is up. Needs no token |
| `GET` | `/supervisor/info` | Information about the Supervisor |
| `POST` | `/supervisor/options` | Change Supervisor settings |
| `POST` | `/supervisor/update` | Update the Supervisor |
| `POST` | `/supervisor/reload` | Reload versions, secrets, and system checks |
| `POST` | `/supervisor/restart` | Restart the Supervisor |
| `POST` | `/supervisor/repair` | Repair the installation |
| `GET` | `/supervisor/stats` | Resource usage of the Supervisor |
| `GET` | `/supervisor/logs` | Logs of the Supervisor, and the other [log endpoints](/apps/supervisor-api/#log-endpoints). When the journal cannot deliver them, you get the Docker logs of the container instead |

### `GET /supervisor/ping`

Returns success when the Supervisor is up. It needs no token, so you can call it before anything else.

### `GET /supervisor/info`

| Key | Type | Description |
| --- | --- | --- |
| `version` | string | Installed version |
| `version_latest` | string | Latest available version |
| `update_available` | boolean | `true` if an update is available |
| `channel` | string | `stable`, `beta`, or `dev` |
| `arch` | string | Architecture |
| `supported` | boolean | `true` if the installation is supported |
| `healthy` | boolean | `true` if the installation is healthy |
| `ip_address` | string | IP address of the Supervisor on the internal network |
| `timezone` | string or null | Time zone |
| `logging` | string | Log level |
| `debug` | boolean | `true` if debug mode is on |
| `debug_block` | boolean | `true` if the Supervisor waits for a debugger at startup |
| `diagnostics` | boolean or null | `true` if diagnostics are shared |
| `auto_update` | boolean | `true` if the Supervisor updates automatically |
| `detect_blocking_io` | boolean | `true` if detection of blocking I/O is on |
| `country` | string or null | Country code |
| `feature_flags` | dictionary | Development feature flags and whether they are on |
| `wait_boot` | integer | Deprecated |
| `addons` | list | Deprecated. Installed apps, with `name`, `slug`, `version`, `version_latest`, `update_available`, `state`, `repository`, and `icon`. Use [`GET /addons`](/apps/supervisor-api/apps/#get-addons) |
| `addons_repositories` | list | Deprecated. Repositories, with `name` and `slug`. Use [`GET /store/repositories`](/apps/supervisor-api/store/#get-storerepositories) |

### `POST /supervisor/options`

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `channel` | string | No | `stable`, `beta`, or `dev` |
| `timezone` | string | No | Time zone, like `Europe/Amsterdam`. On Home Assistant OS 16.2 or newer, also sets the time zone of the host |
| `logging` | string | No | `debug`, `info`, `warning`, `error`, or `critical` |
| `debug` | boolean | No | Debug mode |
| `debug_block` | boolean | No | Wait for a debugger at startup |
| `diagnostics` | boolean | No | Share diagnostics |
| `auto_update` | boolean | No | Update the Supervisor automatically |
| `detect_blocking_io` | string | No | `on`, `off`, or `on-at-startup` |
| `country` | string | No | Country code |
| `feature_flags` | dictionary | No | Development feature flags to turn on or off, like `{"supervisor_v2_api": true}`. Flags you leave out keep their value |
| `wait_boot` | integer | No | Deprecated |
| `addons_repositories` | list | No | Deprecated. Replaces the list of repositories. Use the [repository endpoints](/apps/supervisor-api/store/#repositories) |

### `POST /supervisor/update`

Updates the Supervisor to the latest version. Fails when there is no update. A `version` key only works in a Supervisor development environment, where `SUPERVISOR_DEV` is `1`. Everywhere else, the Supervisor ignores it and installs the latest version.

### `POST /supervisor/reload`

Checks for new versions, reloads the Home Assistant secrets, and checks the system again.

### `POST /supervisor/restart`

Restarts the Supervisor.

### `POST /supervisor/repair`

Repairs the installation: fixes missing images, containers, and files where it can.

### `GET /supervisor/stats`

Returns the resource usage of the Supervisor as a [stats model](/apps/supervisor-api/models/#stats).

## Jobs

The Supervisor runs long tasks, like installs, updates, and backups, as jobs. Jobs form a tree: a backup job has child jobs per app, for example.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/jobs/info` | All jobs |
| `GET` | `/jobs/<job_id>` | One job |
| `DELETE` | `/jobs/<job_id>` | Remove a finished job |
| `POST` | `/jobs/options` | Change job settings |
| `POST` | `/jobs/reset` | Reset the job settings |

### `GET /jobs/info`

| Key | Type | Description |
| --- | --- | --- |
| `ignore_conditions` | list | Conditions the Supervisor ignores before it starts a job |
| `jobs` | list | [Job models](/apps/supervisor-api/models/#job), newest first |

### `GET /jobs/<job_id>`

Returns one [job model](/apps/supervisor-api/models/#job), with its child jobs. Use it to follow a job you started with `background: true`.

```json
{
  "name": "backup_manager_partial_backup",
  "reference": "a1b2c3d4",
  "uuid": "e2b7a9c4f1d34e5a8b6c0d1e2f3a4b5c",
  "progress": 0,
  "stage": "addons",
  "done": false,
  "errors": [],
  "created": "2026-10-01T09:30:00.000000+00:00",
  "extra": null,
  "child_jobs": []
}
```

Unless the `supervisor_websocket_v2_api` development feature flag is on, some jobs still use their older names here. Backup and restore jobs report stages like `addons` instead of `apps`, and the job that updates an app is `addon_manager_update`.

### `DELETE /jobs/<job_id>`

Removes a job from the list. Fails when the job is not done.

### `POST /jobs/options`

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `ignore_conditions` | list | No | Conditions to ignore before starting a job, like `healthy` or `internet_host`. Replaces the current list. This can break things, so only use it to debug |

### `POST /jobs/reset`

Resets the job settings to the defaults, so no conditions are ignored anymore.

## Resolution

The resolution center finds problems with the system and suggests fixes. An issue is a problem, a suggestion is a fix for one, and a check is the test that finds them.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/resolution/info` | Issues, suggestions, and checks |
| `GET` | `/resolution/issue/<issue>/suggestions` | Suggestions for one issue |
| `DELETE` | `/resolution/issue/<issue>` | Dismiss an issue |
| `POST` | `/resolution/suggestion/<suggestion>` | Apply a suggestion |
| `DELETE` | `/resolution/suggestion/<suggestion>` | Dismiss a suggestion |
| `POST` | `/resolution/check/<check>/options` | Turn a check on or off |
| `POST` | `/resolution/check/<check>/run` | Run a check |
| `POST` | `/resolution/healthcheck` | Run all checks, and apply the fixes that run by themselves |

`<issue>` and `<suggestion>` are UUIDs. `<check>` is the slug of a check.

### `GET /resolution/info`

| Key | Type | Description |
| --- | --- | --- |
| `unsupported` | list | Reasons the installation is unsupported |
| `unhealthy` | list | Reasons the installation is unhealthy |
| `issues` | list | [Issue models](/apps/supervisor-api/models/#issue) |
| `suggestions` | list | [Suggestion models](/apps/supervisor-api/models/#suggestion) |
| `checks` | list | [Check models](/apps/supervisor-api/models/#check) |

Some issue types and check slugs still use their older names here, like `deprecated_addon` and `addon_pwned`.

### `GET /resolution/issue/<issue>/suggestions`

| Key | Type | Description |
| --- | --- | --- |
| `suggestions` | list | [Suggestion models](/apps/supervisor-api/models/#suggestion) that fix this issue |

### `POST /resolution/check/<check>/options`

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `enabled` | boolean | No | Turn the check on or off |

## Security

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/security/info` | Security settings |
| `POST` | `/security/options` | Change the security settings |
| `POST` | `/security/integrity` | Removed. Always returns `410` |

### `GET /security/info`

| Key | Type | Description |
| --- | --- | --- |
| `pwned` | boolean | `true` if app passwords are checked against known leaks |
| `force_security` | boolean | `true` if apps with leaked passwords are not allowed to start |

### `POST /security/options`

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `pwned` | boolean | No | Check app passwords against known leaks |
| `force_security` | boolean | No | Block apps with leaked passwords |

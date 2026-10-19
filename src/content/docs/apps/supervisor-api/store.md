---
title: Store endpoints
description: Supervisor API endpoints for the app store, to browse, install, and update apps, and to manage app repositories.
sidebarLabel: Store
order: 2
---

The store holds every app the Supervisor knows about, installed or not, from all the repositories that are added. `<app>` is the slug of an app, including the repository prefix, like `core_mosquitto` or `a0d7b954_vscode`.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/store` | Apps and repositories in the store |
| `POST` | `/store/reload` | Read all repositories again |
| `GET` | `/store/addons` | List the apps in the store |
| `GET` | `/store/addons/<app>` | Details of an app |
| `GET` | `/store/addons/<app>/<version>` | Details of an app |
| `GET` | `/store/addons/<app>/availability` | Check if an app can be installed |
| `POST` | `/store/addons/<app>/install` | Install an app |
| `POST` | `/store/addons/<app>/update` | Update an app |
| `GET` | `/store/addons/<app>/icon` | Icon of an app |
| `GET` | `/store/addons/<app>/logo` | Logo of an app |
| `GET` | `/store/addons/<app>/changelog` | Changelog of an app |
| `GET` | `/store/addons/<app>/documentation` | Documentation of an app |
| `GET` | `/store/repositories` | List the repositories |
| `POST` | `/store/repositories` | Add a repository |
| `GET` | `/store/repositories/<repository>` | Details of a repository |
| `DELETE` | `/store/repositories/<repository>` | Remove a repository |
| `POST` | `/store/repositories/<repository>/repair` | Reset a broken repository |

## Store

### `GET /store`

Returns all apps and all repositories in the store.

| Key | Type | Description |
| --- | --- | --- |
| `addons` | list | A list of [store app models](/apps/supervisor-api/models/#store-app) |
| `repositories` | list | A list of [repository models](/apps/supervisor-api/models/#repository) |

### `POST /store/reload`

Reads all repositories again: pulls the latest changes of the Git repositories and reads the local apps folder. Use it after you change the files of a local app.

## Apps in the store

### `GET /store/addons`

Returns the apps in the store.

| Key | Type | Description |
| --- | --- | --- |
| `addons` | list | A list of [store app models](/apps/supervisor-api/models/#store-app) |

```json
{
  "addons": [
    {
      "advanced": false,
      "arch": ["aarch64", "amd64"],
      "available": true,
      "build": false,
      "description": "An Open Source MQTT broker",
      "documentation": true,
      "homeassistant": null,
      "icon": true,
      "installed": true,
      "logo": true,
      "name": "Mosquitto broker",
      "repository": "core",
      "slug": "core_mosquitto",
      "stage": "stable",
      "update_available": false,
      "url": null,
      "version_latest": "6.5.1",
      "version": "6.5.1"
    }
  ]
}
```

### `GET /store/addons/<app>`

Returns the details of an app in the store. The `/store/addons/<app>/<version>` path returns the same: it ignores the version.

All keys of the [store app model](/apps/supervisor-api/models/#store-app), plus:

| Key | Type | Description |
| --- | --- | --- |
| `apparmor` | string | `disable`, `default`, or `profile` |
| `auth_api` | boolean | Can check user credentials |
| `detached` | boolean | `true` if the app is no longer in any repository |
| `docker_api` | boolean | Has access to the Docker API |
| `full_access` | boolean | Has full hardware access |
| `hassio_api` | boolean | Has access to the Supervisor API |
| `hassio_role` | string | Supervisor API role |
| `homeassistant_api` | boolean | Has access to the Home Assistant Core API proxy |
| `host_network` | boolean | Uses the host network |
| `host_pid` | boolean | Uses the host PID namespace |
| `ingress` | boolean | Uses ingress |
| `long_description` | string or null | The content of `README.md` |
| `rating` | integer | Security rating, from 1 to 8. Higher is safer |
| `signed` | boolean | Always `false` |

### `GET /store/addons/<app>/availability`

Checks if the latest version of the app can be installed on this system. Returns success if it can. Returns an error with the reason if it cannot, like an unsupported architecture or machine, or a Home Assistant version that is too old.

### `POST /store/addons/<app>/install`

Installs the latest version of an app. `POST /store/addons/<app>/install/<version>` does the same: it ignores the version.

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `background` | boolean | No | Return a `job_id` right away instead of waiting for the install to finish. Default `false` |

With `background: true`, the response is:

```json
{
  "job_id": "e2b7a9c4f1d34e5a8b6c0d1e2f3a4b5c"
}
```

### `POST /store/addons/<app>/update`

Updates an installed app to the latest version. `POST /store/addons/<app>/update/<version>` does the same: it ignores the version. An app cannot update itself. Fails while the Supervisor is still starting up or restoring a backup.

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `backup` | boolean | No | Make a backup of the app before the update. Default `false` |
| `background` | boolean | No | Return a `job_id` right away instead of waiting for the update to finish. Default `false` |

### `GET /store/addons/<app>/icon`

Returns the `icon.png` of the app as a PNG image.

### `GET /store/addons/<app>/logo`

Returns the `logo.png` of the app as a PNG image.

### `GET /store/addons/<app>/changelog`

Returns the `CHANGELOG.md` of the app as plain text. When there is none, the response is a short plain text message that says so.

### `GET /store/addons/<app>/documentation`

Returns the `DOCS.md` of the app as plain text. When there is none, the response is a short plain text message that says so.

## Repositories

### `GET /store/repositories`

Returns all repositories as a list of [repository models](/apps/supervisor-api/models/#repository).

```json
[
  {
    "slug": "1a2b3c4d",
    "name": "Example repository",
    "source": "https://github.com/example/apps",
    "url": "https://github.com/example/apps",
    "maintainer": "Jane Doe <jane@example.com>"
  }
]
```

### `POST /store/repositories`

Adds a repository to the store. The Supervisor clones it and reads its apps.

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `repository` | string | Yes | Git URL of the repository. Add `#branch` to use another branch than the default one |

```json
{
  "repository": "https://github.com/home-assistant/apps-example"
}
```

### `GET /store/repositories/<repository>`

Returns one [repository model](/apps/supervisor-api/models/#repository). `<repository>` is the slug of the repository.

### `DELETE /store/repositories/<repository>`

Removes a repository from the store. Fails for the built-in repositories, and while apps from the repository are still installed.

### `POST /store/repositories/<repository>/repair`

Throws away the local copy of a repository and clones it again. Use it when a repository is broken or shows outdated information.

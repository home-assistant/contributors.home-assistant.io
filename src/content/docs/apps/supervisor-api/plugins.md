---
title: Plugin endpoints
description: Supervisor API endpoints for the plugins that run next to Home Assistant, the audio server, the CLI, DNS, multicast, and the observer.
sidebarLabel: Plugins
order: 6
---

Plugins are containers the Supervisor runs to support the system: the audio server, the CLI, the DNS server, the multicast proxy, and the observer. Every plugin has the same basic endpoints, plus a few of its own.

To use them, your app needs `hassio_api: true` with the `manager` or `admin` role. The `/info` endpoints work with any role.

## Shared endpoints

Each plugin has these. Replace `<plugin>` with `audio`, `cli`, `dns`, `multicast`, or `observer`.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/<plugin>/info` | Version information, and the details listed per plugin below |
| `GET` | `/<plugin>/stats` | Resource usage of the plugin |
| `POST` | `/<plugin>/update` | Update the plugin |

`GET /<plugin>/info` always returns:

| Key | Type | Description |
| --- | --- | --- |
| `version` | string | Installed version |
| `version_latest` | string | Latest available version |
| `update_available` | boolean | `true` if an update is available |

`GET /<plugin>/stats` returns a [stats model](/apps/supervisor-api/models/#stats). Add the `one_shot` query parameter to get a single quick sample.

`POST /<plugin>/update` installs a new version. Fails while the Supervisor is still starting up or restoring a backup. The audio, DNS, and multicast plugins also refuse a version that is already installed.

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `version` | string | No | Version to install. Default is the latest version |

The audio, DNS, and multicast plugins also have `POST /<plugin>/restart`, which fails while the Supervisor is still starting up or restoring a backup, and [log endpoints](/apps/supervisor-api/#log-endpoints) under `/<plugin>/logs`.

## Audio

The audio plugin runs PulseAudio, which apps with `audio: true` use.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/audio/info` | Audio devices and streams |
| `POST` | `/audio/reload` | Read the audio devices again |
| `POST` | `/audio/restart` | Restart the audio server |
| `POST` | `/audio/profile` | Switch the profile of a sound card |
| `POST` | `/audio/default/<source>` | Set the default device |
| `POST` | `/audio/volume/<source>` | Set the volume of a device |
| `POST` | `/audio/volume/<source>/application` | Set the volume of an application stream |
| `POST` | `/audio/mute/<source>` | Mute a device |
| `POST` | `/audio/mute/<source>/application` | Mute an application stream |

`<source>` is `input` or `output`.

### `GET /audio/info`

| Key | Type | Description |
| --- | --- | --- |
| `host` | string | IP address of the audio server on the internal network |
| `audio` | dictionary | An [audio model](/apps/supervisor-api/models/#audio) |

Plus `version`, `version_latest`, and `update_available`.

### `POST /audio/profile`

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `card` | string | Yes | Name of the sound card |
| `name` | string | Yes | Name of the profile |

### `POST /audio/default/<source>`

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Name of the device |

### `POST /audio/volume/<source>`

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `index` | integer | Yes | Index of the device, or of the stream for the `application` path |
| `volume` | float | Yes | Volume, from 0 to 1 |

### `POST /audio/mute/<source>`

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `index` | integer | Yes | Index of the device, or of the stream for the `application` path |
| `active` | boolean | Yes | `true` to mute |

## CLI

The CLI plugin runs the `ha` command line tool. It only has the shared endpoints.

## DNS

The DNS plugin runs CoreDNS. Every container on the internal network uses it to resolve names, including the names of apps.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/dns/info` | DNS settings |
| `POST` | `/dns/options` | Change the DNS settings |
| `POST` | `/dns/restart` | Restart the DNS server |
| `POST` | `/dns/reset` | Reset the DNS settings to the defaults |

### `GET /dns/info`

| Key | Type | Description |
| --- | --- | --- |
| `host` | string | IP address of the DNS server on the internal network |
| `servers` | list | DNS servers you set |
| `locals` | list | DNS servers of the host |
| `mdns` | boolean | `true` if mDNS names are resolved |
| `llmnr` | boolean | `true` if LLMNR names are resolved |
| `fallback` | boolean | `true` if a public DNS server is used when the others fail |

Plus `version`, `version_latest`, and `update_available`.

### `POST /dns/options`

A change restarts the DNS server.

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `servers` | list | No | Up to 8 DNS servers, written as `dns://` with an IPv4 address, like `dns://1.1.1.1`. IPv6 addresses are not accepted |
| `fallback` | boolean | No | Use a public DNS server when the others fail |

## Multicast

The multicast plugin forwards mDNS between the host network and the internal network.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/multicast/info` | Multicast information |
| `POST` | `/multicast/options` | Turn the plugin on or off |
| `POST` | `/multicast/restart` | Restart the plugin |

`GET /multicast/info` adds `enabled` (boolean) to the shared keys.

### `POST /multicast/options`

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `enabled` | boolean | No | Turn the plugin on or off |

The update endpoint fails while the plugin is turned off.

## Observer

The observer is a small web page that shows the state of the system, also when Home Assistant itself does not start. It only has the shared endpoints. `GET /observer/info` adds `host`, its IP address on the internal network.

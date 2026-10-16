---
title: Supervisor API models
description: The objects that several Supervisor API endpoints return, like apps, backups, jobs, network interfaces, and mounts.
sidebarLabel: Models
order: 9
---

These are the objects that come back from more than one endpoint. The endpoint pages link here.

## App

An installed app, as [`GET /addons`](/apps/supervisor-api/apps/#get-addons) lists it. [`GET /addons/<app>/info`](/apps/supervisor-api/apps/#get-addonsappinfo) returns more.

| Key | Type | Description |
| --- | --- | --- |
| `name` | string | Name of the app |
| `slug` | string | Slug of the app |
| `description` | string | Short description |
| `advanced` | boolean | Deprecated, always `false` |
| `stage` | string | `stable`, `experimental`, or `deprecated` |
| `version` | string | Installed version |
| `version_latest` | string | Latest available version |
| `update_available` | boolean | `true` if an update is available |
| `available` | boolean | `true` if the app can run on this system |
| `detached` | boolean | `true` if the app is no longer in any repository |
| `homeassistant` | string or null | Minimum Home Assistant version |
| `state` | string | `startup`, `started`, `stopped`, `unknown`, or `error` |
| `repository` | string | Slug of the repository |
| `build` | boolean | `true` if the app is built locally |
| `url` | string or null | Website of the app |
| `icon` | boolean | `true` if the app has an icon |
| `logo` | boolean | `true` if the app has a logo |
| `system_managed` | boolean | `true` if Home Assistant manages the app |

## Store app

An app in the store, installed or not, as [`GET /store/addons`](/apps/supervisor-api/store/#get-storeaddons) lists it.

| Key | Type | Description |
| --- | --- | --- |
| `name` | string | Name of the app |
| `slug` | string | Slug of the app |
| `description` | string | Short description |
| `advanced` | boolean | Deprecated, always `false` |
| `arch` | list | Supported architectures |
| `available` | boolean | `true` if the app can be installed on this system |
| `build` | boolean | `true` if the app is built locally |
| `documentation` | boolean | `true` if the app has documentation |
| `homeassistant` | string or null | Minimum Home Assistant version |
| `icon` | boolean | `true` if the app has an icon |
| `logo` | boolean | `true` if the app has a logo |
| `installed` | boolean | `true` if the app is installed |
| `repository` | string | Slug of the repository |
| `stage` | string | `stable`, `experimental`, or `deprecated` |
| `update_available` | boolean | `true` if an update is available |
| `url` | string or null | Website of the app |
| `version` | string or null | Installed version, `null` if it is not installed |
| `version_latest` | string | Latest available version |

## Repository

| Key | Type | Description |
| --- | --- | --- |
| `slug` | string | Slug of the repository |
| `name` | string | Name of the repository |
| `source` | string | Git URL, or `local` and `core` for the built-in ones |
| `url` | string | Website of the repository. Same as `source` when the repository sets none |
| `maintainer` | string | Maintainer of the repository |

## Backup

| Key | Type | Description |
| --- | --- | --- |
| `slug` | string | ID of the backup |
| `name` | string | Name of the backup |
| `date` | string | When the backup was made, in ISO 8601 |
| `type` | string | `full` or `partial` |
| `size` | float | Size in MB |
| `size_bytes` | integer | Size in bytes |
| `location` | string or null | The main location. `null` is the local backup folder |
| `locations` | list | All locations the backup is stored in |
| `protected` | boolean | `true` if the backup has a password |
| `location_attributes` | dictionary | `protected` and `size_bytes` per location. The local folder is `.local` |
| `compressed` | boolean | `true` if the backup is compressed |
| `content` | dictionary | What is in the backup: `homeassistant` (boolean), `addons` (list of slugs), and `folders` (list) |

## Stats

Resource usage of a container.

| Key | Type | Description |
| --- | --- | --- |
| `cpu_percent` | float or null | CPU use in percent, `null` for a one-shot sample |
| `cpu_usage` | integer | Total CPU time of the container |
| `cpu_system_usage` | integer | Total CPU time of the system |
| `online_cpus` | integer | Number of CPUs |
| `memory_usage` | integer | Memory use in bytes |
| `memory_limit` | integer | Memory limit in bytes |
| `memory_percent` | float | Memory use in percent of the limit |
| `network_rx` | integer | Bytes received |
| `network_tx` | integer | Bytes sent |
| `blk_read` | integer | Bytes read from disk |
| `blk_write` | integer | Bytes written to disk |

## Service

| Key | Type | Description |
| --- | --- | --- |
| `slug` | string | Name of the service, like `mqtt` |
| `available` | boolean | `true` if an app provides the service |
| `providers` | list | Slugs of the apps that can provide the service |

## Discovery

| Key | Type | Description |
| --- | --- | --- |
| `addon` | string | Slug of the app that sent the message |
| `service` | string | Domain of the integration |
| `uuid` | string | ID of the message |
| `config` | dictionary | What the integration needs to connect |

## Panel

| Key | Type | Description |
| --- | --- | --- |
| `title` | string | Title in the sidebar |
| `icon` | string | Icon in the sidebar |
| `admin` | boolean | `true` if only administrators see the panel |
| `enable` | boolean | `true` if the panel shows in the sidebar |

## User

| Key | Type | Description |
| --- | --- | --- |
| `username` | string | User name to log in with |
| `name` | string | Display name |
| `is_owner` | boolean | `true` if the user is the owner |
| `is_active` | boolean | `true` if the user can log in |
| `local_only` | boolean | `true` if the user can only log in from the local network |
| `group_ids` | list | Groups of the user, like `system-admin` |

## Job

| Key | Type | Description |
| --- | --- | --- |
| `name` | string | Name of the job |
| `reference` | string or null | What the job works on, like an app slug or backup ID |
| `uuid` | string | ID of the job |
| `progress` | float | Progress from 0 to 100, when the job can tell |
| `stage` | string or null | Stage the job is in |
| `done` | boolean or null | `true` when done, `null` if the job has not started |
| `created` | string | When the job was created, in ISO 8601 |
| `errors` | list | [Job errors](#job-error) |
| `extra` | dictionary or null | Extra information about the job or its stage |
| `child_jobs` | list | Jobs this job started |

### Job error

| Key | Type | Description |
| --- | --- | --- |
| `type` | string | Type of the error |
| `message` | string | What went wrong |
| `stage` | string or null | Stage the job was in |
| `error_key` | string or null | Stable key for the error |
| `extra_fields` | dictionary or null | Values that go with the `error_key` |

## Issue

| Key | Type | Description |
| --- | --- | --- |
| `uuid` | string | ID of the issue |
| `type` | string | Type of the issue |
| `context` | string | Where the issue is, like `addon`, `core`, or `system` |
| `reference` | string or null | What it is about, like an app slug |
| `reference_extra` | dictionary or null | Extra details, like the port that conflicts |

## Suggestion

| Key | Type | Description |
| --- | --- | --- |
| `uuid` | string | ID of the suggestion |
| `type` | string | Type of the fix |
| `context` | string | Where the fix applies |
| `reference` | string or null | What it is about, like an app slug |
| `reference_extra` | dictionary or null | Extra details |
| `auto` | boolean | `true` if the Supervisor applies the fix by itself |

## Check

| Key | Type | Description |
| --- | --- | --- |
| `slug` | string | Slug of the check |
| `enabled` | boolean | `true` if the check runs |

## Host service

| Key | Type | Description |
| --- | --- | --- |
| `name` | string | Name of the systemd unit |
| `description` | string | Description of the unit |
| `state` | string | State of the unit, like `active` |

## Network interface

| Key | Type | Description |
| --- | --- | --- |
| `interface` | string | Name of the interface, like `eth0` |
| `type` | string | `ethernet`, `wireless`, or `vlan` |
| `enabled` | boolean | `true` if the interface is on |
| `connected` | boolean | `true` if the interface is connected |
| `primary` | boolean | `true` if this is the primary interface |
| `mac` | string | MAC address |
| `ipv4` | dictionary or null | [IP configuration](#ip-configuration) |
| `ipv6` | dictionary or null | [IP configuration](#ip-configuration) |
| `wifi` | dictionary or null | [Wi-Fi configuration](#wi-fi-configuration) |
| `vlan` | dictionary or null | [VLAN configuration](#vlan-configuration) |
| `mdns` | string | `default`, `off`, `resolve`, or `announce` |
| `llmnr` | string | `default`, `off`, `resolve`, or `announce` |

### IP configuration

| Key | Type | Description |
| --- | --- | --- |
| `method` | string | `auto`, `static`, or `disabled` |
| `address` | list | Addresses with prefix |
| `gateway` | string or null | The gateway |
| `nameservers` | list | DNS servers |
| `route_metric` | integer or null | Route metric, lower wins |
| `ready` | boolean | `true` if the configuration is active |
| `addr_gen_mode` | string | IPv6 only: `eui64`, `stable-privacy`, `default-or-eui64`, or `default` |
| `ip6_privacy` | string | IPv6 only: `disabled`, `enabled-prefer-public`, `enabled`, or `default` |

### Wi-Fi configuration

| Key | Type | Description |
| --- | --- | --- |
| `mode` | string | `infrastructure`, `mesh`, `adhoc`, or `ap` |
| `auth` | string | `open`, `wep`, `wpa-psk`, or `unsupported` |
| `ssid` | string | Name of the network |
| `signal` | integer or null | Signal strength in percent |

### VLAN configuration

| Key | Type | Description |
| --- | --- | --- |
| `id` | integer | VLAN ID |
| `parent` | string | Interface the VLAN runs on |

## Access point

| Key | Type | Description |
| --- | --- | --- |
| `mode` | string | `infrastructure`, `mesh`, or `adhoc` |
| `ssid` | string | Name of the network |
| `frequency` | integer | Frequency in MHz |
| `signal` | integer | Signal strength in percent |
| `mac` | string | MAC address of the access point |

## Mount

The same object goes into `POST /mounts` and comes back from `GET /mounts`. Some keys only go one way.

| Key | Type | Direction | Description |
| --- | --- | --- | --- |
| `name` | string | Both | Name of the mount: letters, digits, and underscores |
| `type` | string | Both | `cifs`, `nfs`, or `disk` |
| `usage` | string | Both | `backup`, `media`, or `share` |
| `read_only` | boolean | Both | Mount read-only. Not allowed for backup mounts. Default `false` |
| `server` | string | Both | CIFS and NFS: host name or IP address of the server |
| `port` | integer | Both | CIFS and NFS: port, when it is not the default |
| `share` | string | Both | CIFS: name of the share |
| `version` | string or null | Both | CIFS: `1.0` or `2.0` to force an old protocol version |
| `username` | string | Request | CIFS: user name. Send it together with `password`, or leave both out |
| `password` | string | Request | CIFS: password |
| `path` | string | Both | NFS: path on the server |
| `uuid` | string | Both | Disk: UUID of the partition, from [`GET /host/disks`](/apps/supervisor-api/host/#get-hostdisks) |
| `device` | string | Request | Disk: device path of the partition. Send `uuid`, `device`, or both |
| `filesystem` | string | Response | Disk: file system of the partition |
| `state` | string or null | Response | State of the mount, like `active` or `failed` |
| `user_path` | string or null | Response | Where apps find the mount, like `/media/nas` |

## Boot slot

| Key | Type | Description |
| --- | --- | --- |
| `state` | string | State of the slot as RAUC reports it, like `booted`, `active`, or `inactive` |
| `status` | string or null | Result of the last boot from this slot: `good` or `bad` |
| `version` | string or null | OS version in this slot |

## Disk

| Key | Type | Description |
| --- | --- | --- |
| `name` | string | Name of the disk |
| `vendor` | string | Vendor |
| `model` | string | Model |
| `serial` | string | Serial number |
| `size` | integer | Size in bytes |
| `id` | string | ID of the disk: the UDisks2 drive ID, or the device path when there is none |
| `dev_path` | string | Device path |

## Device

| Key | Type | Description |
| --- | --- | --- |
| `name` | string | Name of the device |
| `sysfs` | string | Path in sysfs |
| `dev_path` | string | Path in `/dev` |
| `subsystem` | string or null | Subsystem, like `tty`, `input`, or `sound` |
| `by_id` | string or null | The `/dev/serial/by-id` style link |
| `attributes` | dictionary | The udev attributes |
| `children` | list | Paths of the child devices in sysfs |

## Drive

| Key | Type | Description |
| --- | --- | --- |
| `vendor` | string | Vendor |
| `model` | string | Model |
| `revision` | string | Firmware revision |
| `serial` | string | Serial number |
| `id` | string | ID of the drive |
| `size` | integer | Size in bytes |
| `time_detected` | string | When the drive was found, in ISO 8601 |
| `connection_bus` | string | Bus, like `usb` |
| `seat` | string | Seat the drive belongs to |
| `removable` | boolean | `true` if the user can remove the drive |
| `ejectable` | boolean | `true` if the system can eject the drive |
| `filesystems` | list | [Filesystems](#filesystem) on the drive |

### Filesystem

| Key | Type | Description |
| --- | --- | --- |
| `device` | string | Device file, like `/dev/sda1` |
| `id` | string | ID of the filesystem |
| `size` | integer | Size in bytes |
| `name` | string | Label of the filesystem |
| `system` | boolean | `true` if it is a system filesystem |
| `mount_points` | list | Where the filesystem is mounted |

## Audio

The `audio` object of [`GET /audio/info`](/apps/supervisor-api/plugins/#get-audioinfo).

| Key | Type | Description |
| --- | --- | --- |
| `card` | list | [Sound cards](#sound-card) |
| `input` | list | [Audio devices](#audio-device) for input |
| `output` | list | [Audio devices](#audio-device) for output |
| `application` | list | [Application streams](#application-stream) |

### Sound card

| Key | Type | Description |
| --- | --- | --- |
| `name` | string | Name of the card |
| `index` | integer | PulseAudio index of the card |
| `driver` | string | Driver of the card |
| `profiles` | list | Profiles, each with `name`, `description`, and `active` |

### Audio device

| Key | Type | Description |
| --- | --- | --- |
| `name` | string | Name of the device |
| `index` | integer | PulseAudio index of the device |
| `description` | string | Description |
| `volume` | float | Volume, from 0 to 1 |
| `mute` | boolean | `true` if muted |
| `default` | boolean | `true` if this is the default device |
| `card` | integer or null | Index of the sound card |
| `applications` | list | [Application streams](#application-stream) on this device |

### Application stream

| Key | Type | Description |
| --- | --- | --- |
| `name` | string | Name of the application |
| `index` | integer | PulseAudio index of the stream |
| `stream_index` | string | Index of the device the stream plays on |
| `stream_type` | string | `input` or `output` |
| `volume` | float | Volume, from 0 to 1 |
| `mute` | boolean | `true` if muted |
| `app` | string | Slug of the app the stream belongs to |

---
title: Host and OS endpoints
description: Supervisor API endpoints for the host system, Home Assistant OS, hardware, network, time, mounts, and Docker.
sidebarLabel: Host and OS
order: 5
---

These endpoints reach below the containers: the host system and its operating system. Most of them need `hassio_api: true` with the `manager` or `admin` role. The `/info` endpoints, like `GET /host/info`, work with any role.

Some endpoints only exist on Home Assistant OS, or need a recent version of it. They return a `404` when they are not available.

## Host

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/host/info` | Information about the host |
| `POST` | `/host/options` | Change host settings |
| `POST` | `/host/reboot` | Reboot the host |
| `POST` | `/host/shutdown` | Shut the host down |
| `POST` | `/host/reload` | Read the host information again |
| `GET` | `/host/services` | List the systemd services |
| `GET` | `/host/disks` | List disks that can be mounted |
| `GET` | `/host/disks/<disk>/usage` | Disk usage |
| `GET` | `/host/logs` | Logs of the host |
| `GET` | `/host/logs/boots` | List the boots in the journal |
| `GET` | `/host/logs/identifiers` | List the syslog identifiers in the journal |

### `GET /host/info`

| Key | Type | Description |
| --- | --- | --- |
| `agent_version` | string or null | Version of the OS Agent |
| `apparmor_version` | string or null | Version of AppArmor |
| `chassis` | string or null | Chassis type, like `embedded` or `vm` |
| `virtualization` | string or null | Virtualization type, empty when there is none |
| `cpe` | string or null | CPE name of the operating system |
| `deployment` | string or null | Deployment type, like `production` or `development` |
| `disk_free` | float | Free disk space in GiB |
| `disk_total` | float | Total disk space in GiB |
| `disk_used` | float | Used disk space in GiB |
| `disk_life_time` | float or null | Used lifetime of the data disk in percent, when the disk reports it |
| `features` | list | Features the host supports, like `reboot`, `network`, or `haos` |
| `all_features` | list | All features. `features` leaves out `ntp` for older clients |
| `hostname` | string or null | Host name |
| `llmnr_hostname` | string or null | Host name for LLMNR |
| `kernel` | string or null | Kernel version |
| `operating_system` | string or null | Name of the operating system |
| `timezone` | string or null | Time zone of the host |
| `dt_utc` | string | Current time in UTC, in ISO 8601 |
| `dt_synchronized` | boolean or null | `true` if the clock is synchronized |
| `use_ntp` | boolean or null | `true` if the host uses NTP |
| `startup_time` | float or null | Seconds the last boot took |
| `boot_timestamp` | integer or null | Timestamp of the last boot in microseconds, as systemd reports it |
| `broadcast_llmnr` | boolean or null | `true` if the host announces itself over LLMNR |
| `broadcast_mdns` | boolean or null | `true` if the host announces itself over mDNS |

### `POST /host/options`

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `hostname` | string | No | New host name |

### `POST /host/reboot`

Reboots the host. Fails while Home Assistant runs a database migration, unless you force it.

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `force` | boolean | No | Reboot even during a database migration. Default `false` |

### `POST /host/shutdown`

Shuts the host down. Takes the same `force` key as `POST /host/reboot`.

### `POST /host/reload`

Reads the host information again.

### `GET /host/services`

| Key | Type | Description |
| --- | --- | --- |
| `services` | list | A list of [host service models](/apps/supervisor-api/models/#host-service) |

### `GET /host/disks`

Returns the disks with partitions that can be used for a [disk mount](#mounts).

| Key | Type | Description |
| --- | --- | --- |
| `disks` | list | Disks, each with `name`, `vendor`, `model`, `serial`, `size`, `id`, `dev_path`, `connection_bus`, `removable`, `ejectable`, and `partitions` |

Each partition has `device`, `uuid`, `label`, `filesystem`, `size`, `read_only`, and `mountable`.

### `GET /host/disks/<disk>/usage`

Returns how the space on a disk is used, in bytes. Use `default` as `<disk>` for the system disk, or the name of a mount. `default` always means the system disk, so a mount named `default` cannot be measured here.

| Query parameter | Description |
| --- | --- |
| `max_depth` | How many levels of folders to break down. The default is 1 for the system disk, and 0 for a mount |

| Key | Type | Description |
| --- | --- | --- |
| `id` | string | ID of the entry |
| `label` | string | Name of the entry |
| `total_bytes` | integer | Size of the disk. Only on the top entry |
| `used_bytes` | integer | Used space |
| `children` | list | The same structure for each part. Left out when there is no breakdown |

For the system disk, the children are `system`, `addons_data`, `addons_config`, `media`, `share`, `backup`, `ssl`, and `homeassistant`, and `max_depth` sets how far the breakdown goes inside them.

A mount has no such fixed parts, so the Supervisor walks its folders. A `max_depth` of 0 or 1 returns the totals only, 2 adds the first level of folders, and every level below that needs one more. An `other` child holds what is not in a folder, like files at the top of the mount. When the files change during the walk and the folders add up to more than `used_bytes`, the breakdown is left out.

The Supervisor measures a mount by accessing it, which mounts it when it was not mounted yet. A mount that does not exist returns a `404`. A mount that cannot be read, is no longer mounted, or does not answer within 60 seconds returns an error. The measurement keeps running after that, and a new request waits for the same measurement instead of starting another one.

### Host logs

`GET /host/logs` returns the logs of the host, and works like the other [log endpoints](/apps/supervisor-api/#log-endpoints). By default it shows the most important services, and every line comes with its timestamp and process, as with `verbose`. These endpoints narrow it down:

| Path | Returns |
| --- | --- |
| `/host/logs/follow` | The logs, then streams new lines |
| `/host/logs/boots/<bootid>` | The logs of one boot |
| `/host/logs/boots/<bootid>/follow` | The logs of one boot, then streams new lines |
| `/host/logs/identifiers/<identifier>` | The logs of one syslog identifier |
| `/host/logs/identifiers/<identifier>/follow` | The logs of one identifier, then streams new lines |
| `/host/logs/boots/<bootid>/identifiers/<identifier>` | The logs of one identifier in one boot |
| `/host/logs/boots/<bootid>/identifiers/<identifier>/follow` | The same, then streams new lines |

### `GET /host/logs/boots`

Returns the boots in the journal, by offset. `0` is the current boot.

```json
{
  "boots": {
    "0": "b1c386a144fd44db8f855d7e907256f8",
    "-1": "a3b0e6b2f2cf4e1d9d1e1c8b9a7f6e5d"
  }
}
```

### `GET /host/logs/identifiers`

Returns the syslog identifiers in the journal, as `identifiers`. Useful ones are `NetworkManager` for network problems, `bluetoothd` for Bluetooth, and `audit` when you work on an AppArmor profile.

## Home Assistant OS

These only work on Home Assistant OS.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/os/info` | Information about the OS |
| `POST` | `/os/update` | Update the OS |
| `POST` | `/os/config/sync` | Load configuration from a USB stick |
| `GET` | `/os/config/swap` | Swap settings |
| `POST` | `/os/config/swap` | Change the swap settings |
| `POST` | `/os/boot-slot` | Switch the boot slot and reboot |
| `GET` | `/os/datadisk/list` | Disks the data can move to |
| `POST` | `/os/datadisk/move` | Move the data to another disk |
| `POST` | `/os/datadisk/wipe` | Wipe the data disk |
| `GET` | `/os/boards/<board>` | Check the board |
| `GET` | `/os/boards/yellow` | Settings of Home Assistant Yellow |
| `POST` | `/os/boards/yellow` | Change the settings of Home Assistant Yellow |
| `GET` | `/os/boards/green` | Settings of Home Assistant Green |
| `POST` | `/os/boards/green` | Change the settings of Home Assistant Green |
| `GET` | `/os/boards/raspberrypi/firmware` | Raspberry Pi firmware state |
| `POST` | `/os/boards/raspberrypi/firmware/update` | Update the Raspberry Pi firmware |
| `GET` | `/os/ssh/authorized_keys` | List the SSH keys of the host |
| `POST` | `/os/ssh/authorized_keys` | Add an SSH key to the host |
| `DELETE` | `/os/ssh/authorized_keys` | Remove all SSH keys of the host |

### `GET /os/info`

| Key | Type | Description |
| --- | --- | --- |
| `version` | string | Installed version |
| `version_latest` | string | Latest available version |
| `version_pending` | string or null | Version that is installed but waits for a reboot |
| `update_available` | boolean | `true` if an update is available |
| `board` | string | Board name, like `generic-x86-64` or `yellow` |
| `boot` | string | Active boot slot |
| `data_disk` | string | ID of the data disk |
| `boot_slots` | dictionary | Per boot slot (`A` and `B`) a [boot slot model](/apps/supervisor-api/models/#boot-slot). Use these names for `POST /os/boot-slot` |

### `POST /os/update`

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `version` | string | No | Version to install. Default is the latest version |

Installs the update into the inactive slot, and returns. It does not reboot: the new version waits in `version_pending` of `GET /os/info` until the system reboots, for example with `POST /host/reboot`. Until then, `version` is still the running version. For Home Assistant Core versions older than 2026.8, `version` reports the pending version instead, so the update is not offered again.

### `POST /os/config/sync`

Loads configuration from a USB stick, like network settings.

### `GET /os/config/swap`

Needs Home Assistant OS 15.0 or newer.

| Key | Type | Description |
| --- | --- | --- |
| `swap_size` | string | Size of the swap file, like `1G` |
| `swappiness` | integer | Kernel swappiness, from 0 to 200 |

### `POST /os/config/swap`

Takes the same keys. `swap_size` is a number with an optional unit: `B`, `K`, `M`, or `G`, optionally followed by `B` or `iB`. A size below 40 kB turns swap off. A change creates a reboot required issue.

### `POST /os/boot-slot`

Switches to the other boot slot and reboots into it.

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `boot_slot` | string | Yes | `A` or `B` |

### `GET /os/datadisk/list`

| Key | Type | Description |
| --- | --- | --- |
| `devices` | list | IDs of the disks the data can move to |
| `disks` | list | A list of [disk models](/apps/supervisor-api/models/#disk) |

### `POST /os/datadisk/move`

Moves the data partition to another disk, and reboots the system.

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | string | Yes | ID or device path of the target disk |

### `POST /os/datadisk/wipe`

Wipes the data disk and reboots. Only apps with the `admin` role can call this.

The wipe formats the data partition and the overlay partition. That removes Home Assistant, all apps, backups, and media on the data disk, and host settings like the network connections. The OS and its boot slots stay. After the reboot, the system downloads Home Assistant again and starts with onboarding, like a new installation. You may have to set up the network again to reach it.

### `GET /os/boards/<board>`

Returns success with empty data when `<board>` is the board in use, and an error otherwise. `<board>` is the `board` value of `GET /os/info`.

### `GET /os/boards/yellow`

| Key | Type | Description |
| --- | --- | --- |
| `disk_led` | boolean | Disk activity LED is on |
| `heartbeat_led` | boolean | Heartbeat LED is on |
| `power_led` | boolean | Power LED is on |

`POST /os/boards/yellow` takes the same keys, all optional. A change creates a reboot required issue.

### `GET /os/boards/green`

| Key | Type | Description |
| --- | --- | --- |
| `activity_led` | boolean | Activity LED is on |
| `power_led` | boolean | Power LED is on |
| `system_health_led` | boolean | System health LED is on |

`POST /os/boards/green` takes the same keys, all optional.

### `GET /os/boards/raspberrypi/firmware`

Returns the state of the Raspberry Pi bootloader firmware, and of the VL805 USB controller firmware where the board has one. Returns a `404` when the board has no firmware to manage, or the OS Agent is older than 1.9.0.

| Key | Type | Description |
| --- | --- | --- |
| `current_version` | string or null | Installed firmware version |
| `latest_version` | string or null | Latest firmware version that comes with the OS |
| `update_available` | boolean | `true` if an update is available |
| `update_blocked` | boolean | `true` if the boot device does not allow updates |
| `update_pending` | boolean | `true` if an update waits for a reboot |
| `blocked_reason` | string or null | Why the update is blocked, `null` when it is not. For now always `unsupported_boot_device`, whatever the cause |

### `POST /os/boards/raspberrypi/firmware/update`

Updates the Raspberry Pi firmware to the version that comes with the OS. Returns an error when `update_blocked` is `true`. The new firmware runs after a reboot, so a successful update creates a reboot required issue.

### SSH keys of the host

`/os/ssh/authorized_keys` manages the SSH keys of the `root` user of the host. Only Home Assistant Core can call these endpoints, not apps.

- `GET` returns the keys as `keys`. It needs OS Agent 1.11.0 or newer, and returns a `404` otherwise.
- `POST` adds the key you send as `key`, like `ssh-ed25519 AAAA...`. The key may not be longer than 3000 bytes or contain control characters. Adding a key also starts the SSH server of the host.
- `DELETE` removes all keys.

## Hardware

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/hardware/info` | Devices and drives |
| `GET` | `/hardware/audio` | Audio devices |

### `GET /hardware/info`

| Key | Type | Description |
| --- | --- | --- |
| `devices` | list | A list of [device models](/apps/supervisor-api/models/#device) |
| `drives` | list | A list of [drive models](/apps/supervisor-api/models/#drive) |

### `GET /hardware/audio`

Returns the audio devices of the host, by name and description.

```json
{
  "audio": {
    "input": {
      "0,0": "Mic"
    },
    "output": {
      "1,0": "Jack",
      "0,1": "HDMI"
    }
  }
}
```

## Network

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/network/info` | All interfaces and the internal network |
| `POST` | `/network/reload` | Read the network state again |
| `GET` | `/network/interface/<interface>/info` | One interface |
| `POST` | `/network/interface/<interface>/update` | Change an interface |
| `GET` | `/network/interface/<interface>/accesspoints` | Scan for Wi-Fi networks |
| `POST` | `/network/interface/<interface>/vlan/<id>` | Create a VLAN |

`<interface>` is the name of an interface, like `eth0`, or `default` for the primary interface.

### `GET /network/info`

| Key | Type | Description |
| --- | --- | --- |
| `interfaces` | list | A list of [network interface models](/apps/supervisor-api/models/#network-interface) |
| `docker` | dictionary | The internal network: `interface`, `address`, `gateway`, and `dns` |
| `host_internet` | boolean or null | `true` if the host can reach the internet |
| `supervisor_internet` | boolean | `true` if the Supervisor can reach the internet |

```json
{
  "interfaces": [
    {
      "interface": "eth0",
      "type": "ethernet",
      "enabled": true,
      "connected": true,
      "primary": true,
      "mac": "52:54:00:12:34:56",
      "ipv4": {
        "method": "auto",
        "address": ["192.168.1.100/24"],
        "nameservers": ["192.168.1.1"],
        "gateway": "192.168.1.1",
        "route_metric": null,
        "ready": true
      },
      "ipv6": null,
      "wifi": null,
      "vlan": null,
      "mdns": "default",
      "llmnr": "default"
    }
  ],
  "docker": {
    "interface": "hassio",
    "address": "172.30.32.0/23",
    "gateway": "172.30.32.1",
    "dns": "172.30.32.3"
  },
  "host_internet": true,
  "supervisor_internet": true
}
```

### `POST /network/reload`

Reads the network state again, and checks the internet connection.

### `GET /network/interface/<interface>/info`

Returns one [network interface model](/apps/supervisor-api/models/#network-interface).

### `POST /network/interface/<interface>/update`

Changes the configuration of an interface. Send at least one key. A block you send replaces the whole configuration of that block, so send all of its keys.

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `enabled` | boolean | No | Turn the interface on or off |
| `ipv4` | dictionary | No | IPv4 settings, see below |
| `ipv6` | dictionary | No | IPv6 settings, see below |
| `wifi` | dictionary | No | Wi-Fi settings, see below |
| `mdns` | string | No | `default`, `off`, `resolve`, or `announce` |
| `llmnr` | string | No | `default`, `off`, `resolve`, or `announce` |

The `ipv4` and `ipv6` blocks take:

| Key | Type | Description |
| --- | --- | --- |
| `method` | string | `auto`, `static`, or `disabled`. Default `static` |
| `address` | list | Addresses with prefix, like `192.168.1.100/24` |
| `gateway` | string | The gateway |
| `nameservers` | list | DNS servers |
| `route_metric` | integer | Route metric, lower wins |
| `addr_gen_mode` | string | IPv6 only: `eui64`, `stable-privacy`, `default-or-eui64`, or `default` |
| `ip6_privacy` | string | IPv6 only: `disabled`, `enabled-prefer-public`, `enabled`, or `default` |

The `wifi` block takes:

| Key | Type | Description |
| --- | --- | --- |
| `mode` | string | `infrastructure`, `mesh`, `adhoc`, or `ap`. Default `infrastructure` |
| `auth` | string | `open`, `wep`, or `wpa-psk`. Default `open` |
| `ssid` | string | Name of the network |
| `psk` | string | Password of the network |

```json
{
  "ipv4": {
    "method": "static",
    "address": ["192.168.1.100/24"],
    "gateway": "192.168.1.1",
    "nameservers": ["192.168.1.1"]
  }
}
```

### `GET /network/interface/<interface>/accesspoints`

Scans for Wi-Fi networks. Only works on a wireless interface.

| Key | Type | Description |
| --- | --- | --- |
| `accesspoints` | list | A list of [access point models](/apps/supervisor-api/models/#access-point) |

### `POST /network/interface/<interface>/vlan/<id>`

Creates a VLAN on an Ethernet interface. `<id>` is the VLAN ID, from 0 to 4094. Takes the `ipv4`, `ipv6`, `mdns`, and `llmnr` keys of the update endpoint. Here, `method` defaults to `auto` instead of `static`.

## Time

These endpoints set the NTP servers the host uses to sync its clock. They need Home Assistant OS 18.3 or newer, and return a `404` otherwise. When they are available, `features` of `GET /host/info` lists `ntp`.

### `GET /time/info`

Returns the servers the Supervisor configured, as `config`. The host can also get servers from other places, like DHCP, so the servers in use can differ.

```json
{
  "config": {
    "servers": ["time.cloudflare.com"],
    "fallback_servers": []
  }
}
```

### `POST /time/options`

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `servers` | list | No | NTP servers to use |
| `fallback_servers` | list | No | NTP servers to use when the others are not reachable |

A key you leave out keeps its value. An empty list clears the configured servers. Each server is a host name or IP address. After a change, the time sync service of the host restarts.

## Mounts

Mounts add network shares and local disks to the system, for backups, media, or the share folder.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/mounts` | List the mounts |
| `POST` | `/mounts/options` | Change the mount settings |
| `POST` | `/mounts` | Add a mount |
| `PUT` | `/mounts/<name>` | Change a mount |
| `DELETE` | `/mounts/<name>` | Remove a mount |
| `POST` | `/mounts/<name>/reload` | Mount it again |

### `GET /mounts`

| Key | Type | Description |
| --- | --- | --- |
| `default_backup_mount` | string or null | Name of the mount backups go to by default, `null` for local |
| `mounts` | list | A list of [mount models](/apps/supervisor-api/models/#mount) |

### `POST /mounts/options`

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `default_backup_mount` | string or null | No | Name of a backup mount, or `null` for local backups |

### `POST /mounts`

Adds a mount. The body is a [mount model](/apps/supervisor-api/models/#mount).

```json
{
  "name": "nas_backups",
  "usage": "backup",
  "type": "cifs",
  "server": "nas.local",
  "share": "backups",
  "username": "homeassistant",
  "password": "secret"
}
```

The first backup mount you add becomes the default backup location.

### `PUT /mounts/<name>`

Replaces the configuration of a mount. Takes the same body as `POST /mounts`. You cannot change the name.

### `DELETE /mounts/<name>`

Removes a mount.

### `POST /mounts/<name>/reload`

Checks whether the mount answers. A mount that answers is left alone. Otherwise Supervisor mounts it again with the same configuration, and returns an error when it still cannot reach it. Useful when a share was not reachable.

## Docker

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/docker/info` | Docker information |
| `POST` | `/docker/options` | Change Docker settings |
| `GET` | `/docker/registries` | List the container registries with credentials |
| `POST` | `/docker/registries` | Add credentials for a registry |
| `DELETE` | `/docker/registries/<hostname>` | Remove the credentials of a registry |
| `POST` | `/docker/migrate-storage-driver` | Switch the storage driver |
| `POST` | `/docker/reset-storage` | Reset the Docker storage on the next reboot |

### `GET /docker/info`

| Key | Type | Description |
| --- | --- | --- |
| `version` | string | Docker version |
| `enable_ipv6` | boolean or null | `true` if IPv6 is on for the internal network |
| `mtu` | integer or null | MTU of the internal network |
| `storage` | string | Storage driver |
| `logging` | string | Logging driver |
| `registries` | dictionary | Registries with credentials, by host name, with the `username` |

### `POST /docker/options`

A change needs a reboot to take effect, and creates a reboot required issue.

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `enable_ipv6` | boolean or null | No | Turn IPv6 on for the internal network |
| `mtu` | integer or null | No | MTU of the internal network, from 68 to 65535 |

### `GET /docker/registries`

```json
{
  "registries": {
    "ghcr.io": {
      "username": "octocat"
    }
  }
}
```

### `POST /docker/registries`

Adds credentials for a container registry. The Supervisor uses them to pull images. For Docker Hub, use `docker.io` as the host name.

```json
{
  "ghcr.io": {
    "username": "octocat",
    "password": "ghp_secret"
  }
}
```

### `DELETE /docker/registries/<hostname>`

Removes the credentials of a registry.

### `POST /docker/migrate-storage-driver`

Switches the Docker storage driver on the next reboot, and creates a reboot required issue. Needs Home Assistant OS 17.0 or newer, and returns a `404` otherwise.

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `storage_driver` | string | Yes | `overlayfs` |

### `POST /docker/reset-storage`

Throws away all images and containers on the next reboot, and creates a reboot required issue. After the reboot, the system downloads the images of the Supervisor, Home Assistant Core, the plugins, and the apps again, so it needs internet access. Needs Home Assistant OS 18.3 or newer, and returns a `404` otherwise.

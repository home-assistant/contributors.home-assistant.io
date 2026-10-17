---
title: App configuration
description: Every key of an app's config.yaml, what it does, and what the Supervisor accepts.
order: 1
---

Every app has a configuration file in its folder that tells the Supervisor what the app is and what it needs. This page lists every key the Supervisor accepts. It follows the schema in the Supervisor code ([`supervisor/apps/validate.py`](https://github.com/home-assistant/supervisor/blob/main/supervisor/apps/validate.py)).

The file is called `config.yaml`, `config.yml`, or `config.json`. All examples here use YAML. Because the Supervisor searches a repository for these names at any depth, do not use `config.yaml` for anything else in your app, unless it is inside a folder called `rootfs` or a hidden folder.

```yaml
name: "Hello world"
version: "1.1.0"
slug: "hello_world"
description: "My first real app!"
url: "https://github.com/me/my-apps/tree/main/hello_world"
arch:
  - aarch64
  - amd64
init: false
ports:
  8000/tcp: 8000
map:
  - type: share
    read_only: false
  - type: homeassistant_config
    path: /custom/config/path
image: "ghcr.io/me/hello-world"
```

Keys the Supervisor does not know are ignored without a warning, so check your spelling.

## Required keys

| Key | Type | Description |
| --- | --- | --- |
| `name` | string | The name of the app, shown in the app store and in the UI. |
| `version` | string | The version of the app. When you use `image`, this is also the tag the Supervisor pulls. Quote it, so YAML does not read `1.10` as a number. |
| `slug` | string | The ID of the app. Letters, digits, `-`, `_`, and `.` only. Must be unique in the repository. |
| `description` | string | A short description, shown in the app store. |
| `arch` | list | The CPU architectures the app supports: `aarch64` and `amd64`. The deprecated values `armhf`, `armv7`, and `i386` are still accepted, with a warning. |

## Information and behavior

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `url` | URL | | The homepage of the app, like the repository or a forum thread. Shown on the app page. |
| `machine` | list | all | The machine types the app runs on. See [machine](#machine). |
| `homeassistant` | string | | The minimum Home Assistant Core version the app needs, like `2026.10.0`. |
| `startup` | string | `application` | When the app starts at boot: `initialize`, `system`, `services`, `application`, or `once`. See [How apps work](/apps/how-apps-work/#starting). |
| `boot` | string | `auto` | `auto` starts the app at boot. `manual` turns **Start on boot** off by default. `manual_only` turns it off and does not let the user turn it on. |
| `stage` | string | `stable` | Where the app is in its life: `stable`, `experimental`, or `deprecated`. |
| `init` | bool | `true` | Run the container with Docker's default init process. Set to `false` when the image has its own init, which is the case for all Home Assistant base images (S6 overlay version 3 does not start otherwise). |
| `timeout` | integer | `10` | Seconds the Supervisor waits for the app to stop before it kills the container. Between 10 and 300. |
| `log_format` | string | `plain` | The format of the app's logs when a request to its [log endpoints](/apps/supervisor-api/#log-endpoints) does not ask for one: `plain` (the message only), `timestamp` (the time, then the message), or `verbose` (the time, host name, process, and message). Use `timestamp` when your app does not put a time in its own log lines. A request that asks for a format still gets that format. |
| `breaking_versions` | list | | Versions that need the user's attention. Automatic updates never install, or cross, one of these versions. |
| `environment` | mapping | | Extra environment variables for the container. |
| `legacy` | bool | `false` | For images without the Home Assistant labels: also passes the top-level options, if they are a string or a number, as environment variables. |
| `stdin` | bool | `false` | Keep the standard input of the container open, so Home Assistant can send data with the `hassio.app_stdin` action. |
| `tmpfs` | bool | `false` | Mount `/tmp` as tmpfs, a file system in memory. |

### machine

Without `machine`, the app is available on every machine. With it, the app is only available on the machine types you list. An entry with a `!` in front, like `!raspberrypi5-64`, explicitly excludes a machine type.

The accepted values are `generic-aarch64`, `generic-x86-64`, `green`, `intel-nuc`, `khadas-vim3`, `odroid-c2`, `odroid-c4`, `odroid-m1`, `odroid-n2`, `qemuarm-64`, `qemux86-64`, `raspberrypi3-64`, `raspberrypi4-64`, `raspberrypi5-64`, and `yellow`. The deprecated values `odroid-xu`, `qemuarm`, `qemux86`, `raspberrypi`, `raspberrypi2`, `raspberrypi3`, `raspberrypi4`, and `tinker` are still accepted, with a warning.

## Image

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `image` | string | | The image to pull, without a tag, like `ghcr.io/me/my-app`. The tag is always `version`. Without `image`, the Supervisor builds the app on the device. |

Use the name of a multi-architecture image. The placeholder `{arch}` is still supported for images that are published per architecture, like `ghcr.io/me/{arch}-my-app`. See [Publish your app](/apps/guides/publishing/).

## Options

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `options` | mapping | `{}` | The options of the app with their default values. |
| `schema` | mapping or `false` | `{}` | The type of every option, used to validate the user's input and to build the form in the UI. `false` turns off validation and the form. |

The types and rules are in [Add options](/apps/guides/options/#schema-types).

## Network

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `ports` | mapping | | Ports to expose on the host, as `"container-port/protocol": host-port`, like `8080/tcp: 8080`. The protocol is `tcp` or `udp`. A host port of `null` (or no value) means the port is off by default; the user can turn it on. |
| `ports_description` | mapping | | A description per port, with the same keys as `ports`. Prefer [translations](/apps/guides/presentation/#translations). |
| `host_network` | bool | `false` | Run the app on the network of the host, instead of the internal network. |
| `webui` | string | | The URL of the web interface, for the **Open Web UI** button. See [URL templates](#url-templates). |
| `watchdog` | string | | A URL the watchdog checks to see if the app is healthy. See [URL templates](#url-templates). |

### URL templates

`webui` and `watchdog` use placeholders, which the Supervisor fills in:

- `[HOST]`: the host. For **Open Web UI**, that is the address the user reaches Home Assistant on; the watchdog uses the IP address of the app.
- `[PORT:8080]`: for **Open Web UI**, the port on the host that container port 8080 is mapped to. The watchdog connects to the IP address of the app, so it uses container port 8080 itself, unless the app runs on the host network.
- `[PROTO:option]`: `https` if the option called `option` is `true`, `http` otherwise.

```yaml
webui: "[PROTO:ssl]://[HOST]:[PORT:8080]/dashboard"
watchdog: "http://[HOST]:[PORT:8080]/health"
```

The format of `webui` is `http`, `https`, or `[PROTO:option]`, then `://[HOST]:[PORT:number]`, then an optional path. `watchdog` accepts the same, and also `tcp://[HOST]:[PORT:number]` to check only that the port accepts connections. In `watchdog`, the port may also be a plain number. An HTTP watchdog counts any response below 300 as healthy.

## Ingress

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `ingress` | bool | `false` | Show the web interface of the app inside Home Assistant. See [Add a web interface with ingress](/apps/guides/ingress/). |
| `ingress_port` | integer | `8099` | The port your web server listens on inside the container. `0` lets the Supervisor pick a free port between 62000 and 65500, which your app reads from the API. Mostly for apps on the host network. |
| `ingress_entry` | string | | The path the ingress URL starts at, if not `/`. |
| `ingress_stream` | bool | `false` | Stream request bodies to the app, instead of reading them into memory first. Needed for large uploads. |
| `panel_icon` | string | `mdi:puzzle` | The icon of the app in the sidebar, from [Material Design Icons](https://pictogrammers.com/library/mdi/). |
| `panel_title` | string | the app name | The title of the app in the sidebar. |
| `panel_admin` | bool | `true` | Only show the app in the sidebar of administrators. |

An app with `ingress_port: 0` must not expose any port between 62000 and 65500 in `ports`; the Supervisor rejects that configuration.

## Folders

`map` lists the folders of the host to mount in the container. Each entry has a `type`, and optionally `read_only` (default `true`) and `path` (the mount point in the container).

```yaml
map:
  - type: share
    read_only: false
  - type: ssl
  - type: media
    path: /mnt/media
```

| Type | Mounted at | Contents |
| --- | --- | --- |
| `homeassistant_config` | `/homeassistant` | The configuration folder of Home Assistant |
| `app_config` | `/config` | The public configuration folder of this app. See [Configuration files for users](/apps/guides/options/#configuration-files-for-users) |
| `all_app_configs` | `/app_configs` | The public configuration folders of all apps |
| `local_apps` | `/local_apps` | The local apps folder |
| `ssl` | `/ssl` | Certificates |
| `share` | `/share` | Files shared between Home Assistant and apps |
| `media` | `/media` | Media files |
| `backup` | `/backup` | Backups |
| `data` | `/data` | The private data of this app. Always mounted read and write; only use this type to change `path` |

If you set `path`, it must not be empty, not `/`, and not the same as the path of another entry.

Older names are still accepted, with a warning: `addons` for `local_apps` (mounted at `/addons`), `all_addon_configs` for `all_app_configs` (mounted at `/addon_configs`), and `addon_config` for `app_config`. The old `config` type mounts the Home Assistant configuration at `/config`; use `homeassistant_config` instead. The old short form, like `share:rw`, still works too.

## Hardware

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `devices` | list | | Device paths to map into the container, like `/dev/ttyAMA0`. |
| `uart` | bool | `false` | Map all serial devices into the container. |
| `usb` | bool | `false` | Map the raw USB devices (`/dev/bus/usb`) into the container, with hotplug support. |
| `gpio` | bool | `false` | Map `/sys/class/gpio` into the container, on systems that support it. |
| `udev` | bool | `false` | Mount the udev database of the host (`/run/udev`), read-only. |
| `devicetree` | bool | `false` | Mount the device tree of the host at `/device-tree`. |
| `video` | bool | `false` | Give access to all video devices. |
| `audio` | bool | `false` | Connect the app to the audio system of Home Assistant, through PulseAudio. |
| `kernel_modules` | bool | `false` | Mount the kernel modules of the host (`/lib/modules`), read-only, and add the `SYS_MODULE` capability. |
| `full_access` | bool | `false` | Give full access to all hardware. Only works with protection mode off. Do not combine it with `devices`, `uart`, `usb`, or `gpio`; those are ignored. |

More on each of these in [Access hardware and the host](/apps/guides/hardware/).

## Host and privileges

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `privileged` | list | | Linux capabilities to add. See [privileged](#privileged). |
| `apparmor` | bool | `true` | Run the app with AppArmor. With an `apparmor.txt` in the app folder, the Supervisor uses that profile; otherwise the default profile of Docker. |
| `host_dbus` | bool | `false` | Mount the D-Bus system bus of the host (`/run/dbus`), read-only. |
| `host_pid` | bool | `false` | Use the PID namespace of the host. Only works with protection mode off. Does not work with S6 overlay. |
| `host_uts` | bool | `false` | Use the UTS namespace (the hostname) of the host. |
| `host_ipc` | bool | `false` | When `false`, the app gets its own private `/dev/shm` in memory. Set it to `true` to leave `/dev/shm` to the container defaults. |
| `realtime` | bool | `false` | Allow real-time scheduling: adds `SYS_NICE`, real-time priority limits, and a real-time CPU budget where the system supports it. |
| `journald` | bool | `false` | Mount the system journal of the host, read-only, at `/var/log/journal` and `/run/log/journal`. Check which one has content, as that differs per system. |
| `ulimits` | mapping | | Resource limits for the container. See [ulimits](#ulimits). |

### privileged

The capabilities you can add are `AUDIT_WRITE`, `BPF`, `CHECKPOINT_RESTORE`, `DAC_READ_SEARCH`, `IPC_LOCK`, `MKNOD`, `NET_ADMIN`, `NET_RAW`, `PERFMON`, `SETFCAP`, `SYS_ADMIN`, `SYS_MODULE`, `SYS_NICE`, `SYS_PTRACE`, `SYS_RAWIO`, `SYS_RESOURCE`, and `SYS_TIME`. Ask only for what your app needs: many of them lower the [security rating](/apps/reference/security-rating/).

`AUDIT_WRITE`, `MKNOD`, `NET_RAW`, and `SETFCAP` are part of the default set of Docker today. The Supervisor is moving to a smaller default set without them, behind two feature flags that are off by default: `app_drop_net_raw` drops `NET_RAW`, and `app_reduced_capabilities` drops the other three. If your app needs one of them, list it in `privileged` now; a capability you ask for is never dropped.

### ulimits

Each limit is a number, or a mapping with `soft` and `hard`:

```yaml
ulimits:
  nofile:
    soft: 65535
    hard: 65535
  nproc: 4096
```

A value can not be higher than the hard limit of the host. On Home Assistant OS, the hard limit of `nofile` is 524288; `ulimit -Ha` on the host shows all of them.

## API access

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `homeassistant_api` | bool | `false` | Access to the Home Assistant Core API, through the proxy at `http://supervisor/core/api`. |
| `hassio_api` | bool | `false` | Access to the Supervisor API beyond the basics, limited by `hassio_role`. |
| `hassio_role` | string | `default` | The role of the app in the Supervisor API: `default`, `homeassistant`, `backup`, `manager`, or `admin`. See [API roles](/apps/guides/security/#api-roles). |
| `auth_api` | bool | `false` | Access to the authentication API, to check user names and passwords against Home Assistant. |
| `docker_api` | bool | `false` | Mount the Docker socket, read-only. Only works with protection mode off. |

More in [Talk to Home Assistant and the Supervisor](/apps/guides/communication/).

## Services and discovery

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `services` | list | | Services the app provides or uses, as `service:role`. The services are `mqtt` and `mysql`, the roles are `provide`, `want`, and `need`. |
| `discovery` | list | | The integrations the app can send discovery messages for, by domain, like `adguard`. |

See [Share services and discover integrations](/apps/guides/services-discovery/).

## Backups

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `backup` | string | `hot` | `hot` backs up the app while it runs. `cold` stops it during the backup. |
| `backup_pre` | string | | A command to run in the container before a hot backup. |
| `backup_post` | string | | A command to run in the container after a hot backup. |
| `backup_exclude` | list | | Glob patterns of files to leave out of backups, like `*.log` or `cache/*`. |

With `backup: cold`, `backup_pre` and `backup_post` are ignored.

## Deprecated keys

The Supervisor still reads a few old keys and converts or ignores them, with a warning:

- `advanced` is ignored.
- `codenotary` is ignored.
- `snapshot`, `snapshot_pre`, `snapshot_post`, and `snapshot_exclude` are read as their `backup` counterparts.
- `auto_uart` is read as `uart`.
- `startup: before` and `startup: after` are read as `services` and `application`.
- `devices` entries in the old `host:container:permissions` format are reduced to the host path.

A separate `build.yaml` (or `build.json`) is deprecated as well. See [Build the container image](/apps/guides/dockerfile/#buildyaml).

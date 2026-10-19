---
title: Instance discovery
description: How Home Assistant announces itself on the local network with Zeroconf, so apps can find it without asking for an address.
sidebarGroup: APIs
order: 32
---

Home Assistant announces itself on the local network as the mDNS (Zeroconf) service `_home-assistant._tcp.local.`. Apps, like the companion apps, browse for that service to find instances without asking the user to type an address.

The `zeroconf` integration, part of the default configuration, publishes the record once the `frontend` integration is set up, or when Home Assistant has started. By then the HTTP server is up, so the address in the record works.

## The service record

| Field | Value |
| --- | --- |
| Service type | `_home-assistant._tcp.local.` |
| Instance name | `<location_name>._home-assistant._tcp.local.`. Dots in the location name are replaced with spaces, and the name is cut to fit the 63 byte limit of a DNS label. If the name is taken, Zeroconf adds a suffix. |
| Host | `<uuid>.local.`, where `<uuid>` is the instance ID. |
| Port | The port of the HTTP server: 8123 by default, or 80 when Home Assistant runs with the Supervisor, like on Home Assistant OS. The `SETUP_PORT` environment variable overrides that default. |

## TXT properties

| Property | Meaning |
| --- | --- |
| `location_name` | The name of the instance, from `hass.config.location_name`, or `Home` if none is set. It is the same cleaned up name as in the instance name: dots replaced with spaces, and cut to fit 63 bytes. |
| `uuid` | The instance ID: a stable, opaque identifier of 32 hexadecimal characters, created on the first run. Use it to recognize an instance you have seen before, even when its address changes. |
| `version` | The version of Home Assistant Core. |
| `internal_url` | The URL for the local network, if Home Assistant knows one. Otherwise empty. |
| `external_url` | The URL for outside the network, if Home Assistant knows one. Otherwise empty. |
| `base_url` | Deprecated, kept for older clients. The external URL, or the internal URL if there is no external one. |

A TXT value may be at most 230 bytes. Home Assistant replaces a longer value with an empty string, so one long URL does not break the whole announcement.

## Before core is installed

During the first setup of Home Assistant OS, the [landing page](https://github.com/home-assistant/landingpage) runs instead of core, and announces the same service type. Its record has a `landingpage` property set to `True`, and a `version` of `0000.0.0`, which is not a real version. A running core never sets `landingpage`. Treat a missing or placeholder `version` as unknown.

Older records may also carry `requires_api_password`. It refers to an authentication method that was removed in Home Assistant 2024.7, and core no longer sends it. Ignore it.

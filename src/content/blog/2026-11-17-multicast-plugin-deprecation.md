---
title: "The multicast plugin is being deprecated"
description: The Supervisor is phasing out the multicast plugin. This post outlines the change, affected apps, and how it can be tested.
date: 2026-11-17
authors:
  - Stefan Agner
areas:
  - apps
---

Every Supervisor installation runs a multicast plugin: a container named `hassio_multicast` that copies IPv4 mDNS packets received on the LAN onto the internal `hassio` network that apps (formerly known as add-ons) are attached to. The Supervisor is phasing it out. Supervisor 2026.10.0 added an option to disable it, Supervisor 2026.12 no longer installs it on new installations, and a later release removes it.

Resolving `.local` hostnames is not affected. Apps on the internal network resolve names through the DNS plugin, where CoreDNS forwards `.local` queries to systemd-resolved on the host, which performs the mDNS lookup. This works through regular DNS, with or without the multicast plugin.

If you develop or maintain an app, this is what we ask of you: if your app runs on the internal network without `host_network: true` and listens for mDNS traffic itself, for example to browse for services or discover devices, test it with the plugin disabled. Apps with `host_network: true` and apps that only resolve hostnames need no change.

## How to test your app today

Supervisor 2026.10.0 and newer has an `enabled` option for the plugin, on by default. Turn it off with the `ha` CLI:

```shell
ha multicast options --enabled=false
```

Disabling stops and removes the container and its image. The plugin is no longer started, updated, or repaired, and `ha multicast info` reports `enabled: false`. Then exercise the discovery features of your app. To go back:

```shell
ha multicast options --enabled
```

Enabling pulls the current plugin image and starts the container again.

The same option is available on the Supervisor API as `POST /multicast/options` with `{"enabled": false}`, and `GET /multicast/info` includes the `enabled` field.

## What to do

If your app only resolves `.local` hostnames, no change is necessary.

If your app discovers devices through mDNS, SSDP, or another multicast protocol, or announces a service on the LAN, it has to be on the physical network. Set `host_network: true` in the app configuration:

```yaml
host_network: true
```

If testing shows that your app depends on the plugin and `host_network: true` is not an option, let us know in the [architecture discussion](https://github.com/home-assistant/architecture/discussions/1457).

## Background

The plugin was introduced in 2020 as a general solution for multicast on the internal network. It runs `mdns-repeater` between the host interfaces and the `hassio` bridge, with mDNS reflection as the first step and other multicast protocols as the intended broader scope.

The scope was narrowed over time. Repeating in both directions could loop with mDNS repeaters on routers, and it rebroadcast announcements carrying internal addresses that are not reachable from the LAN. Since February 2022 the plugin is therefore one-way: IPv4 mDNS received on the host is copied onto the `hassio` bridge, and packets from apps are not repeated to the LAN. IPv6, SSDP, and other multicast traffic are not handled. Covering protocols such as Homematic IP through multicast routing turned out not to be possible, since link-local multicast is not routed by the Linux kernel. Those protocols need the app to be present on the physical network, which is what `host_network: true` provides.

The remaining LAN-to-bridge copy has one side effect: apps on the host network that listen on all interfaces receive each LAN mDNS frame twice, once on the physical interface and once on `hassio`. Most software handles this without issue, but for the setups where it does not, there was no supported way to turn the plugin off before Supervisor 2026.10.0.

### Who uses it

None of the system components obtain mDNS through the plugin. Home Assistant Core runs on the host network with its own zeroconf implementation. Name resolution goes through the DNS plugin as described above, and announcing `homeassistant.local` on the LAN is done by systemd-resolved.

The same holds for the apps we looked at. Per opt-in analytics, every app in the top 30 with an mDNS or multicast role, such as Matter Server, ESPHome Device Builder, Samba, OpenThread Border Router, Spotify Connect, and AirCast, runs with `host_network: true` and does not go through the plugin. A scan of about 1,300 community app repositories found one design built around the plugin, a CUPS app advertising AirPrint from the bridge to the LAN. That relies on the direction that is no longer repeated since 2022.

Plugin usage cannot be measured directly, because copying packets leaves no trace in analytics. The rollout below is phased for that reason: if an app or setup depends on LAN-to-bridge mDNS reflection, the first steps are meant to surface it while the plugin can still be re-enabled.

## Looking ahead

`host_network: true` gives an app access to all host interfaces and ports, which is more than most apps with a discovery role need. Two proposals aim to provide the capabilities the multicast plugin was originally meant to cover in a more targeted way. Neither is a prerequisite for this deprecation.

- Isolated physical network access ([architecture#1034](https://github.com/home-assistant/architecture/discussions/1034), [home-assistant/supervisor#6937](https://github.com/home-assistant/supervisor/pull/6937)) gives an app its own address on the LAN with multicast in both directions, IPv6 included, without sharing the network namespace of the host. The app stays attached to the internal `hassio` network. This covers device discovery through mDNS, SSDP, and other multicast protocols.
- A Supervisor API for service announcements ([architecture#1458](https://github.com/home-assistant/architecture/discussions/1458)) publishes an app's services through the DNS-SD registration of systemd-resolved. An app on the internal network could then be discoverable on the LAN without `host_network` or `host_dbus`.

## Rollout

1. Supervisor 2026.10.0 added the `enabled` option, on by default ([home-assistant/supervisor#7219](https://github.com/home-assistant/supervisor/pull/7219)). `ha` 5.6.0 added `ha multicast options` ([home-assistant/cli#686](https://github.com/home-assistant/cli/pull/686)).
2. Supervisor 2026.12 no longer installs the plugin on new installations. Existing installations keep their current state.
3. Supervisor 2027.02 disables the plugin on all installations. The option remains available, so the plugin can be re-enabled if a setup turns out to depend on it.
4. A later release removes the plugin: the code, the `ha multicast` commands, the log viewer entry in the frontend, and the image from the Home Assistant OS build.

If you run into problems or have concerns with the change, let us know in the [architecture discussion](https://github.com/home-assistant/architecture/discussions/1457) or open an issue on the [Supervisor repository](https://github.com/home-assistant/supervisor/issues).

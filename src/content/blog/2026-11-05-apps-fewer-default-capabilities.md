---
title: "Apps will lose four default Linux capabilities"
description: The Supervisor is moving to a smaller default capability set for app containers. This post outlines the change, affected apps, and how it can be tested.
date: 2026-11-05
authors:
  - Stefan Agner
areas:
  - apps
---

Every app container today gets the full default capability set of Docker, no matter what its manifest declares. The Supervisor is moving to a smaller set: `NET_RAW`, `MKNOD`, `AUDIT_WRITE` and `SETFCAP` will no longer be granted implicitly. Capabilities listed in `privileged` are never dropped.

If you develop or maintain an app, this is what we ask of you: check whether your app opens raw or packet sockets, or otherwise depends on one of these capabilities, and if so add it to `privileged` now. Plain `ping` is not affected. The change is already in Supervisor 2026.09.3 behind feature flags, so you can test your app today. Supervisor 2026.12 turns the new defaults on for new installations, and later on they apply to all installations.

## Why

Docker's default capability set dates back to a time when containers were meant to run arbitrary software and be as compatible as possible. Several of the defaults are never needed by a well-behaved service, and some carry real risk. `NET_RAW` is the most prominent one: it allows raw and packet sockets, which a compromised app could use to interfere with traffic on its network. Kubernetes' restricted profile has dropped these four for years, and containerd is adding a [reduced capability profile](https://github.com/containerd/containerd/pull/12588) that removes exactly the same four. Dropping them also makes `privileged` a more accurate description of an app's additional privileges.

## What changes

| Capability | What it allows | Who needs it |
| --- | --- | --- |
| `NET_RAW` | Raw and packet sockets (`SOCK_RAW`, `AF_PACKET`), binding to any address | Packet capture, port scanners, DHCP servers, ARP tools, raw Bluetooth HCI |
| `MKNOD` | Creating device nodes with `mknod` | Nothing in an app: the Supervisor bind-mounts the device nodes an app declares |
| `AUDIT_WRITE` | Writing records to the kernel audit log | `sshd` and PAM built with libaudit |
| `SETFCAP` | Setting file capabilities on executables | Package installs that run `setcap` in their post-install step |

Most apps do nothing in the last column. If yours does not either, it is very likely that no change is necessary: of the roughly 90 apps in the core and community stores, a handful need `NET_RAW` and none needs the other three.

The Supervisor adds these capabilities to the container's `CapDrop`, unless the app lists them in `privileged`. This applies to all apps, including those with `full_access: true`: the Supervisor never runs an app in Docker's privileged mode, and `full_access` only widens device access.

## Ping keeps working

The most common worry about dropping `NET_RAW` is `ping`, since ICMP echo classically needs a raw socket. It does not break. Linux has had ICMP datagram sockets since kernel 3.0 (IPv6 since 3.11), which work without `NET_RAW` as long as the process's group is within the `net.ipv4.ping_group_range` sysctl. That sysctl is per network namespace and already allows all groups on every supported installation:

- For apps with their own network namespace, the Docker daemon sets it to `0 2147483647` when it creates the container ([since Docker 20.10](https://github.com/moby/moby/pull/41030), independent of the capability set).
- For apps with `host_network: true`, the host's value applies. systemd sets the same value by default through its `50-default.conf` sysctl drop-in, which Home Assistant OS ships:

  ```shell
  $ cat /proc/sys/net/ipv4/ping_group_range
  0       2147483647
  ```

We verified that busybox `ping` on the Alpine base and `iputils-ping` on the Debian base both work for IPv4 and IPv6 with `NET_RAW` dropped. That covers the ping monitor of Uptime Kuma, the ping node of Node-RED, and anything else that shells out to `ping`. An app that brings its own ICMP implementation, in a library or in its own code, needs to be tested: some use datagram sockets, some require raw sockets.

Tools that use raw or packet sockets may break, including `nmap` (as root it assumes raw sockets and quits unless run with `--unprivileged`), `tcpdump`, `mtr`, `arping`, `fping`, `traceroute` in ICMP mode, and DHCP servers. One more trap: a file capability like `cap_net_raw+ep` on a binary cannot grant what is missing from the container's bounding set, and with the effective bit set the kernel refuses to execute the binary at all. Some upstream images do this to `ping`. Check your image with `getcap -r /` and remove such file capabilities, or request the capability.

## What we found in the existing apps

We went through the core and community app stores before adding the flags. Apps that need `NET_RAW` either already declared it or are being updated to: OpenThread Border Router and Matter Server (Bluetooth commissioning through raw HCI sockets) in the core store, and AdGuard Home (its DHCP server uses packet sockets), Tailscale, Advanced SSH & Web Terminal and Studio Code Server (network tools such as `nmap`) in the community store. VPN apps such as WireGuard and ZeroTier only need `NET_ADMIN` and the `/dev/net/tun` device and work with all four dropped.

The other three capabilities have no consumer among the apps today. No app script calls `mknod`, no app runs an `sshd` built with libaudit, and `setcap` only shows up in post-install steps of packages such as `fping` or `mtr-tiny` installed at run time. Both `apt` and `apk` log a warning in that case and complete the install. This can show up in apps with a user-configurable package list, such as Advanced SSH & Web Terminal, Studio Code Server, JupyterLab and AppDaemon.

## What to do

If your app opens raw or packet sockets, add `NET_RAW` to `privileged`:

```yaml
privileged:
  - NET_RAW
```

`NET_RAW` lowers the [security rating](/apps/reference/security-rating/) by one point, like `NET_ADMIN` does, and only once for any number of such capabilities. `AUDIT_WRITE`, `MKNOD` and `SETFCAP` can be listed as well and do not change the rating; the [configuration reference](/apps/reference/configuration/) lists all accepted values. Do not ask for a capability because something merely logs a warning, such as a failed `setcap` during a package install.

## How to test your app today

Supervisor 2026.09.3 and newer has the change behind two feature flags, off by default: `app_drop_net_raw` drops `NET_RAW`, and `app_reduced_capabilities` drops the other three. Turn on both with the `ha` CLI (5.1.0 or newer):

```shell
ha supervisor options \
  --feature-flag app_drop_net_raw=true \
  --feature-flag app_reduced_capabilities=true
```

Capabilities are fixed when a container is created. Restart the apps you want to test, which recreates their containers, then exercise their network features and watch the app log for `Operation not permitted` errors from tools or libraries that open sockets. Such an error is a starting point, not proof: confirm which capability the operation needs before adding it to the manifest. Inside the container, `grep CapBnd /proc/self/status` shows the bounding set of your own process: with both flags on and nothing requested it is `00000000000405fb`, down from the Docker default `00000000a80425fb`. To go back, set the flags to `false` and restart the apps. `ha supervisor info` shows the current state of all flags.

### Finding out which capabilities an app actually uses

If your app ships an `apparmor.txt`, AppArmor can report which of these capabilities the app exercises before anything breaks. Do this with both flags off, since a dropped capability fails before AppArmor sees it. Add audit rules to the profile:

```text
audit capability net_raw,
audit capability mknod,
audit capability audit_write,
audit capability setfcap,
```

The Supervisor loads the profile when an app is installed or updated, so bump the version and update the app, or reinstall it. Each capability check that passes is then logged to the host journal (`ha host logs`, or `journalctl -k` on the host):

```text
audit: type=1400 audit(...): apparmor="AUDIT" operation="capable"
  profile="my_app" pid=1234 comm="tcpdump" capability=13 capname="net_raw"
```

Read the result with the process name in mind. Tools that try a raw socket first and fall back, like `ping`, show up as using `NET_RAW` even though they work without it. The reverse holds too: the kernel skips auditing for some checks and rate-limits messages, so a missing line does not prove a capability is unused.

## Rollout

1. Supervisor 2026.09.3 added the two feature flags, off by default ([home-assistant/supervisor#7230](https://github.com/home-assistant/supervisor/pull/7230) and [home-assistant/supervisor#7233](https://github.com/home-assistant/supervisor/pull/7233)). `NET_RAW` has its own flag because it has a security implication of its own and known fallout in apps. The same release made `AUDIT_WRITE`, `MKNOD` and `SETFCAP` accepted values in `privileged`.
2. Supervisor 2026.12 turns both flags on by default for new installations ([home-assistant/supervisor#7402](https://github.com/home-assistant/supervisor/pull/7402)). Existing installations keep their current behavior unless the flags are set. Restoring a backup does not carry feature flags over, so an app restored onto a new installation runs with the new defaults.
3. No later than Supervisor 2027.05, the reduced capability set becomes the default for all installations. We may bring this step forward; if so, it is announced in the Supervisor release notes. The flags remain available for a while after the switch, so that a regression in an app can be confirmed by turning the old behavior back on, and will be removed in a later release.

If you run into problems or have concerns with the change, let us know in the [Home Assistant Discord](https://www.home-assistant.io/join-chat/) or open an issue on the [Supervisor repository](https://github.com/home-assistant/supervisor/issues).

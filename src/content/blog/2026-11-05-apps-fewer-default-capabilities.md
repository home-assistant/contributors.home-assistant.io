---
title: "Apps will lose four default Linux capabilities"
description: The Supervisor is moving to a smaller default capability set for app containers. This post outlines the change, affected apps, and how it can be tested.
date: 2026-11-05
authors:
  - Stefan Agner
areas:
  - apps
---

Every app container today gets the full default capability set of Docker, no matter what its manifest declares. The Supervisor is moving to a smaller set. Four capabilities that Docker grants by default will no longer be granted implicitly: `NET_RAW`, `MKNOD`, `AUDIT_WRITE` and `SETFCAP`. If your app needs one of them, list it in `privileged`. Capabilities listed there are never dropped.

If you develop or maintain an app, this is what we ask of you: check whether your app opens raw or packet sockets, or otherwise depends on one of these capabilities, and if so add it to `privileged` now. Plain `ping` is not affected. The change is already in Supervisor 2026.09.3 behind feature flags, so you can test your app today. Supervisor 2026.12 turns the new defaults on for new installations, and later on they apply to all installations. Details on all of that below.

## Why

Docker's default capability set dates back to a time when containers were meant to run arbitrary software and be as compatible as possible. Several of the defaults are never needed by a well-behaved service, and some carry real risk. `NET_RAW` is the most prominent one: it allows raw and packet sockets, which a compromised app could use to interfere with traffic on its network. Kubernetes' restricted profile has dropped these four for years, and containerd is adding a [reduced capability profile](https://github.com/containerd/containerd/pull/12588) that removes exactly the same four.

Apps already declare which extra capabilities they need in `privileged`. Dropping these implicit capabilities makes the manifest a more accurate description of an app's additional privileges: an app that needs one of them now has to say so.

## What changes

| Capability | What it allows | Who needs it |
| --- | --- | --- |
| `NET_RAW` | Raw and packet sockets (`SOCK_RAW`, `AF_PACKET`), binding to any address | Packet capture, port scanners, DHCP servers, ARP tools, raw Bluetooth HCI |
| `MKNOD` | Creating device nodes with `mknod` | Nothing in an app: the Supervisor bind-mounts the device nodes an app declares |
| `AUDIT_WRITE` | Writing records to the kernel audit log | `sshd` and PAM built with libaudit |
| `SETFCAP` | Setting file capabilities on executables | Package installs that run `setcap` in their post-install step |

The Supervisor adds these capabilities to the container's `CapDrop`, unless the app lists them in `privileged`. Capabilities listed there are never dropped. This applies to all apps, including those with `full_access: true`: the Supervisor never runs an app in Docker's privileged mode, and `full_access` only widens device access.

## Ping keeps working

The most common worry about dropping `NET_RAW` is `ping`, since ICMP echo classically needs a raw socket. It does not break, and it is worth understanding why, because the reason has nothing to do with capabilities.

Linux has had ICMP datagram sockets since kernel 3.0 (IPv6 since 3.11). They send and receive echo requests without `NET_RAW`, as long as the process's group is within the `net.ipv4.ping_group_range` sysctl. That sysctl is per network namespace, and on every supported Home Assistant installation it already allows all groups:

- For apps with their own network namespace, the Docker daemon sets `net.ipv4.ping_group_range` to `0 2147483647` when it creates the container. This has been the default [since Docker 20.10](https://github.com/moby/moby/pull/41030) and is independent of the capability set.
- For apps with `host_network: true`, the host's value applies. systemd ships the same setting in its `50-default.conf` sysctl drop-in. Home Assistant OS runs systemd, and Supervised installations run on Debian with systemd, so both have it:

  ```shell
  $ cat /proc/sys/net/ipv4/ping_group_range
  0       2147483647
  ```

The `ping` implementations in our base images use the fallback. We verified that busybox `ping` on the Alpine base and `iputils-ping` on the Debian base both work for IPv4 and IPv6 with `NET_RAW` dropped. That covers the ping monitor of Uptime Kuma, the ping node of Node-RED, and anything else that shells out to `ping`. An app that brings its own ICMP implementation, in a library or in its own code, needs to be tested: some use datagram sockets, some require raw sockets.

Network tools that use raw or packet sockets may break, including `nmap` (as root it assumes raw sockets are available and quits when they are not, unless run with `--unprivileged`), `tcpdump`, `mtr`, `arping`, `arp-scan`, `fping`, `traceroute` in ICMP mode, DHCP servers, and libraries such as Python's `ping3` or Go ping libraries in privileged mode. Behavior depends on the tool, its options, and whether it can fall back to unprivileged sockets. A file capability like `cap_net_raw+ep` on a binary makes things worse rather than better: file capabilities cannot grant what is missing from the container's bounding set, and with the effective bit set the kernel refuses to execute the binary at all, with `Operation not permitted` before it opens any socket. Some upstream images do this to `ping`. Check your image with `getcap -r /` and remove such file capabilities, or request the capability.

## What we found in the existing apps

We went through the core and community app stores before adding the flags.

Apps that need `NET_RAW` either already declared it or are being updated to: OpenThread Border Router and Matter Server (Bluetooth commissioning through raw HCI sockets) in the core store, and AdGuard Home (its DHCP server uses packet sockets), Tailscale, Advanced SSH & Web Terminal (`nmap`, `tcpdump`, `mtr`) and Studio Code Server (`nmap`) in the community store. VPN apps such as WireGuard and ZeroTier only need `NET_ADMIN` and the `/dev/net/tun` device; both were tested with all four capabilities dropped and work.

None of the other three capabilities has a consumer among the apps today:

- `MKNOD`: no app script calls `mknod`. Device nodes an app declares under `devices` are bind-mounted by the Supervisor.
- `AUDIT_WRITE`: the Alpine `openssh` build has no libaudit or PAM, and no Debian-based app runs `sshd`. Debian's `useradd`, `chpasswd` and `su` link libaudit but keep working when the audit message cannot be sent.
- `SETFCAP`: only affects packages installed at run time whose post-install step runs `setcap`, such as `fping` or `mtr-tiny` on Debian. Debian's maintainer scripts fall back to setuid with a warning, and `apk` logs a failed xattr write. Neither fails the install. This can show up in apps with a user-configurable package list, such as Advanced SSH & Web Terminal, Studio Code Server, JupyterLab and AppDaemon.

## What to do

If your app opens raw or packet sockets, add `NET_RAW` to `privileged`:

```yaml
privileged:
  - NET_RAW
```

`NET_RAW` has been an accepted value since Supervisor 2023.04, so you can add it today without worrying about older installations. It lowers the [security rating](/apps/reference/security-rating/) by one point, like `NET_ADMIN` does, and only once for any number of such capabilities.

`AUDIT_WRITE`, `MKNOD` and `SETFCAP` are accepted in `privileged` since Supervisor 2026.09.3. They do not change the security rating. An older Supervisor rejects a manifest that lists them, so only add one if your app really needs it, and in that case require Supervisor 2026.09.3 or newer. The [configuration reference](/apps/reference/configuration/) lists all accepted capabilities.

Do not ask for a capability because something merely logs a warning. A failed `setcap` during a package install or an audit message that could not be sent are harmless.

## How to test your app today

Supervisor 2026.09.3 and newer has the change behind two feature flags, off by default: `app_drop_net_raw` drops `NET_RAW`, and `app_reduced_capabilities` drops the other three. Turn on both with the `ha` CLI (5.1.0 or newer):

```shell
ha supervisor options \
  --feature-flag app_drop_net_raw=true \
  --feature-flag app_reduced_capabilities=true
```

Capabilities are fixed when a container is created. Restarting an app through the Supervisor recreates its container, so restart the apps you want to test, then exercise their network features.

When testing, watch the app log for `Operation not permitted` errors from tools or libraries that open sockets, such as `ping: socket: Operation not permitted` or nmap's `Couldn't open a raw socket`. Such an error is a starting point, not proof: confirm which capability the operation needs before adding it to the manifest. Inside the container you can confirm what is left in the bounding set of your own process (do not read PID 1, which is the host's init for apps with `host_pid: true`); `NET_RAW` is bit 13, `MKNOD` bit 27, `AUDIT_WRITE` bit 29, and `SETFCAP` bit 31:

```shell
grep CapBnd /proc/self/status
```

With both flags on and nothing requested, the value is `00000000000405fb`, down from the Docker default `00000000a80425fb`. To go back, set the flags to `false` and restart the apps. `ha supervisor info` shows the current state of all flags.

### Finding out which capabilities an app actually uses

Testing with the flags shows what breaks. If you want to know what an app exercises before anything breaks, AppArmor can tell you. Do this with both flags off: a dropped capability fails the kernel's own check before AppArmor sees it, so nothing is logged. If your app ships an `apparmor.txt`, add audit rules for the four capabilities to its profile:

```text
audit capability net_raw,
audit capability mknod,
audit capability audit_write,
audit capability setfcap,
```

The Supervisor loads the profile when an app is installed or updated, not when it is restarted, so bump the version and update the app, or uninstall and reinstall it. When a process in the app then passes one of these capability checks, the kernel logs a line to the host journal (`ha host logs`, or `journalctl -k` on the host) that names the app's profile, the process and the capability:

```text
audit: type=1400 audit(...): apparmor="AUDIT" operation="capable"
  profile="my_app" pid=1234 comm="tcpdump" capability=13 capname="net_raw"
```

Read the result with the process name in mind. Tools that try a raw socket first and fall back to an unprivileged one, like `ping`, show up as using `NET_RAW` even though they work fine without it. A capability check at socket creation is also not the same as a capability the app needs; it tells you where to look. The reverse holds too: the kernel skips auditing for some checks and rate-limits audit messages, so a missing line does not prove a capability is unused. Apps without a profile of their own run under Docker's default profile, which cannot be changed per app, so this only works for apps that ship an `apparmor.txt`.

## Rollout

The change lands in three steps:

1. Supervisor 2026.09.3 added the two feature flags, off by default. `NET_RAW` has its own flag because it has a security implication of its own and known fallout in apps; the other three were added as a group, following the reduced profile of containerd. See [home-assistant/supervisor#7230](https://github.com/home-assistant/supervisor/pull/7230) and [home-assistant/supervisor#7233](https://github.com/home-assistant/supervisor/pull/7233) for the implementation. The same release made `AUDIT_WRITE`, `MKNOD` and `SETFCAP` accepted values in `privileged`.
2. Supervisor 2026.12 turns both flags on by default for new installations ([home-assistant/supervisor#7402](https://github.com/home-assistant/supervisor/pull/7402)). Existing installations keep their current behavior unless the flags are set. Restoring a backup does not carry feature flags over, so an app restored onto a new installation runs with the new defaults.
3. No later than Supervisor 2027.05, the reduced capability set becomes the default for all installations. We may bring this step forward; if so, it is announced in the Supervisor release notes. The flags remain available for a while after the switch, so that a regression in an app can be confirmed by turning the old behavior back on, and will be removed in a later release.

Do not plan around the last date. If your app needs one of these capabilities, add it to `privileged` now. If you run into problems or have concerns with the change, let us know in the [Home Assistant Discord](https://www.home-assistant.io/join-chat/) or open an issue on the [Supervisor repository](https://github.com/home-assistant/supervisor/issues).

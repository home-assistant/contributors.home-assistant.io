---
title: Debug the host
description: Get a root shell on Home Assistant OS over SSH or a console, and find the logs you need.
sidebarLabel: Debug the host
sidebarGroup: Guides
order: 5
---

To debug the operating system, you need a shell on the host itself, not inside a container. This page shows the ways in, and where to look once you are there.

> [!IMPORTANT]
> This is for developers. Users who want a terminal should use the **Terminal & SSH** app instead. That app runs in a container with limited rights. What is on this page gives you full root access to the host, and nobody can support a system that was changed this way.

## SSH on port 22222

Home Assistant OS has an SSH server for developers, [Dropbear](https://matt.ucc.asn.au/dropbear/dropbear.html), on port 22222. It is separate from any SSH app, and only runs when root has at least one authorized key. There is no password login.

### Add your key

1. If you don't have an SSH key yet, create one with `ssh-keygen -t ed25519`. GitHub's guide to [generating a new SSH key](https://docs.github.com/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent) covers every operating system.
2. Format a USB drive with the label `CONFIG`, see [the CONFIG USB drive](/os/operating-system/configuration/#the-config-usb-drive).
3. Create a file named `authorized_keys` in the root of the drive, without an extension. Put your *public* key in it, the content of the file ending in `.pub`, one key per line. Use Unix line endings (LF), and plain ASCII.
4. Plug the drive into the device, and run `ha os import`, or reboot with the drive plugged in.

Since Supervisor 2026.09.0, the Supervisor API can manage these keys too, with the `/os/ssh/authorized_keys` endpoints. See the Supervisor API reference in the [Apps](/apps/) area.

### Connect

```shell
ssh root@homeassistant.local -p 22222
```

Changed the hostname, or no mDNS on your network? Use the IP address of the device instead.

### Turn it off again

Import a `CONFIG` drive *without* an `authorized_keys` file. The import removes all keys and stops the SSH server. Through the API, a `DELETE` on the same endpoint removes all keys of root.

## The local console

On a screen and keyboard, or a virtual machine console, the device shows the Home Assistant CLI, `ha >`. Type `login` to get a root shell on the host.

If the CLI does not come up within three minutes, or you press <kbd>Ctrl</kbd>+<kbd>C</kbd> while it waits, you get an emergency shell instead. That is the way in when the Supervisor does not start.

## Serial console

Many boards also have a serial console. It shows the boot messages, and gives you a login prompt: log in as `root`, without a password.

The consoles are set in `cmdline.txt` on the boot partition. The defaults per board:

| Board | Serial console |
| --- | --- |
| Home Assistant Green | `ttyS2`, 1500000 baud |
| Home Assistant Yellow | `ttyAMA2`, 115200 baud |
| ODROID-C2, ODROID-C4, ODROID-N2, Khadas VIM3 | `ttyAML0`, 115200 baud |
| Generic aarch64, virtual machines | `ttyS0` |

The kernel writes its messages to every console in `cmdline.txt`, but the systemd startup messages only go to the one listed last. On every board with a screen, that is `console=tty0`, so they show on the screen. Home Assistant Yellow has no HDMI port, so it lists its serial console last. To see the startup messages on the serial console of another board, move its `console=` entry to the end of the line. On boards not in this table, add the serial console yourself, see the [board pages](/os/operating-system/boards/).

## Rescue shell

On boards with GRUB (generic x86-64, generic aarch64, and virtual machines), the boot menu has a rescue shell entry for each slot. It boots the system into systemd's recovery target, with debug output. Useful when the system does not get far enough to start a console.

## Logs

The journal is stored on the data partition, so it survives reboots. On the host shell:

```shell
# The service that starts the Supervisor
journalctl -u haos-supervisor -f

# The Supervisor itself
docker logs -f hassio_supervisor

# Home Assistant Core
docker logs -f homeassistant

# Everything, newest last
journalctl -e
```

Without host access, the CLI shows most of this too: `ha supervisor logs`, `ha core logs`, and `ha host logs`. Add `--help` to see the options, like choosing a boot.

## Look inside a container

Every part of the system is a Docker container. To open a shell in one:

```shell
docker ps
docker exec -it homeassistant /bin/bash
```

The [Supervisor overview](/os/supervisor/#what-the-supervisor-runs) lists the containers and their names.

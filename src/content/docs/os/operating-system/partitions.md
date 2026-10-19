---
title: Partitions
description: The disk layout of Home Assistant OS, what each partition holds, and how the data disk feature moves the data partition.
sidebarGroup: Reference
order: 1
---

The disk layout of Home Assistant OS is different from a typical Linux system. The system itself is stored twice, for safe updates, and everything that changes lives on separate partitions.

## Partition table

Home Assistant OS uses a GPT partition table where it can. Some boards have boot firmware that needs the second block of the disk, where GPT stores its header. Those use a hybrid table, GPT with an MBR alongside it, or a plain MBR table. The `PARTITION_TABLE_TYPE` in the [board metadata](/os/operating-system/board-metadata/) sets which one.

## Layout

| Partition | Label | Size | Content |
| --- | --- | --- | --- |
| Boot | `hassos-boot` | Per board, 16 to 64 MB | Bootloader files, `cmdline.txt`, and boot configuration |
| Kernel A | `hassos-kernel0` | 24 MB | The kernel of slot A |
| System A | `hassos-system0` | 256 MB | The root file system of slot A |
| Kernel B | `hassos-kernel1` | 24 MB | The kernel of slot B |
| System B | `hassos-system1` | 256 MB | The root file system of slot B |
| Boot state | `hassos-bootstate` | 8 MB | The U-Boot environment, on U-Boot boards |
| Overlay | `hassos-overlay` | 96 MB | Persistent host settings |
| Data | `hassos-data` | The rest of the disk | Containers, Home Assistant, apps, and user data |

Boards with a secondary program loader (SPL) also reserve room for it at the start of the disk, before the boot partition. The sizes are set in `buildroot-external/scripts/hdd-image.sh` and the board metadata. The layouts themselves are in `buildroot-external/genimage/`.

The partition names keep the old `hassos` prefix. Lots of code, in the OS and in the Supervisor, finds partitions by these labels.

## Boot partition

A FAT partition, mounted at `/mnt/boot`. On UEFI systems, it is the EFI system partition, with GRUB and its environment file. On other boards it holds the U-Boot or Raspberry Pi firmware files. It also holds `cmdline.txt` and, on Raspberry Pi, `config.txt`.

## Kernel and system partitions

Each slot has a kernel partition and a system partition. The system partition holds the root file system, a read-only, compressed EROFS image. Neither is written to during normal use. Only an update writes them, and only the slot that is not running. See [the update system](/os/operating-system/update-system/).

## Overlay partition

An ext4 file system, mounted at `/mnt/overlay`. It holds host settings that need to persist, like network connections, the hostname, and SSH keys. They are bind mounted into `/etc` and other places at boot. [Configure the host](/os/operating-system/configuration/#persistent-folders-on-the-host) lists them.

## Data partition

An ext4 file system, mounted at `/mnt/data`. It holds everything that is not the operating system: the Docker storage (bound to `/var/lib/docker`), the Supervisor's data in `/mnt/data/supervisor`, the system journal, and the swap file. It gets by far the most reads and writes, so it benefits most from fast storage.

The data partition in the image is small. At first boot, `haos-expand` grows it to fill the rest of the disk.

A fresh image comes with the Supervisor and its plugins already on the data partition, but not Home Assistant Core. It has a small landing page instead. The Supervisor downloads the current Core on the first start, so new installations always start on the latest version.

## Data disk

Users can move the data partition to another disk, like a USB SSD next to an SD card. The Supervisor and the OS Agent prepare the target disk, with a partition labeled `hassos-data-external`, and reboot.

During the next boot, `haos-data.service` copies the data partition to the new disk with `e2image`, and changes the label of the old partition to `hassos-data-old`. The new partition is then the only one with the `hassos-data` label, so it is the one that gets mounted. If the copy fails, the new partition is labeled `hassos-data-fail` and the system keeps using the old one.

On the first boot of a fresh installation, `haos-data-disk-detach.service` looks for `hassos-data` partitions on other disks, like a data disk left over from an earlier installation. It renames them to `hassos-data-dis`, so the new installation does not mount them. Home Assistant Yellow is the exception: a data partition on its first NVMe disk is kept, and wins over the one on the eMMC.

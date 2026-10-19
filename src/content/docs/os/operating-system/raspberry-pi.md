---
title: Raspberry Pi
description: Raspberry Pi specifics for Home Assistant OS, like the serial console, I2C, and booting from USB.
sidebarGroup: Boards
order: 2
---

Home Assistant OS supports the Raspberry Pi 3, 4, and 5, all 64-bit. Home Assistant Yellow is built on the same board support, with a Compute Module 4 or 5.

| Board | Build target | Bootloader |
| --- | --- | --- |
| Raspberry Pi 3 Model B and B+ | `rpi3_64` | U-Boot |
| Raspberry Pi 4 Model B | `rpi4_64` | U-Boot |
| Raspberry Pi 5 | `rpi5_64` | Firmware tryboot |
| Home Assistant Yellow | `yellow` | U-Boot |

All of them use the [Raspberry Pi Linux kernel](https://github.com/raspberrypi/linux), not mainline. The board files are in `buildroot-external/board/raspberrypi/`.

## How they boot

On Raspberry Pi 3 and 4, the Raspberry Pi firmware loads U-Boot (`kernel=u-boot.bin` in `config.txt`), and U-Boot picks the slot. Raspberry Pi 5 boots without U-Boot: the firmware loads the kernel of the active slot directly, and an update uses the firmware's tryboot mechanism to test the new slot. Always reboot a Raspberry Pi 5 with `systemctl reboot` after a manual update, see [the update system](/os/operating-system/update-system/#how-an-update-runs).

`config.txt` and `cmdline.txt` are on the boot partition. Changes to them survive OS updates.

## Serial console

On Raspberry Pi 3 and 4, the serial console is not enabled by default. To enable it on the GPIO header (pin 6 is ground, pin 8 is TX, pin 10 is RX):

1. Add `enable_uart=1` and `dtoverlay=disable-bt` to `config.txt`. The overlay moves Bluetooth off the main UART.
2. Add `console=ttyAMA0,115200` to `cmdline.txt`.

Home Assistant Yellow has its serial console enabled, on `ttyAMA2` at 115200 baud.

## I2C

1. Add `dtparam=i2c_arm=on` to `config.txt`.
2. Load the `i2c-dev` module at boot: a file with the line `i2c-dev` in the `modules/` folder of a [CONFIG USB drive](/os/operating-system/configuration/#the-config-usb-drive), or in `/etc/modules-load.d/` on the host.

## Boot from USB

Raspberry Pi 4 and 5 can boot from a USB drive, if their bootloader in EEPROM is recent enough. Home Assistant OS includes the EEPROM tools. `ha os boards raspberrypi firmware update` updates the bootloader from the CLI.

Some things to know:

- Remove every bootable SD card. The firmware tries the SD card first.
- Booting is slower, because the firmware looks at the SD card before USB.
- Not every USB to SATA adapter works. On Raspberry Pi 4, `cmdline.txt` already contains `usb-storage.quirks` for adapters known to need them. The Raspberry Pi 5 image has none. If yours misbehaves, find its USB ID and add a quirk for it.
- Without an SD card, add `dtparam=sd_poll_once=on` to `config.txt`, to stop the kernel from polling the empty slot.

Raspberry Pi 3 Model B can boot from USB after `program_usb_boot_mode=1` is set once in `config.txt`. That change is permanent: it is written to one-time programmable memory.

## Bluetooth

Bluetooth is on by default. If you don't need it, `dtoverlay=disable-bt` in `config.txt` turns it off.

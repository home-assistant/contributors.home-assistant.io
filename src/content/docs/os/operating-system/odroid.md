---
title: ODROID
description: Hardkernel ODROID specifics for Home Assistant OS, like eMMC installation, the boot flow of the M1 and M1S, and the consoles.
sidebarGroup: Boards
order: 3
---

Home Assistant OS supports five Hardkernel ODROID boards. Their board files are in `buildroot-external/board/hardkernel/`.

| Board | Build target | SoC family | Notes |
| --- | --- | --- | --- |
| ODROID-C2 | `odroid_c2` | Amlogic | Discontinued by Hardkernel |
| ODROID-C4 | `odroid_c4` | Amlogic | |
| ODROID-N2 and N2+ | `odroid_n2` | Amlogic | Home Assistant Blue is an ODROID-N2+ |
| ODROID-M1 | `odroid_m1` | Rockchip | Since Home Assistant OS 10 |
| ODROID-M1S | `odroid_m1s` | Rockchip | Since Home Assistant OS 12 |

All of them boot with U-Boot and run the mainline Linux kernel.

## Wi-Fi and Bluetooth modules

Hardkernel's [WiFi Module 3](https://www.hardkernel.com/shop/wifi-module-3/) and [Bluetooth Module 2](https://www.hardkernel.com/shop/bluetooth-module-2/) were tested with Home Assistant OS in the past. The WiFi Module 5A has no upstream driver, and is not recommended.

## ODROID-C2, C4, and N2

The image works on eMMC the same way as on an SD card: flash it to the eMMC module.

The serial console is on the serial header, `ttyAML0` at 115200 baud, next to the HDMI console. The kernel sends its messages to both, but the systemd startup messages only go to the console listed last in `cmdline.txt`. By default, that is HDMI:

```text
console=ttyAML0,115200n8 console=tty0
```

To see the startup messages on the serial console instead, swap the two.

On the ODROID-N2, GPIO pin 11 works as a power button, active low. For the GPIO headers, see the ODROID wiki for the [C2](https://wiki.odroid.com/odroid-c2/hardware/expansion_connectors), [C4](https://wiki.odroid.com/odroid-c4/hardware/expansion_connectors), and [N2](https://wiki.odroid.com/odroid-n2/hardware/expansion_connectors).

## ODROID-M1

The image contains everything to boot the SoC directly, without Hardkernel's Petitboot. But the M1 boots from its SPI flash first. To boot from the SD card or eMMC directly, hold the recovery button. A recent Petitboot in SPI flash also finds the U-Boot of Home Assistant OS by itself, so no button is needed.

To boot from eMMC through the SPI flash, you need Petitboot version 20230328 or later. To update it:

1. Download the SPI updater and the SPI boot image from [Hardkernel's Petitboot images](http://ppa.linuxfactory.or.kr/images/petitboot/odroidm1/).
2. Flash the updater to an SD card.
3. Copy the SPI boot image to the FAT partition of that SD card, named `spiboot.img`.
4. Boot the M1 from that SD card. The HDMI output shows the progress, and the new version in the top left corner when it worked.

Then flash Home Assistant OS to the eMMC. NVMe drives can't be booted from, but work as a [data disk](/os/operating-system/partitions/#data-disk).

The serial console is on the CON1 header, at 1500000 baud. `cmdline.txt` contains `console=tty0`, so the systemd startup messages show on HDMI, not on the serial console.

## ODROID-M1S

The M1S boots from the SD card before the eMMC, so an SD card with Home Assistant OS just works. That even works when the eMMC still has the factory loader on it.

To install on the eMMC, use Hardkernel's [UMS utility image](https://wiki.odroid.com/odroid-m1s/getting_started/os_installation_guide#user_installer). It turns the M1S into a USB mass storage device, so you can flash the eMMC from your computer through the Micro USB OTG port.

Installing Home Assistant OS replaces the loader on the eMMC with the mainline one. After that, the UMS utility image no longer boots from SD card. To get back to UMS mode, write Hardkernel's image to the eMMC from the Home Assistant OS host shell:

```shell
dd if=/tmp/ODROID-M1S_EMMC2UMS.img of=/dev/mmcblk0
```

The device then starts in UMS mode at the next boot, without an SD card. Download the image on another computer: Hardkernel's download site blocks scripted downloads. Then copy it to the device, for example with `scp`.

NVMe drives can't be booted from, but work as a data disk. The 14 pin expansion header is partly supported by the mainline kernel, including the UPS and internal USB.

The serial console is at 1500000 baud. Like on the M1, the systemd startup messages show on HDMI.

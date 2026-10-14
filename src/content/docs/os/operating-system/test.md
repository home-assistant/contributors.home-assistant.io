---
title: Test your build
description: Boot your image in QEMU, run the automated tests, and install your build on a real device.
sidebarGroup: Guides
order: 2
---

A build that finishes is not a build that works. Before you open a pull request, boot your image. For most changes, a virtual machine is enough. For board specific changes, you need the board.

## Boot it in QEMU

The `ova` target builds images for virtual machines, including a compressed QCOW2 image that QEMU runs once you unpack it. `--keep` leaves the compressed file in place, because the automated tests below unpack it again. Home Assistant OS needs UEFI, so QEMU needs UEFI firmware too. On Debian and Ubuntu, the `ovmf` package provides it.

```shell
scripts/enter.sh make O=output_ova ova
unxz --keep output_ova/images/haos_ova-*.qcow2.xz
```

Then start it. The path of the firmware file differs between distributions, so check where your `ovmf` package put it:

```shell
IMAGE=output_ova/images/haos_ova-18.4.dev0.qcow2
FIRMWARE=/usr/share/OVMF/OVMF_CODE.fd

qemu-system-x86_64 -enable-kvm -name haos -smp 2 -m 2G \
  -drive file="$IMAGE",if=virtio,format=qcow2 \
  -drive file="$FIRMWARE",if=pflash,format=raw,readonly=on
```

The boot ends at the Home Assistant CLI prompt, `ha >`. Type `login` to get a root shell on the host.

On an Arm machine, use the `generic_aarch64` target. Next to its disk image, it builds QCOW2, VMDK, and VDI images for Arm virtual machines.

## Run the automated tests

The `tests/` folder has tests that boot the OVA image in QEMU and check that the system and the Supervisor come up. They use [labgrid](https://labgrid.readthedocs.io/) and pytest. The test setup expects the image as `tests/haos.qcow2`, and the OVMF firmware at `/usr/share/ovmf/OVMF.fd`:

```shell
unxz -c output_ova/images/haos_ova-*.qcow2.xz > tests/haos.qcow2
tests/run_tests.sh
```

Unless you already work in a Python virtual environment, the script creates one in `tests/venv` and installs the test dependencies into it. The same tests run in CI, on every release build and on pull requests with the `run-ova-test` label.

## Install your build on a device

You can flash the disk image to an SD card or disk, like any release. To keep the data on an existing installation instead, install the RAUC update bundle.

> [!IMPORTANT]
> An official release only trusts bundles signed by the release certificate. Your build is signed with your own self-signed certificate, so the installation fails with a signature error. [Install a self-signed build](/os/operating-system/update-system/#install-a-self-signed-build) shows how to make the device accept it.

Once the device accepts your certificate, copy the `.raucb` file to the device, then run this on the host shell (see [debug the host](/os/operating-system/debugging/)):

```shell
cd /mnt/data
rauc install haos_rpi4-64-18.4.dev0.raucb
systemctl reboot
```

The device reboots into the slot that was just written. If that slot does not boot, it falls back to the other one. See [the update system](/os/operating-system/update-system/).

## Use a development build

You don't always need to build yourself. Development builds of the `dev` branch are published on [os-artifacts.home-assistant.io](https://os-artifacts.home-assistant.io/index.html). They are built and signed by the same pipeline as releases, so you can try a change that was merged recently without setting up a build. [Releases and builds](/os/operating-system/releases/#build-pipelines) explains how they are made.

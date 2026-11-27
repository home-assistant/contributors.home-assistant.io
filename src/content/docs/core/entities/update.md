---
title: Update entity
description: Build an update entity that tells users a new firmware or software version is available, and lets them install it.
sidebarLabel: Update
sidebarGroup: Appliances
---

An update entity tells users that a newer version is available for a device or service, like firmware for a light bulb or router, or software for an app or a container. It can also install that update from Home Assistant, show the release notes, and report progress while installing. Inherit from `UpdateEntity` in `homeassistant.components.update`.

Users find available updates in **Settings**, next to the updates of Home Assistant itself. For how the frontend shows one, see the [update more-info view](/design/more-info/update/).

## Properties

Update entities have these properties on top of the [generic entity properties](/core/entities/entity-class/). Every property can be set with its `_attr_` attribute, like `_attr_installed_version`.

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `installed_version` | `str \| None` | `None` | The version that is installed and in use now. |
| `latest_version` | `str \| None` | `None` | The newest version available. |
| `title` | `str \| None` | `None` | The name of the software, like `Tasmota`, when that differs from the device or entity name. |
| `release_summary` | `str \| None` | `None` | A short excerpt of the release notes. Cut off at 255 characters. |
| `release_url` | `str \| None` | `None` | A link to the full release notes. |
| `auto_update` | `bool` | `False` | The device or service updates itself. Users cannot skip versions of such an entity. |
| `in_progress` | `bool \| None` | `False` | Whether an install is running. Requires `UpdateEntityFeature.PROGRESS`. |
| `update_percentage` | `int \| float \| None` | `None` | How far the install is, from 0 to 100. Requires `UpdateEntityFeature.PROGRESS`, and is only shown while `in_progress` is `True`. |
| `install_phase` | `UpdateInstallPhase \| None` | `None` | What the install is doing right now. Requires `UpdateEntityFeature.PROGRESS`, and is only shown while `in_progress` is `True`. See [Install phases](#install-phases). |
| `manual_action` | `UpdateManualAction \| None` | `None` | What a person has to do to install the update, like confirm it on the device. Only shown while an update is available or an install is in progress. See [Manual actions](#manual-actions). |
| `display_precision` | `int` | `0` | The number of decimals to show for `update_percentage`. |
| `device_class` | `UpdateDeviceClass \| None` | `None` | The kind of update. See [Device classes](#device-classes). |
| `restart_required` | `bool` | `False` | Home Assistant needs a restart once this update is installed. See [Install](#install). |
| `has_update` | `bool` | Compares the versions | Whether an update is available. See [Decide whether an update is available](#decide-whether-an-update-is-available). |

Update entities change a few generic defaults:

- `entity_category` is `EntityCategory.CONFIG` when the entity supports `INSTALL`, and `EntityCategory.DIAGNOSTIC` otherwise. Set it yourself to override that. When the entity has an entity description, the `entity_category` of the description is used instead. `UpdateEntityDescription` defaults it to `EntityCategory.CONFIG`.
- `entity_picture` is the brand icon of your integration.
- An entity without a name, but with a device class, is named after its device class, like **Firmware**.

## Supported features

Combine the values of `UpdateEntityFeature` with the bitwise or (`|`) operator. Home Assistant checks them when the `update.install` action is called, and refuses what the entity does not support.

| Value | Description |
| ----- | ----------- |
| `INSTALL` | The update can be installed from Home Assistant. Implement `install`. |
| `SPECIFIC_VERSION` | A specific version can be installed, passed as `version` to `install`. |
| `BACKUP` | The device or service can make a backup before it installs, when `backup` is `True`. |
| `PROGRESS` | The entity reports install progress with `in_progress`, `update_percentage`, and `install_phase`. |
| `RELEASE_NOTES` | The entity can fetch the full release notes. Implement `release_notes`. |

Without `PROGRESS`, Home Assistant still shows that an install is running: it sets `in_progress` itself for as long as your install method runs. Set `PROGRESS` when the device reports real progress, it gives users a better picture.

## Device classes

| Value | Description |
| ----- | ----------- |
| `UpdateDeviceClass.FIRMWARE` | The update is firmware for a device. |

## Methods

### Install

Requires `UpdateEntityFeature.INSTALL`. Implement `install` or `async_install`.

```python
async def async_install(
    self, version: str | None, backup: bool, **kwargs: Any
) -> None:
    """Install an update."""
```

`version` is the version to install, or `None` for the latest. `backup` asks for a backup first. When the `update.install` action calls it, Home Assistant has already checked that there is something to install, that no install is running, and that the entity supports the requested version and backup.

Return when the install is done, or raise a `HomeAssistantError` when it fails. Whichever way it ends, Home Assistant then resets `_attr_in_progress` to `False` and writes the state. If you override the `in_progress` property, make sure it reports `False` by then.

If the update only takes effect after Home Assistant restarts, set `restart_required` to `True`. Once the install finishes without raising, the entity [asks for a restart](/core/integrations/restart-required/) on behalf of your integration. A failed install does not.

### Install phases

With `UpdateEntityFeature.PROGRESS`, set `install_phase` to tell users what the install is doing, like downloading or restarting. Home Assistant only shows it while `in_progress` is `True`, so you don't have to reset it when the install ends.

| Value | Shown as | Use it when |
| ----- | -------- | ----------- |
| `UpdateInstallPhase.PREPARING` | Preparing | The install is starting, like checking the update file or the device. |
| `UpdateInstallPhase.BACKING_UP` | Backing up | The device or service makes a backup before it installs. |
| `UpdateInstallPhase.WAITING` | Waiting | The install is queued, or waits for the device, like a battery-powered device that has to wake up first. Nobody has to do anything. |
| `UpdateInstallPhase.WAITING_FOR_USER` | Waiting for user | The install can't continue until a person does the [manual action](#manual-actions). |
| `UpdateInstallPhase.DOWNLOADING` | Downloading | The update is downloaded, or transferred to the device. |
| `UpdateInstallPhase.INSTALLING` | Installing | The update is written to the device or applied. |
| `UpdateInstallPhase.RESTARTING` | Restarting | The device or service restarts to run the new version. |
| `UpdateInstallPhase.FINISHING` | Finishing | The last steps, like migrating data or checking that the new version runs. |

Only report the phases your device or service tells you about, in the order they happen. `update_percentage` works the same with or without a phase: set it while the current phase reports progress, and set it back to `None` when the next phase doesn't.

```python
async def async_install(
    self, version: str | None, backup: bool, **kwargs: Any
) -> None:
    """Install the latest firmware."""
    self._attr_in_progress = True
    self._attr_install_phase = UpdateInstallPhase.DOWNLOADING
    self.async_write_ha_state()
    await self.device.download_firmware()

    self._attr_install_phase = UpdateInstallPhase.INSTALLING
    self.async_write_ha_state()
    await self.device.install_firmware()
```

### Manual actions

Some updates need a person to do something outside Home Assistant, like confirm the update on the screen of the device, press a button, or turn the device off and on again. Set `manual_action` to an `UpdateManualAction` to say what. Its texts are translations, so users see them in their own language.

Set it as soon as you know the update needs it, ideally before the install starts. The frontend then warns users before they start the install. They might be away from home, and the device might be unusable until someone acts. If you only find out during the install, set it then.

While the install waits for the person, report the `UpdateInstallPhase.WAITING_FOR_USER` phase. The manual action stays the same during the whole install, so you don't switch it on and off. Automations can use `install_phase: waiting_for_user` to notify someone.

Home Assistant only shows the manual action while an update is available or an install is in progress. You can return the same action all the time, like for a device that always asks for a confirmation, and it is gone once the update is installed.

Add the texts of your manual actions under `entity` > `update` > `manual_actions` in the `strings.json` of your integration. Each manual action has two texts, so users always see a message that fits the moment:

- `description`: what someone will have to do, and when. The frontend shows it before the install, and during the install until it's time. For example: "During the update, someone has to confirm it on the device's screen."
- `instruction`: what to do now. The frontend shows it while the install is in the `WAITING_FOR_USER` phase. For example: "Confirm the update on the device's screen."

Don't name the device in the texts, the frontend shows them with the name of the update entity. Both texts can have placeholders, which you pass as `translation_placeholders`.

```json
{
  "entity": {
    "update": {
      "manual_actions": {
        "confirm_update": {
          "description": "During the update, someone has to confirm it on the device's screen.",
          "instruction": "Confirm the update on the device's screen."
        }
      }
    }
  }
}
```

```python
from homeassistant.components.update import UpdateInstallPhase, UpdateManualAction

MANUAL_ACTION_CONFIRM_UPDATE = UpdateManualAction(
    translation_domain=DOMAIN, translation_key="confirm_update"
)


class MyFirmwareUpdate(MyEntity, UpdateEntity):
    """Firmware updates that the device asks to confirm."""

    _attr_manual_action = MANUAL_ACTION_CONFIRM_UPDATE

    async def async_install(
        self, version: str | None, backup: bool, **kwargs: Any
    ) -> None:
        """Install the latest firmware."""
        self._attr_in_progress = True
        self._attr_install_phase = UpdateInstallPhase.DOWNLOADING
        self.async_write_ha_state()
        await self.device.download_firmware()

        self._attr_install_phase = UpdateInstallPhase.WAITING_FOR_USER
        self.async_write_ha_state()
        await self.device.wait_for_confirmation()

        self._attr_install_phase = UpdateInstallPhase.INSTALLING
        self.async_write_ha_state()
        await self.device.install_firmware()
```

When the update only takes effect after the person does something, like turn the device off and on again, the install isn't finished yet. Keep `in_progress` at `True` and report `WAITING_FOR_USER` until it's done. To ask for a restart of Home Assistant itself, use `restart_required` instead.

In the state, `manual_action` is a dictionary with `translation_domain`, `translation_key`, and `translation_placeholders`. The texts are at `component.<domain>.entity.update.manual_actions.<key>.description` and `.instruction`. The recorder does not store `install_phase` or `manual_action`.

### Release notes

Requires `UpdateEntityFeature.RELEASE_NOTES`. Implement `release_notes` or `async_release_notes`, and return the full release notes of the latest version. The frontend shows them in the more-info dialog before the user installs, and renders Markdown.

```python
async def async_release_notes(self) -> str | None:
    """Return the release notes."""
```

### Compare versions

By default, a version counts as newer when [AwesomeVersion](https://github.com/ludeeus/awesomeversion) says so. If your versions don't compare well that way, override `version_is_newer`.

```python
def version_is_newer(
    self, latest_version: str, installed_version: str
) -> bool:
    """Return True if latest_version is newer than installed_version."""
```

### Decide whether an update is available

Some devices or services tell you directly whether an update is available, instead of giving versions Home Assistant can compare. Override the `has_update` property for those.

```python
@property
def has_update(self) -> bool:
    """Return whether an update is available."""
    return self.device.update_available
```

Home Assistant only reads `has_update` when both `installed_version` and `latest_version` are known and differ, and the user has not skipped the latest version. By default, it calls `version_is_newer`.

## States

The state is `on` when an update is available and `off` when the installed version is the latest. Home Assistant works this out from `installed_version` and `latest_version`; the `state` property is final.

- When either version is `None`, the state is `unknown`.
- When both versions are the same, the state is `off`.
- When the user skipped the latest version, the state is `off` until a newer one comes out.
- Otherwise, the state follows `has_update`. By default, that is `on` when the latest version is newer, and also when the versions can't be compared.

Skipping and clearing a skipped version are handled by Home Assistant. You don't implement them.

## Example

```python
from typing import Any

from homeassistant.components.update import (
    UpdateDeviceClass,
    UpdateEntity,
    UpdateEntityFeature,
)


class MyFirmwareUpdate(MyEntity, UpdateEntity):
    """Firmware updates for the device."""

    _attr_device_class = UpdateDeviceClass.FIRMWARE
    _attr_supported_features = (
        UpdateEntityFeature.INSTALL | UpdateEntityFeature.PROGRESS
    )

    def __init__(self, coordinator: MyCoordinator) -> None:
        """Set up the entity."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{coordinator.device.serial}_firmware"

    @property
    def installed_version(self) -> str | None:
        """Return the installed firmware version."""
        return self.coordinator.data.firmware

    @property
    def latest_version(self) -> str | None:
        """Return the newest firmware version."""
        return self.coordinator.data.latest_firmware

    @property
    def in_progress(self) -> bool:
        """Return whether the firmware is being installed."""
        return self.coordinator.data.updating

    @property
    def update_percentage(self) -> int | None:
        """Return the install progress."""
        return self.coordinator.data.update_progress

    async def async_install(
        self, version: str | None, backup: bool, **kwargs: Any
    ) -> None:
        """Install the latest firmware."""
        await self.coordinator.device.install_firmware()
        await self.coordinator.async_request_refresh()
```

`MyEntity` is the shared base entity of the integration, a `CoordinatorEntity` that sets `_attr_has_entity_name = True` and the device info. The entity has no name of its own, so it is named **Firmware** after its device class.

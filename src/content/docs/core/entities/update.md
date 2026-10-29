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
| `release_notes_messages` | `tuple[UpdateReleaseNotesMessage, ...]` | `()` | Translated messages shown before the release notes. See [Release notes messages](#release-notes-messages). |
| `auto_update` | `bool` | `False` | The device or service updates itself. Users cannot skip versions of such an entity. |
| `in_progress` | `bool \| None` | `False` | Whether an install is running. Requires `UpdateEntityFeature.PROGRESS`. |
| `update_percentage` | `int \| float \| None` | `None` | How far the install is, from 0 to 100. Requires `UpdateEntityFeature.PROGRESS`, and is only shown while `in_progress` is `True`. |
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
| `PROGRESS` | The entity reports install progress with `in_progress` and `update_percentage`. |
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

### Release notes

Requires `UpdateEntityFeature.RELEASE_NOTES`. Implement `release_notes` or `async_release_notes`, and return the full release notes of the latest version. The frontend shows them in the more-info dialog before the user installs, and renders Markdown.

```python
async def async_release_notes(self) -> str | None:
    """Return the release notes."""
```

#### Release notes messages

Some updates need the same guidance every time, like a warning not to unplug the device while it installs. Put that in `release_notes_messages`, not in your release notes. Home Assistant translates each message and shows it as an alert above the release notes. Your `release_notes` method then only returns the release notes of the device or service.

The messages are shown together with the release notes, so the entity needs `UpdateEntityFeature.RELEASE_NOTES` too.

The update platform has two shared messages:

| Message | What it tells the user |
| ------- | ---------------------- |
| `RELEASE_NOTES_MESSAGE_BATTERY_POWERED` | Battery-powered devices can take hours to update, and may need to be woken up before the update starts. |
| `RELEASE_NOTES_MESSAGE_DO_NOT_INTERRUPT` | Do not restart, unplug, or otherwise interrupt the device while it updates. Shown as a warning. |

```python
from homeassistant.components.update import (
    RELEASE_NOTES_MESSAGE_BATTERY_POWERED,
    RELEASE_NOTES_MESSAGE_DO_NOT_INTERRUPT,
    UpdateEntity,
)


class MyUpdate(UpdateEntity):
    """Updates for a battery-powered device."""

    _attr_release_notes_messages = (
        RELEASE_NOTES_MESSAGE_BATTERY_POWERED,
        RELEASE_NOTES_MESSAGE_DO_NOT_INTERRUPT,
    )
```

You can also set them on the entity description, with `UpdateEntityDescription(release_notes_messages=...)`.

For guidance that only fits your integration, define your own message with `UpdateReleaseNotesMessage`:

```python
from homeassistant.components.update import (
    UpdateReleaseNotesMessage,
    UpdateReleaseNotesMessageSeverity,
)

from .const import DOMAIN

RELEASE_NOTES_MESSAGE_TRUSTED_SOURCE = UpdateReleaseNotesMessage(
    translation_domain=DOMAIN,
    translation_key="trusted_source",
    severity=UpdateReleaseNotesMessageSeverity.WARNING,
)
```

Add the text to the `strings.json` of your integration, under `entity.update.release_notes_messages`:

```json title="strings.json"
{
  "entity": {
    "update": {
      "release_notes_messages": {
        "trusted_source": "Only install this update if you trust its source."
      }
    }
  }
}
```

The `severity` is `INFO` by default. Use `WARNING` or `ERROR` when the message needs more attention. To fill placeholders in the text, like a link to your documentation, pass `translation_placeholders`.

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

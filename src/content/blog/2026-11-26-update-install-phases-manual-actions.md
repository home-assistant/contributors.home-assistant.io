---
title: "Update entities can say what an install is doing"
description: "Home Assistant Core 2027.1 adds install phases and manual actions to update entities, so users see what an install is doing and what it needs from them."
date: 2026-11-26
authors:
  - Felipe Santos
areas:
  - core
---

As of Home Assistant Core 2027.1, update entities have two new optional properties: `install_phase` and `manual_action`.

Until now, an update entity could only say that an install was running, and how far it was. That leaves users guessing during long installs. Is the firmware still downloading, or is the device restarting? Some updates also stop until someone does something on the device, like confirm the update on its screen. Users had no way to know.

## Install phases

`install_phase` tells users what the install is doing right now. It takes a value of the new `UpdateInstallPhase` enum: `PREPARING`, `BACKING_UP`, `WAITING`, `DOWNLOADING`, `INSTALLING`, `RESTARTING`, or `FINISHING`. Home Assistant translates them, so your integration doesn't need any strings for them.

Like `update_percentage`, it requires `UpdateEntityFeature.PROGRESS` and is only shown while `in_progress` is `True`.

```python
self._attr_in_progress = True
self._attr_install_phase = UpdateInstallPhase.DOWNLOADING
self.async_write_ha_state()
```

## Manual actions

`manual_action` tells users that the update needs them to do something outside Home Assistant. Set it to an `UpdateManualAction`, which points to a translation of the message, with placeholders if needed. Use a shared one, like `MANUAL_ACTION_CONFIRM_ON_DEVICE`, or add your own under `entity` > `update` > `manual_actions` in your `strings.json`.

```python
self._attr_manual_action = UpdateManualAction(
    translation_domain=DOMAIN,
    translation_key="power_cycle",
    translation_placeholders={"device_name": self.device.name},
)
```

A manual action doesn't need `UpdateEntityFeature.PROGRESS`, and is not tied to `in_progress`. It can stay after the install ends, for example when the update only takes effect once the device restarts. Home Assistant never clears it for you, so set it back to `None` when it's done.

## What changes for your integration

Nothing, unless you want to use them. Both properties default to `None`. Every update entity has the two new state attributes though, so update the state snapshots of your tests.

Frontend support for both is in progress. See the [update entity documentation](/core/entities/update/#install-phases) for the details.

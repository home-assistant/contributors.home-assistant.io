---
title: Mark entities unavailable when appropriate
description: "Silver rule entity-unavailable: entities become unavailable when the device or service cannot be reached."
sidebarLabel: entity-unavailable
sidebarGroup: Silver
order: 5
---

This is a Silver rule. In `quality_scale.yaml`, it is called `entity-unavailable`.

When the integration cannot get data from the device or service, its entities must become [unavailable](/glossary/unavailable/). When the connection works but a single value is missing for a moment, that entity reports an unknown state instead (`None`), and stays available.

## Why it matters

An entity that keeps showing its last value after the device went offline is lying. The living room is not 21 °C anymore when the sensor has been unreachable for three hours. Unavailable tells users, and their automations, that the value cannot be trusted right now.

## Example

### With a coordinator

A `CoordinatorEntity` handles this for you. When the update of the [coordinator](/glossary/coordinator/) raises `UpdateFailed`, `last_update_success` turns `False`, and every entity of the coordinator becomes unavailable:

```python
class MyCoordinator(DataUpdateCoordinator[dict[str, MyDevice]]):
    """Fetch data for all devices."""

    async def _async_update_data(self) -> dict[str, MyDevice]:
        try:
            return await self.client.get_devices()
        except MyConnectionError as err:
            raise UpdateFailed(
                translation_domain=DOMAIN,
                translation_key="update_failed",
            ) from err
```

If an entity needs more than that, like going unavailable when its device is missing from the data, combine your check with `super().available`:

```python
class MySensor(MyEntity, SensorEntity):
    """A sensor of a device."""

    @property
    def available(self) -> bool:
        """Return if the entity is available."""
        return super().available and self.device_id in self.coordinator.data
```

Do not leave out `super().available`. The coordinator keeps the data of the last successful update when an update fails, so a check on `coordinator.data` alone keeps the entity available with old data.

### With async_update

An entity that updates itself sets `_attr_available`:

```python
async def async_update(self) -> None:
    """Fetch the latest value."""
    try:
        data = await self.client.get_data()
    except MyConnectionError:
        self._attr_available = False
        return

    self._attr_available = True
    self._attr_native_value = data.temperature
```

## How it is checked

- Pylint warns when an `available` override of a coordinator entity only looks at `coordinator.data`, and ignores whether the last update succeeded (`home-assistant-coordinator-entity-available`).
- The rest is checked in review.

## Exceptions

If the integration has no entities, this rule does not apply.

Devices that go into standby are a special case. If the integration has a way to turn the device on while it is in standby, through a user-defined automation or a second channel like Wake-on-LAN or an infrared blaster, report the device as `off` while it is in standby, not as unavailable. If there is no such way, and the device cannot be controlled in its current state, report it as unavailable.

For example, a media player that can only be turned on with an infrared blaster:

- When first added, with no connection, it is unavailable.
- Once the user sets up an automation to turn it on, it is `off` while in standby.
- Once it is turned on and the connection is back, it is `on`.

When you report a device in standby as unavailable, that is expected, not an error. With a coordinator, raise `DeviceUnavailable` instead of `UpdateFailed` in that case. It is a subclass of `UpdateFailed`, so the entities become unavailable the same way, but the coordinator logs it at `info` level instead of `error`, as [log-when-unavailable](/core/quality-scale/log-when-unavailable/) asks.

## Related rules

- [log-when-unavailable](/core/quality-scale/log-when-unavailable/): log once when unavailable, and once when back.

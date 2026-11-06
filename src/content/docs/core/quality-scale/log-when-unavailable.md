---
title: Log once when unavailable, and once when back
description: "Silver rule log-when-unavailable: the integration logs a lost connection once, and once when it comes back."
sidebarLabel: log-when-unavailable
sidebarGroup: Silver
order: 7
---

This is a Silver rule. In `quality_scale.yaml`, it is called `log-when-unavailable`.

When the device or service cannot be reached, the integration logs that once. When it can be reached again, the integration logs that once as well. Not on every failed update in between. When you write these messages yourself, log them at `info` level.

## Why it matters

When entities go [unavailable](/glossary/unavailable/), users look in the logs to find out why. One message when the connection was lost, and one when it came back, tells them what happened and when. A message on every failed poll buries that in noise, fills the log file, and hides other problems.

## Example

### With a coordinator

The coordinator does this for you. Raise `UpdateFailed` when the update fails. The coordinator logs the first failure at `error` level, stays quiet while the failures continue, and logs at `info` level when fetching the data recovers:

```python
async def _async_update_data(self) -> MyData:
    """Fetch the latest data."""
    try:
        return await self.client.get_data()
    except MyConnectionError as err:
        raise UpdateFailed(
            translation_domain=DOMAIN,
            translation_key="update_failed",
        ) from err
```

When the device being unavailable is expected, like a device that the user turned off, raise `DeviceUnavailable` instead. It is a subclass of `UpdateFailed`, so everything else works the same, but the coordinator logs the first failure at `info` level:

```python
async def _async_update_data(self) -> MyData:
    """Fetch the latest data."""
    try:
        return await self.client.get_data()
    except MyDeviceOffError as err:
        raise DeviceUnavailable(
            translation_domain=DOMAIN,
            translation_key="device_off",
        ) from err
```

Only use `DeviceUnavailable` when nothing is wrong. A device that should be reachable but is not, or a service that fails, is an error: keep raising `UpdateFailed` for those.

### With async_update

An entity that updates itself keeps track of whether it already logged:

```python
class MySensor(SensorEntity):
    """A sensor that updates itself."""

    _unavailable_logged = False

    async def async_update(self) -> None:
        """Fetch the latest value."""
        try:
            data = await self.client.get_data()
        except MyConnectionError as err:
            self._attr_available = False
            if not self._unavailable_logged:
                _LOGGER.info("The device is unavailable: %s", err)
                self._unavailable_logged = True
            return

        self._attr_available = True
        self._attr_native_value = data.temperature
        if self._unavailable_logged:
            _LOGGER.info("The device is available again")
            self._unavailable_logged = False
```

## How it is checked

- Pylint warns when an error is logged at warning level or higher earlier in the same block that raises it to Home Assistant, like logging before raising `UpdateFailed` (`home-assistant-log-and-raise`). Home Assistant already reports those exceptions.
- The rest is checked in review.

## Exceptions

If the integration has no entities, this rule does not apply.

## Related rules

- [entity-unavailable](/core/quality-scale/entity-unavailable/): mark entities unavailable when appropriate.

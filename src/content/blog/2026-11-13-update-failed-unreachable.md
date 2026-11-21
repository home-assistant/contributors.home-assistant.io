---
title: "Log unreachable devices at info level with UpdateFailedUnreachable"
description: "Home Assistant Core 2026.12 adds UpdateFailedUnreachable, a subclass of UpdateFailed. The data update coordinator logs it at info level instead of error."
date: 2026-11-13
authors:
  - Shay Levy
areas:
  - core
---

Home Assistant Core 2026.12 adds `UpdateFailedUnreachable` to the data update coordinator. Raise it from `_async_update_data` when the device or service cannot be reached. The coordinator logs the first failure at `info` level, instead of `error`, which is what the [log-when-unavailable](/core/quality-scale/log-when-unavailable/) rule of the quality scale asks for.

<!--truncate-->

## Why

The log-when-unavailable rule asks you to log once at `info` level when the device or service cannot be reached, and once when it can be reached again. With a coordinator, the second message was already there: `Fetching <name> data recovered` is logged at `info` level. The first one was not. Raising `UpdateFailed` logs `Error fetching <name> data: <message>` at `error` level, so an integration that moved to a coordinator started logging an error every time its device went offline.

## How to use it

`UpdateFailedUnreachable` is a subclass of `UpdateFailed`, so it behaves the same way: the entities of the coordinator become unavailable, the coordinator tries again at the next interval, and `retry_after` works too. Only the log message is different: the first failure is logged once at `info` level, as `<name> is unavailable: <message>`.

```python
from homeassistant.helpers.update_coordinator import (
    DataUpdateCoordinator,
    UpdateFailedUnreachable,
)


class MyCoordinator(DataUpdateCoordinator[MyData]):
    """Fetch data for all entities."""

    async def _async_update_data(self) -> MyData:
        """Fetch the latest data."""
        try:
            return await self.client.get_data()
        except MyConnectionError as err:
            raise UpdateFailedUnreachable(
                translation_domain=DOMAIN,
                translation_key="update_unreachable",
            ) from err
```

See [the pull request](https://github.com/home-assistant/core/pull/188683) for the full change, and [Fetching data](/core/integrations/fetching-data/) for more about the coordinator and its exceptions.

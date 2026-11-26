---
title: "Keep coordinator data across restarts with RestoreDataUpdateCoordinator"
description: A new coordinator saves its data and restores it on startup, for integrations whose data cannot be fetched again when Home Assistant starts.
date: 2026-11-27
authors:
  - Brett Adams
areas:
  - core
---

## Summary

As of Home Assistant Core 2027.1, integrations can use `RestoreDataUpdateCoordinator`, a `DataUpdateCoordinator` that saves its `data` and restores it when it is created. This was agreed in [architecture discussion #1336](https://github.com/home-assistant/architecture/discussions/1336).

It is meant for integrations whose data cannot be fetched again when Home Assistant starts. Push and webhook based APIs only send data when something changes, and fetching data from some devices is costly or wakes them up, like a car that is asleep. Until now, these integrations had to restore each entity on its own with `RestoreEntity`. Now they can restore the whole coordinator instead.

Integrations that can fetch fresh data on startup should keep doing that.

## How to use it

Extend `RestoreDataUpdateCoordinator` instead of `DataUpdateCoordinator`. Use `storage_key` to tell apart more than one coordinator in a config entry:

```python
class ExampleCoordinator(RestoreDataUpdateCoordinator[dict[str, Any]]):
    """Keep the last known data of an Example vehicle."""

    def __init__(
        self,
        hass: HomeAssistant,
        config_entry: ExampleConfigEntry,
        vehicle_id: str,
    ) -> None:
        """Initialize the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            config_entry=config_entry,
            name=DOMAIN,
            storage_key=vehicle_id,
            update_interval=timedelta(minutes=5),
        )
```

Stored data is restored at the end of `__init__`, so it is there before `_async_setup` and the first refresh. Restored data does not change how setup works: if the first refresh fails, `async_config_entry_first_refresh` still raises `ConfigEntryNotReady`.

## What to know

- Data is saved every 15 minutes, together with the data of all other restore coordinators, and when Home Assistant shuts down. Only data that changed is serialized, and nothing is written when nothing changed.
- Data is serialized only when it is saved, so replace `data` instead of changing it in place.
- The data must be made of JSON types: dicts with `str` keys, lists, `str`, `int`, finite `float`, `bool`, and `None`. Other types, like tuples, enums, datetimes, and dataclasses, are not saved. Override `_serialize_data` and `_restore_data` to convert them.
- Raise `storage_version` when the format of your stored data changes. Data stored with another version is only restored if `_restore_data` migrates it.
- Data is removed when its config entry is removed, when you call `async_remove_stored_data`, or after 7 days without a coordinator that uses it.

For the details, see [Fetching data](/core/integrations/fetching-data/#keep-coordinator-data-across-restarts) and [core PR #173318](https://github.com/home-assistant/core/pull/173318).

---
title: Put common patterns in common modules
description: "Bronze rule common-modules: the coordinator lives in coordinator.py and the base entity in entity.py."
sidebarLabel: common-modules
sidebarGroup: Bronze
order: 4
---

This is a Bronze rule. In `quality_scale.yaml`, it is called `common-modules`.

Patterns that many integrations share live in the same module in every integration. The [coordinator](/glossary/coordinator/) goes in `coordinator.py`. A base entity class, shared by the entities of all platforms, goes in `entity.py`.

## Why it matters

Consistency makes core easier to work on. When every integration keeps its coordinator in `coordinator.py`, you know where to look in an integration you have never seen before. That helps reviewers, helps the next contributor, and helps you when you come back to your own code a year later.

A base entity also removes duplicated code: the device info, the naming, and the coordinator link are written once, instead of once per platform.

## Example

`coordinator.py` holds the coordinator:

```python
class MyCoordinator(DataUpdateCoordinator[MyData]):
    """Fetch data for My integration."""

    config_entry: MyConfigEntry

    def __init__(
        self, hass: HomeAssistant, entry: MyConfigEntry, client: MyClient
    ) -> None:
        """Initialize the coordinator."""
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name=DOMAIN,
            update_interval=timedelta(minutes=1),
        )
        self.client = client

    async def _async_update_data(self) -> MyData:
        """Fetch the latest data."""
        return await self.client.get_data()
```

`entity.py` holds the base entity that every platform builds on:

```python
class MyEntity(CoordinatorEntity[MyCoordinator]):
    """Base entity for My integration."""

    _attr_has_entity_name = True

    def __init__(self, coordinator: MyCoordinator) -> None:
        """Initialize the entity."""
        super().__init__(coordinator)
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, coordinator.data.serial)},
            name=coordinator.data.name,
        )
```

## How it is checked

- Pylint suggests moving a class to the module it belongs in (`home-assistant-enforce-class-module`). It flags a subclass of `DataUpdateCoordinator` outside `coordinator.py`, and a base entity that derives straight from a class like `Entity` or `CoordinatorEntity` outside `entity.py`. That second check skips the integrations that define an entity platform, like `light`, and a list of helpers, like `input_boolean`.
- The rest is checked in review.

## Exceptions

There are no exceptions to this rule. An integration without a coordinator or a base entity simply has nothing to move.


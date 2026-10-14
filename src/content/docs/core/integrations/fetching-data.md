---
title: Fetching data
description: Get data from your device or service with polling or push, and share it between entities with the data update coordinator.
sidebarGroup: Data and updates
order: 1
---

Your integration needs data from somewhere: an API on the local network, a cloud service, a socket, or a serial port on a USB stick. How you fetch it depends on what the API offers. This page helps you pick the right approach.

## Push or poll

APIs come in two kinds:

- **Push**: you subscribe, and the API tells you when something changes. This uses the fewest resources, and updates show up right away.
- **Poll**: you ask the API for the latest data at an interval. Changes show up at the next poll.

Use push when the API supports it. Set the [IoT class](/core/integrations/manifest/#iot_class) in your manifest to match.

## Poll once for all entities: the coordinator

Most APIs return data for many entities in one request. Then you want one poll for the whole integration, and all entities updated from its result. The `DataUpdateCoordinator` in `homeassistant.helpers.update_coordinator` does exactly that. It also handles errors, retries, and backing off, and makes your entities unavailable when updates fail.

Put the coordinator in `coordinator.py`:

```python
from datetime import timedelta
import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.helpers.update_coordinator import (
    DataUpdateCoordinator,
    UpdateFailed,
)

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

type ExampleConfigEntry = ConfigEntry[ExampleCoordinator]


class ExampleCoordinator(DataUpdateCoordinator[ExampleData]):
    """Fetch data for all Example entities."""

    config_entry: ExampleConfigEntry

    def __init__(
        self,
        hass: HomeAssistant,
        config_entry: ExampleConfigEntry,
        client: ExampleClient,
    ) -> None:
        """Initialize the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            config_entry=config_entry,
            name=DOMAIN,
            update_interval=timedelta(minutes=1),
        )
        self.client = client

    async def _async_setup(self) -> None:
        """Load data that only needs to be fetched once."""
        self.device = await self.client.get_device()

    async def _async_update_data(self) -> ExampleData:
        """Fetch the latest data."""
        try:
            return await self.client.get_data()
        except ExampleAuthError as err:
            raise ConfigEntryAuthFailed from err
        except ExampleRateLimitError as err:
            raise UpdateFailed(retry_after=err.retry_after) from err
        except ExampleError as err:
            raise UpdateFailed(
                translation_domain=DOMAIN,
                translation_key="update_error",
                translation_placeholders={"error": str(err)},
            ) from err
```

What the parts do:

- `config_entry`: always pass it. Integrations in core must.
- `update_interval`: how often to poll. The coordinator only polls while at least one entity listens.
- `_async_setup`: optional. Runs once, during the first refresh, for data you only need to load once.
- `_async_update_data`: fetches the data. Whatever it returns ends up in `coordinator.data`.

And what the exceptions do:

- `UpdateFailed`: the update failed. The coordinator logs it once (not on every failed poll), marks the entities unavailable, and tries again at the next interval. With `retry_after`, it waits that many seconds instead. During the first refresh, `retry_after` is passed on to the `ConfigEntryNotReady` that fails the setup, so the [setup retry](/core/integrations/setup-failures/) honors it.
- `ConfigEntryAuthFailed`: the credentials no longer work. The coordinator stops polling and starts [reauthentication](/core/integrations/reauth-reconfigure/#reauthentication).
- Timeouts and `aiohttp` client errors are handled by the coordinator itself, and so are the [OAuth 2.0 token errors](/core/integrations/oauth2/#errors).

### Do the first refresh during setup

Create the coordinator in `async_setup_entry`, and do the first refresh before you set up the platforms:

```python
coordinator = ExampleCoordinator(hass, entry, client)
await coordinator.async_config_entry_first_refresh()

entry.runtime_data = coordinator
```

If the first refresh fails, `async_config_entry_first_refresh` raises `ConfigEntryNotReady`, and Home Assistant [retries the setup](/core/integrations/setup-failures/). Your entities then always start with data. Call it only from `async_setup_entry`: in any other config entry state, it raises an error. If a failed first update should not stop the setup, call `await coordinator.async_refresh()` instead.

### Entities that use the coordinator

Extend `CoordinatorEntity`. It handles polling, availability, and listening to the coordinator for you. Read the values from `self.coordinator.data` in a property, like `native_value`:

```python
from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.update_coordinator import CoordinatorEntity


class ExampleSensor(CoordinatorEntity[ExampleCoordinator], SensorEntity):
    """A sensor of an Example device."""

    @property
    def native_value(self) -> float:
        """Return the temperature."""
        return self.coordinator.data.temperature
```

When new data arrives, the coordinator calls `_handle_coordinator_update`, which writes the state, and the property reads the new value. You can also override `_handle_coordinator_update` and set `_attr_native_value` there. If you do, set it in `__init__` from `coordinator.data` as well. The entity starts listening only after it is added, so the first refresh, which already happened during setup, never reaches `_handle_coordinator_update`. Without that, the sensor stays `unknown` until the next update. With `always_update=False` and data that does not change, that can take a long time.

After a command, ask for fresh data with `await self.coordinator.async_request_refresh()`. Requests are debounced, so many calls in a row lead to one update.

### Skip updates that change nothing

By default, the coordinator calls its listeners after every update, even if the data did not change. If your data can be compared with `==`, like a dataclass, pass `always_update=False`. The coordinator then only calls listeners when the data changed, which saves state writes.

### Only fetch what is used

Some APIs let you ask for less data. Pass a `context` to `CoordinatorEntity`, like a device ID, and use `self.async_contexts()` in the coordinator to see which contexts have listeners. Disabled entities do not listen, so you do not fetch their data.

## Push with a coordinator

A coordinator also works for push APIs. Leave out `update_interval`, so it never polls, and call `async_set_updated_data` when new data arrives:

```python
@callback
def _handle_push(self, data: ExampleData) -> None:
    """Handle new data pushed by the device."""
    self.async_set_updated_data(data)
```

If the coordinator also polls, this resets the time until the next poll.

## Push without a coordinator

When each entity has its own subscription, subscribe in `async_added_to_hass` and unsubscribe when the entity is removed. Entities can be disabled, so do not subscribe before they are added. Set `_attr_should_poll = False`, and write the state yourself when data arrives:

```python
class ExampleSwitch(SwitchEntity):
    """A switch that gets pushed updates."""

    _attr_should_poll = False

    async def async_added_to_hass(self) -> None:
        """Subscribe to updates."""
        self.async_on_remove(
            self._device.subscribe(self._handle_update)
        )

    @callback
    def _handle_update(self) -> None:
        """Write the new state."""
        self.async_write_ha_state()
```

`async_write_ha_state()` writes the current state right away. `async_schedule_update_ha_state(force_refresh=True)` calls your `async_update` first, then writes the state.

## Poll per entity

If each entity has its own endpoint, and one request maps to exactly one entity, you can fetch the data in the `async_update` method of the entity. Home Assistant calls it at an interval, as long as `should_poll` is `True` (the default).

- Pass `update_before_add=True` to `async_add_entities` if the entity needs data before it is added.
- Set the interval with a `SCAN_INTERVAL` constant in the platform, like `SCAN_INTERVAL = timedelta(seconds=30)`. Do not set it too low: it costs resources in Home Assistant, can overload the device, and can get users blocked by cloud APIs.

If several entities share one endpoint, use a coordinator instead.

## Parallel requests

Home Assistant limits how many updates and action calls run at the same time per platform, so integrations do not overload a device or API. Most integrations do not need to change anything here.

The limit is a semaphore per platform, and it applies to both entity updates and action calls. By default it is `1` when your entities have a synchronous `update` method, and `0` (no limit) otherwise, like for entities with an `async_update` method or no update method at all. Home Assistant decides this on the first entity the platform adds. Override it with a `PARALLEL_UPDATES` constant in the platform file:

```python
# Only one update or action call at a time on this device
PARALLEL_UPDATES = 1
```

Set it explicitly in every platform: that is a rule of the Silver tier of the [quality scale](/core/quality-scale/). A coordinator already centralizes the updates, so integrations that use one can set `PARALLEL_UPDATES = 0` for read-only platforms like `sensor` and `binary_sensor`. Then only action calls matter for the limit.

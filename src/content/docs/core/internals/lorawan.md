---
title: LoRaWAN devices
description: How a connection integration registers a LoRaWAN network server, and how a device integration finds and exposes the devices on it.
sidebarLabel: LoRaWAN
sidebarGroup: APIs
order: 35
---

LoRaWAN is a long-range, low-power radio protocol, used by battery-powered sensors that send a reading now and then. The devices do not talk to Home Assistant directly. They talk to a network server, like ChirpStack or The Things Stack, and Home Assistant talks to that server.

So LoRaWAN support comes in two kinds of integrations, connected by the shared `lorawan` integration:

- A **connection integration** sets up a network server and registers its connection with Home Assistant.
- A **device integration** supports the devices of one vendor. It finds them on every registered connection, and turns them into entities.

Both list `lorawan` in the `dependencies` of their [manifest](/core/integrations/manifest/#dependencies). Both build on [`lorawan-connection`](https://github.com/home-assistant-libs/lorawan-connection), a Python package maintained by the Home Assistant project. Like every integration, the code that talks to the server, and the code that decodes the payloads of a device, lives in a [library](/core/integrations/api-library/). The integration handles configuration, discovery, and entities.

## Connection integrations

### Implement the backend

The library of a connection integration implements the `Connection` protocol of `lorawan-connection`:

- `stack_type`: the namespace of the server, like `"chirpstack"` or `"tts"`. It is known before you connect.
- `async_subscribe(brands=..., listener=...)`: sends all matching devices to the listener first, then returns a function to unsubscribe, and keeps sending live device events after that. `brands` is a `frozenset` of `(stack, brand_id)` pairs. `None` selects all devices.
- `on_disconnect(listener)`: reports when the connection is lost, and returns a function to unsubscribe.
- `async_send_downlink(downlink)`: queues a command for a device, and returns its ID.

Every device the backend reports has a `DeviceDescriptor`. Set its `network_id` to the ID of the config entry of your connection integration. Set its `stack` to the `stack_type` of the connection, and fill in the `brand_id` and `model_id` the server knows the device by. Discovery and model selection match on those.

The [backend guide](https://home-assistant-libs.github.io/lorawan-connection/connection/adding-a-backend/) of the library covers the order of events, filtering, and downlinks.

### Register the connection

Connect to the server in `async_setup_entry`, then register the connection with `async_register_connection`:

```python
from lorawan_connection import Connection

from homeassistant.components import lorawan


async def async_register_server(
    hass: HomeAssistant, entry: MyConfigEntry, connection: Connection
) -> None:
    """Register a connected backend during setup of the entry."""
    unregister = await lorawan.async_register_connection(
        hass, entry, connection=connection
    )
    entry.async_on_unload(unregister)
```

Registration returns once the connection has sent its devices, and starts discovery for the ones a device integration matches. A config entry can register one connection at a time: a second one raises `ValueError`. The function it returns withdraws the connection. It does not close it.

The rest stays with your integration:

- If setup fails or is canceled, close the backend. Raise `ConfigEntryAuthFailed` when authentication fails, and `ConfigEntryNotReady` when the server cannot be reached for now. See [handling setup failures](/core/integrations/setup-failures/).
- When the connection is lost, `lorawan` withdraws it. Your integration reconnects, or reloads its config entry, and registers the new connection. Keep the same `network_id`, so the devices on it stay the same devices.
- On unload, and when Home Assistant stops, withdraw the registration and close the backend. Remove your own reconnect listeners before you close the backend on purpose, or closing it schedules a reload.

## Device integrations

### Get discovered

Add a `lorawan` key to your [manifest](/core/integrations/manifest/#lorawan) with the `(stack, brand_id)` pairs of your vendor. Your integration needs a [config flow](/core/integrations/config-flow/), and `lorawan` in its `dependencies`. Hassfest checks both.

When a connection reports a device that matches, Home Assistant starts your config flow with the `integration_discovery` source and a `LoRaWANDiscoveryInfo`, from `homeassistant.helpers.service_info.lorawan`. The discovery info has no fields: the flow only needs to know that a device of your vendor showed up. Only added devices start discovery. Updates and activity of devices do not.

Your integration needs one config entry, for the vendor, not one per device or per server. The device manager finds the devices on every connection, so the user does not pick a server. Use the domain of your integration as the unique ID, send both the user step and the discovery step to a step that asks for confirmation, and abort with `_abort_if_unique_id_configured()` when the entry exists.

The manifest matches on the brand, and selects your integration. Your library decides which models it supports. It has a `Device` subclass per model, which lists the `(brand_id, model_id)` per stack in its `identifiers`, and a `DeviceCollection` subclass that lists those models in `DEVICES`. See [writing a device library](https://home-assistant-libs.github.io/lorawan-connection/patterns/library/).

### Set up the device manager

`DeviceManager` does the bookkeeping. It creates a collection of your library for every connection, including connections that register later, and one coordinator for every device that matches a model. You give it a function that creates the collection from a `Connection`, and one that creates a coordinator from `hass` and a device.

In the examples, `ExampleDevice` and `ExampleDevices` stand for the classes of your device library. List that library in the `requirements` of your manifest.

```python title="__init__.py"
from example_lorawan import ExampleDevice, ExampleDevices

from homeassistant.components.lorawan import DeviceManager
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .coordinator import ExampleCoordinator

type ExampleConfigEntry = ConfigEntry[
    DeviceManager[ExampleDevice, ExampleCoordinator]
]

PLATFORMS = [Platform.SENSOR]


async def async_setup_entry(
    hass: HomeAssistant, entry: ExampleConfigEntry
) -> bool:
    """Set up the vendor integration."""
    manager = entry.runtime_data = DeviceManager(
        hass,
        entry,
        create_collection=ExampleDevices,
        create_coordinator=ExampleCoordinator,
    )
    entry.async_on_unload(manager.close)
    await manager.async_setup()

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    return True


async def async_unload_entry(
    hass: HomeAssistant, entry: ExampleConfigEntry
) -> bool:
    """Unload the vendor integration."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
```

### Share device updates

All entities of a device share its coordinator. The coordinator does not poll: it starts with the device as its data, and listens to the device for updates. No update interval, and no first refresh.

```python title="coordinator.py"
import logging
from typing import override

from example_lorawan import ExampleDevice

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator

_LOGGER = logging.getLogger(__name__)


class ExampleCoordinator(DataUpdateCoordinator[ExampleDevice]):
    """Share the updates of one device with its entities."""

    def __init__(self, hass: HomeAssistant, device: ExampleDevice) -> None:
        """Initialize the coordinator."""
        # The device manager shuts the coordinator down.
        super().__init__(
            hass, _LOGGER, config_entry=None, name=device.descriptor.name
        )
        self.async_set_updated_data(device)
        self._unsubscribe = device.add_update_listener(self._updated)

    @callback
    def _updated(self) -> None:
        self.async_set_updated_data(self.data)

    @override
    async def async_shutdown(self) -> None:
        self._unsubscribe()
        await super().async_shutdown()
```

Each platform asks the manager for coordinators with `subscribe_coordinator_added`. The listener gets the coordinators that exist right away, and every new one after that. Unsubscribe on unload:

```python title="sensor.py"
async def async_setup_entry(
    hass: HomeAssistant,
    entry: ExampleConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the sensors."""

    @callback
    def coordinator_added(coordinator: ExampleCoordinator) -> None:
        async_add_entities([ExampleSensor(coordinator)])

    entry.async_on_unload(
        entry.runtime_data.subscribe_coordinator_added(coordinator_added)
    )
```

### Entities and devices

Base your entities on `LoRaWANEntity`, together with the entity class of the platform. `LoRaWANEntity` is a [`CoordinatorEntity`](/core/integrations/fetching-data/) that gives you the device as `self.device`, and makes the entity unavailable when the device is closed. It sets `_attr_has_entity_name`, and its `async_update` does nothing, because updates come in through the device.

Describe the device in the `device_info` of your entities, and identify it with `device_identifier`:

```python title="entity.py"
from typing import override

from example_lorawan import ExampleDevice

from homeassistant.components.lorawan import (
    LoRaWANEntity,
    device_identifier,
)
from homeassistant.helpers.device_registry import DeviceInfo

from .const import DOMAIN


class ExampleEntity(LoRaWANEntity[ExampleDevice]):
    """Base entity for a device of this vendor."""

    @property
    @override
    def device_info(self) -> DeviceInfo:
        return DeviceInfo(
            identifiers={device_identifier(DOMAIN, self.device)},
            name=self.device.descriptor.name,
        )
```

The identifier is your domain, with the network ID and the DevEUI of the device. Two servers can each have a device with the same DevEUI, so put the network ID and the DevEUI in the unique IDs of your entities too, followed by the key of the measurement or channel.

Decoding payloads and encoding commands stays in your library. Entity properties read the state of the device, and entity actions call methods of the device. Turn a failed command into a [Home Assistant exception](/core/development/style/#error-handling).

### What the device manager handles

- When a connection is lost, the manager keeps the devices and their registry entries, and marks their coordinators as failed, so the entities become unavailable. When a new connection registers for the same config entry, it compares the devices. Devices that are still there keep their model and coordinator. Devices that are gone are removed.
- The manager has no timeout. A device that sends rarely stays available.
- When a device is removed from the server, or the config entry of its connection is deleted, the manager removes the device from the device registry and shuts down its coordinator. Its entities go with it.
- When your config entry unloads, the manager closes the collections and coordinators. It keeps the registry entries, and it does not touch the connections.

## Testing

`lorawan_connection.mock.MockConnection` stands in for a server in tests. Use it with the real collections of your library, to test the devices it reports, live updates, discovery, entities, removal, and unload. Cases worth a test:

- A connection that registers after your integration has loaded.
- Two connections with a device with the same DevEUI.
- A disconnect and a reconnect, including a device removed while the connection was down.
- Cleanup of the Home Assistant subscriptions and the collections when setup fails, is canceled, or Home Assistant stops.
- Cleanup of the device registry, including for a connection entry deleted while your integration was not loaded.

Test the decoding in your library, not in the integration. Test the backend of a connection integration on its own, against a real server: authentication, the list of devices, event delivery, downlinks, and closing the transport when setup fails, is canceled, or Home Assistant stops.

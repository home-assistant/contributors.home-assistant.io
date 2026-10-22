---
title: Config entries
description: How a config entry is set up, unloaded, removed, and migrated, and where your integration keeps its runtime data.
sidebarGroup: Setup and configuration
order: 1
---

A [config entry](/glossary/config-entry/) is one set-up instance of an integration, like one Hue bridge or one account. Home Assistant stores it, and sets it up again on every start. Users create config entries through the [config flow](/core/integrations/config-flow/) of your integration, and can change them later through [reconfiguration](/core/integrations/reauth-reconfigure/) or an [options flow](/core/integrations/options-flow/).

A config entry holds:

- `data`: the configuration needed to connect, like a host or an API token. It does not change during normal use.
- `options`: settings users can change, through the options flow.
- `subentries`: repeatable parts, like locations of a weather service. See [subentries](/core/integrations/subentries/).
- `unique_id`: what identifies the device or account, so it is not set up twice.
- `runtime_data`: whatever your integration needs while it runs. It is not stored.

## Lifecycle

A config entry is always in one of these states, from `homeassistant.config_entries.ConfigEntryState`:

| State | Meaning |
| --- | --- |
| `NOT_LOADED` | Not loaded. The state when a config entry is created, and when Home Assistant starts. |
| `SETUP_IN_PROGRESS` | Being set up |
| `LOADED` | Set up and running |
| `SETUP_ERROR` | Setup failed, and Home Assistant does not retry |
| `SETUP_RETRY` | Setup failed because something was not ready. Home Assistant retries with a growing delay, up to 10 minutes, or longer when the integration asks for it with `retry_after`. |
| `MIGRATION_ERROR` | The config entry needed a migration to a newer version, and it failed |
| `UNLOAD_IN_PROGRESS` | Being unloaded |
| `FAILED_UNLOAD` | Unloading failed or is not supported |

How your code ends up in `SETUP_ERROR` or `SETUP_RETRY` is described in [setup failures and exceptions](/core/integrations/setup-failures/).

## Set up a config entry

When Home Assistant starts, it first runs the normal setup of your integration (`async_setup`, if you have one). Then it calls `async_setup_entry` in your `__init__.py` for every config entry, except the ones the user disabled or ignored. When a user adds a new config entry, Home Assistant calls `async_setup_entry` for that one right away.

```python
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .coordinator import ExampleCoordinator

PLATFORMS = [Platform.SENSOR, Platform.SWITCH]

type ExampleConfigEntry = ConfigEntry[ExampleCoordinator]


async def async_setup_entry(
    hass: HomeAssistant, entry: ExampleConfigEntry
) -> bool:
    """Set up Example from a config entry."""
    client = ExampleClient(
        entry.data[CONF_HOST], session=async_get_clientsession(hass)
    )

    coordinator = ExampleCoordinator(hass, entry, client)
    await coordinator.async_config_entry_first_refresh()

    entry.runtime_data = coordinator

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    return True
```

### Keep runtime data in runtime_data

Store what your integration needs while it runs, like the API client or the [coordinator](/glossary/coordinator/), in `entry.runtime_data`. Type it with a type alias, like `ExampleConfigEntry` above, and use that alias everywhere you receive the entry. Your platforms then get a typed `runtime_data` for free.

Do not use `hass.data` for data that belongs to a config entry. `runtime_data` is cleaned up with the entry, and type checkers understand it.

### Set up the platforms

Forward the config entry to your [platforms](/glossary/platform/) with `async_forward_entry_setups`, after `runtime_data` is set. Each platform then gets its own `async_setup_entry`, which adds the entities:

```python
from homeassistant.helpers.entity_platform import (
    AddConfigEntryEntitiesCallback,
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ExampleConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the Example sensors."""
    coordinator = entry.runtime_data

    async_add_entities(
        ExampleSensor(coordinator, description)
        for description in SENSORS
    )
```

## Unload a config entry

Support unloading, so users can reload or disable an entry without restarting Home Assistant. Implement `async_unload_entry`, unload the platforms you forwarded to, and clean up anything else, like connections and listeners. Home Assistant sets the state to `UNLOAD_IN_PROGRESS` before it calls this function.

```python
async def async_unload_entry(
    hass: HomeAssistant, entry: ExampleConfigEntry
) -> bool:
    """Unload a config entry."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
```

Most cleanup does not need its own code. Register it while setting up, and Home Assistant runs it when the entry unloads:

```python
entry.async_on_unload(client.disconnect)
entry.async_on_unload(
    async_track_time_interval(hass, refresh_token, timedelta(hours=1))
)
```

To clean up after an entity, implement `async_will_remove_from_hass` on the [entity](/core/entities/).

## Remove a config entry

If something needs to happen when a user deletes the config entry, like removing a webhook at the service, implement `async_remove_entry`. The entry is already gone from `hass.config_entries` when it runs.

```python
async def async_remove_entry(
    hass: HomeAssistant, entry: ExampleConfigEntry
) -> None:
    """Handle removal of an entry."""
```

You do not need `async_remove_entry` to clean up the devices and entities of the entry, or the [repair issues that belong to it](/core/integrations/repairs/#issues-that-belong-to-a-config-entry). Home Assistant removes them for you.

## Change a config entry

Never change the attributes of a `ConfigEntry` directly. Call `async_update_entry` instead. It saves the change, and tells everything that listens:

```python
hass.config_entries.async_update_entry(
    entry, data={**entry.data, CONF_HOST: new_host}
)
```

To reload an entry, for example after a change, call `hass.config_entries.async_schedule_reload(entry.entry_id)`.

## Migrate a config entry

When the data you store in a config entry changes shape, bump the version of your config flow and migrate old entries. Each config entry has a major `VERSION` and a `MINOR_VERSION`, which both default to `1`.

- A **minor** version bump is backwards compatible. Only add things that older code can ignore, like a new key with a default. If only the minor version differs, Home Assistant sets up the entry even without a migration. Users who go back to an older Home Assistant version can keep using it.
- A **major** version bump is not. Use it when older code can no longer read the entry, like a renamed or removed key. An older Home Assistant version cannot set up the migrated entry, unless the user restores a backup.

Set the new versions on your config flow:

```python
class ExampleConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Example."""

    VERSION = 2
    MINOR_VERSION = 2
```

Then implement `async_migrate_entry` in `__init__.py`. Home Assistant calls it before setup when the stored major version is older than your config flow's, or when the major version is the same and the minor version differs. That includes a _newer_ minor version, left behind when a user downgrades Home Assistant. So check the version before each step, and leave entries you don't know alone. An entry with a newer major version than your config flow fails to set up without calling your code.

In this example, version 2 renamed `ip_address` to `host`, which older code can't read, so it is a major bump. Version 2.2 added a port, which older code ignores, so it is a minor bump:

```python
async def async_migrate_entry(
    hass: HomeAssistant, entry: ExampleConfigEntry
) -> bool:
    """Migrate an old config entry."""
    if entry.version == 1:
        data = {**entry.data}
        data[CONF_HOST] = data.pop("ip_address")
        hass.config_entries.async_update_entry(
            entry, data=data, version=2, minor_version=1
        )

    if entry.version == 2 and entry.minor_version < 2:
        hass.config_entries.async_update_entry(
            entry,
            data={**entry.data, CONF_PORT: DEFAULT_PORT},
            minor_version=2,
        )

    return True
```

An entry stored as 2.3 by a newer Home Assistant version passes through both checks untouched, and sets up as it is.

What your migration returns or raises decides what happens next:

| Result | What happens |
| --- | --- |
| Returns `True` | Migration succeeded, setup continues |
| Returns `False` | Setup stops, the entry goes to `MIGRATION_ERROR` |
| Raises `ConfigEntryNotReady` | Setup stops, Home Assistant retries later |
| Raises `ConfigEntryError` or any other exception | Setup stops, the entry goes to `MIGRATION_ERROR` |

Prefer raising `ConfigEntryNotReady` or `ConfigEntryError` over returning `False`. Both support translations, so you can tell the user what went wrong.

`MIGRATION_ERROR` does not recover by itself. If the user can fix the cause, create a [repair](/core/integrations/repairs/), and call `hass.config_entries.async_retry_migration(entry_id)` from the repair flow once it is fixed.

## Follow state changes

To get notified when an entry changes state, for example from `LOADED` to `UNLOAD_IN_PROGRESS`, register a callback with `async_on_state_change`. It returns a function that removes the listener, so you can listen until the entry unloads:

```python
entry.async_on_unload(entry.async_on_state_change(notify_me))
```

## Background tasks

Start long running tasks that belong to a config entry with `entry.async_create_background_task(hass, coroutine, name)`. Home Assistant cancels them when the entry unloads, so they never outlive the entry.

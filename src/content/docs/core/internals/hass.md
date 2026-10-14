---
title: The hass object in Python
description: The HomeAssistant instance that every integration gets, what hangs off it, and the core configuration on hass.config.
sidebarLabel: The hass object
sidebarGroup: The core
order: 1
---

Read any integration and you see a variable called `hass` everywhere. It is the running Home Assistant instance, an object of the class `HomeAssistant` from `homeassistant/core.py`. Everything your code does with the rest of the system goes through it.

## What hangs off hass

| Attribute | What it is |
| --- | --- |
| `hass.bus` | The [event bus](/core/internals/events/). Fire events and listen for them. |
| `hass.states` | The [state machine](/core/internals/states/). Read and write the state of entities. |
| `hass.services` | The [action registry](/core/internals/actions/). Register and call actions. The name is older than the word "action". |
| `hass.config` | The core configuration: location, units, time zone, language, and paths. See [below](#the-core-configuration). |
| `hass.config_entries` | The config entries of all integrations. |
| `hass.auth` | The [auth manager](/core/internals/auth/): users, groups, and tokens. |
| `hass.data` | A dictionary for data that is shared across the instance. Use a typed `HassKey` from `homeassistant.util.hass_dict` as the key. Data that belongs to one config entry goes in `entry.runtime_data` instead. |
| `hass.loop` | The asyncio event loop everything runs on. |
| `hass.state` | Where Home Assistant is in its life: a `CoreState`, like `CoreState.starting`, `CoreState.running`, or `CoreState.stopping`. |

Next to these, `hass` has the methods to schedule work: `async_create_task`, `async_create_background_task`, and `async_add_executor_job`. [Async in Home Assistant](/core/internals/asyncio/) explains when to use which.

## The four parts of core

Underneath, core is a small machine with four parts:

- The **event bus** carries everything that happens. Other parts fire events on it, and anything can listen.
- The **state machine** holds the current state of every entity, and fires a `state_changed` event when one changes.
- The **action registry** holds every action an integration registered. Calling an action fires a `call_service` event, then runs the handler.
- The **configuration** describes the instance: where it is, which units it uses, and what is loaded.

Everything else, from entities to automations, is built on top of these as helpers and integrations.

## Where you get hass from

You never create `hass` yourself. Home Assistant hands it to you:

- **Integration setup**: `async_setup_entry(hass, entry)` in `__init__.py` gets it when a config entry is set up. Integrations that also set up something at startup get it in `async_setup(hass, config)`.
- **Platforms**: `async_setup_entry(hass, entry, async_add_entities)` in a platform file, like `sensor.py`.
- **Entities**: `self.hass`, once the entity has been added to Home Assistant. It is not set yet in `__init__`.
- **Config flows** and **options flows**: `self.hass`.
- **Action handlers**: `call.hass` on the `ServiceCall`.

For how an integration is put together around these entry points, see [building integrations](/core/integrations/).

## The core configuration

`hass.config` is an instance of `Config` from `homeassistant/core_config.py`. The user sets most of it under **Settings** > **System** > **General**. Read it, do not write it: core owns these values and stores them for you.

| Attribute | Type | Description |
| --- | --- | --- |
| `latitude` | `float` | Latitude of the home. |
| `longitude` | `float` | Longitude of the home. |
| `elevation` | `int` | Elevation of the home, always in meters. |
| `radius` | `int` | Radius of the home zone, always in meters. |
| `location_name` | `str` | Name of the instance. Defaults to `Home`. |
| `time_zone` | `str` | Time zone name, like `Europe/Amsterdam`. |
| `units` | `UnitSystem` | The unit system, metric or US customary. |
| `currency` | `str` | Currency code, like `EUR`. |
| `country` | `str \| None` | Country code of the home, if set. |
| `language` | `str` | Language of the instance, like `en`. |
| `internal_url` | `str \| None` | URL the user configured for the local network. |
| `external_url` | `str \| None` | URL the user configured for outside the network. |
| `config_dir` | `str` | Path of the configuration directory. |
| `api` | `ApiConfig \| None` | Configuration of the HTTP server, once the `http` integration has set it up. |
| `components` | `set[str]` | Integrations that are loaded. |
| `config_source` | `ConfigSource` | Where the configuration comes from: `default`, `discovered`, `storage` (set in the UI), or `yaml`. |
| `allowlist_external_dirs` | `set[str]` | Folders integrations may read files from. |
| `allowlist_external_urls` | `set[str]` | URLs integrations may fetch files from. |
| `media_dirs` | `dict[str, str]` | Media folders, by name. |
| `skip_pip` | `bool` | If `True`, requirements are not installed at startup. |
| `skip_pip_packages` | `list[str]` | Packages to skip when installing requirements. |
| `recovery_mode` | `bool` | Whether Home Assistant runs in recovery mode. |
| `safe_mode` | `bool` | Whether Home Assistant runs in safe mode, without custom integrations. |
| `debug` | `bool` | Whether debug mode is on. |

A few helper methods are worth knowing:

- `hass.config.path("my_file.json")` returns a path inside the configuration directory.
- `hass.config.cache_path("my_cache")` returns a path in the cache directory, for data that can be regenerated and does not belong in backups.
- `hass.config.is_allowed_path(path)` and `hass.config.is_allowed_external_url(url)` check against the allowlists. Use them before you touch a path or URL that came from a user. `is_allowed_path` does blocking I/O: call it in the executor with `hass.async_add_executor_job`, not in the event loop.
- `hass.config.distance(lat, lon)` returns the distance from the home, in the length unit of the unit system (kilometers or miles).

Do not read the URLs directly to build a link. Use `get_url(hass)` from `homeassistant.helpers.network`: it picks the right URL for the situation and knows about Home Assistant Link.

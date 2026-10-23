---
title: Config entry functions now return None
description: async_setup_entry, async_unload_entry, and async_migrate_entry return None in core now. What changes, and what it means for custom integrations.
date: 2026-10-23
authors:
  - G Johansson
areas:
  - core
---

The config entry functions in the `__init__.py` of an integration, `async_setup_entry`, `async_unload_entry`, and `async_migrate_entry`, now return `None` instead of a boolean. They either succeed, or raise one of the `ConfigEntry*` exceptions. Starting with Home Assistant 2026.11.0, core integrations must follow the new pattern. Custom integrations can keep returning a boolean.

## Why

Returning `True` or `False` dates back to the first days of config entries. An integration logged a problem, swallowed the exception, and returned `False`. Home Assistant then knew the setup failed, but not why, and neither did the user.

Since then, `ConfigEntryNotReady`, `ConfigEntryAuthFailed`, and `ConfigEntryError` took over that job. They support translations, decide whether Home Assistant retries or starts reauthentication, and show the user what went wrong. Almost every integration already raised them, and only ended with `return True` because the type hints asked for it. The [architecture discussion](https://github.com/home-assistant/architecture/discussions/1463) has the full background.

## What changed in core

All core integrations now return `None` from these functions. A `return False` became a raised `ConfigEntryError`, and the Pylint type hint checker requires `-> None`. When a core integration returns a boolean anyway, Home Assistant reports it as an error, and the setup, unload, or migration fails.

Setting up looks like this:

```python
async def async_setup_entry(
    hass: HomeAssistant, entry: ExampleConfigEntry
) -> None:
    """Set up Example from a config entry."""
    coordinator = ExampleCoordinator(hass, entry)
    await coordinator.async_config_entry_first_refresh()
    entry.runtime_data = coordinator

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
```

For unloading, use the new `async_unload_platforms_or_raise`. It raises a translated `ConfigEntryError` when a platform fails to unload, instead of returning `False`:

```python
async def async_unload_entry(
    hass: HomeAssistant, entry: ExampleConfigEntry
) -> None:
    """Unload a config entry."""
    await hass.config_entries.async_unload_platforms_or_raise(entry, PLATFORMS)
```

The scaffold templates generate this pattern for new integrations.

## Tests

When you patch `async_setup_entry` of a core integration in a test, for example in the `mock_setup_entry` fixture of your config flow tests, return `None` instead of `True`:

```python
@pytest.fixture
def mock_setup_entry() -> Generator[AsyncMock]:
    """Override async_setup_entry."""
    with patch(
        "homeassistant.components.example.async_setup_entry",
        return_value=None,
    ) as mock_setup_entry:
        yield mock_setup_entry
```

With `return_value=True`, the patched function returns a boolean, and the setup of the entry fails.

## Custom integrations

Nothing breaks for custom integrations, and there is no deprecation. Returning a boolean stays supported:

- `True` means success, as before.
- `False` now becomes a `ConfigEntryError` with a generic, translated message, like "Failed to set up the config entry." The entry ends in the same state as before: `SETUP_ERROR`, `FAILED_UNLOAD`, or `MIGRATION_ERROR`. The difference is that the user now sees a reason.

Still, consider switching. Raise your own exception with a translated message, and users see what actually went wrong instead of the generic message.

Read more in the [config entries documentation](/core/integrations/config-entries/), and in [setup failures and exceptions](/core/integrations/setup-failures/).

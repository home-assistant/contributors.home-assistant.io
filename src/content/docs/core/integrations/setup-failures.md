---
title: Setup failures and exceptions
description: Retry setup when a device is offline, start reauthentication when credentials fail, and raise the right exceptions in actions.
sidebarLabel: Setup failures and exceptions
sidebarGroup: Setup and configuration
order: 9
---

Devices go offline, services have outages, and passwords expire. Your integration has to recover from that by itself, as soon as the problem is gone, without the user restarting Home Assistant. You do not write retry loops for that: you raise the right exception, and Home Assistant does the rest.

## During setup

Raise these from `async_setup_entry` in `__init__.py`:

| Exception | Use it when | What Home Assistant does |
| --- | --- | --- |
| `ConfigEntryNotReady` | The device or service is offline or not ready yet | Puts the entry in `SETUP_RETRY`, and retries with a growing delay, up to 10 minutes |
| `ConfigEntryAuthFailed` | The credentials no longer work | Puts the entry in `SETUP_ERROR`, and starts a [reauthentication flow](/core/integrations/reauth-reconfigure/#reauthentication) |
| `ConfigEntryError` | Something is wrong that a retry will not fix | Puts the entry in `SETUP_ERROR`, and does not retry |

All three live in `homeassistant.exceptions`.

```python
from homeassistant.exceptions import (
    ConfigEntryAuthFailed,
    ConfigEntryNotReady,
)


async def async_setup_entry(
    hass: HomeAssistant, entry: ExampleConfigEntry
) -> bool:
    """Set up Example from a config entry."""
    client = ExampleClient(entry.data[CONF_HOST], entry.data[CONF_TOKEN])

    try:
        await client.connect()
    except ExampleAuthError as err:
        raise ConfigEntryAuthFailed(
            translation_domain=DOMAIN,
            translation_key="invalid_auth",
        ) from err
    except ExampleConnectionError as err:
        raise ConfigEntryNotReady(
            translation_domain=DOMAIN,
            translation_key="cannot_connect",
            translation_placeholders={"host": entry.data[CONF_HOST]},
        ) from err
    ...
```

Raise them from `async_setup_entry` of the integration itself. A platform's `async_setup_entry` runs too late: when it raises `ConfigEntryNotReady`, `ConfigEntryAuthFailed`, or `ConfigEntryError`, Home Assistant only logs an error and skips that platform. It does not retry, and it does not start reauthentication.

If you use a [data update coordinator](/core/integrations/fetching-data/), `await coordinator.async_config_entry_first_refresh()` raises `ConfigEntryNotReady` for you when the first update fails, and an `ConfigEntryAuthFailed` from the coordinator starts reauthentication at any time, not only during setup.

If your integration supports discovery, Home Assistant also retries as soon as it discovers the device again. When setup fails while Home Assistant is still starting, the retry waits until startup has finished.

### The message

The message of the exception shows up on the page of the integration, so users know what is going on. Use a translated message, as in the example above, with the text in the `exceptions` section of `strings.json`:

```json
{
  "exceptions": {
    "cannot_connect": {
      "message": "Could not connect to the Example device at {host}."
    },
    "invalid_auth": {
      "message": "The token of your Example account is no longer valid."
    }
  }
}
```

If you do not give a message, Home Assistant takes the message of the exception that caused it, when you raise it `from` another exception.

Do not log the problem yourself. Home Assistant logs the retry, and a log full of the same warning helps nobody.

### Wait before retrying

If the device or service says when it is available again, like a rate limit reset or a `Retry-After` header, pass the number of seconds as `retry_after`. Home Assistant uses it for the next attempt when it is longer than the normal delay, up to one day:

```python
except ExampleRateLimitError as err:
    raise ConfigEntryNotReady(
        translation_domain=DOMAIN,
        translation_key="rate_limited",
        retry_after=err.retry_after,
    ) from err
```

## Platforms set up from YAML

Integrations that set up platforms from YAML, with `async_setup_platform`, raise `PlatformNotReady` instead. Home Assistant then retries the platform setup. It logs the first retry as a warning, and later ones at debug level.

## Exceptions in actions and entity methods

When an action fails, the user sees the error in the UI, in the automation trace, or in the script that called it. Raise the exception that matches what went wrong:

| Exception | Use it when |
| --- | --- |
| `ServiceValidationError` | The user did something wrong, like an invalid combination of values |
| `HomeAssistantError` | Something else failed, like the device not responding |

The difference is in what the caller gets back. The WebSocket API, which the frontend uses, reports a `service_validation_error` or a `home_assistant_error`, and the REST API answers with status 400 or 500. Neither is logged with a stack trace at the default log level.

Raise `ServiceValidationError` instead of `ValueError`. These rules apply to [actions](/core/integrations/actions/) and to entity methods called by actions, like `async_turn_on` or `async_set_hvac_mode`.

```python
from homeassistant.exceptions import HomeAssistantError


async def async_turn_on(self, **kwargs: Any) -> None:
    """Turn the switch on."""
    try:
        await self.coordinator.client.turn_on()
    except ExampleConnectionError as err:
        raise HomeAssistantError(
            translation_domain=DOMAIN,
            translation_key="communication_error",
            translation_placeholders={"error": str(err)},
        ) from err
```

`HomeAssistantError` and all exceptions that extend it accept `translation_domain`, `translation_key`, and `translation_placeholders`. Translated messages show up in the language of the user. Translated exceptions are a rule of the Gold tier of the [quality scale](/core/quality-scale/).

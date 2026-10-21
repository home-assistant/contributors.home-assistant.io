---
title: Check the connection during setup
description: "Bronze rule test-before-setup: setup checks that it works, and raises the right exception when it does not."
sidebarLabel: test-before-setup
sidebarGroup: Bronze
order: 19
---

This is a Bronze rule. In `quality_scale.yaml`, it is called `test-before-setup`.

When a config entry is set up, `async_setup_entry` must check that the integration can work, and raise the right exception when it cannot:

- `ConfigEntryNotReady` when the problem is temporary, like a device that is offline. Home Assistant retries the setup later.
- `ConfigEntryAuthFailed` when the credentials are wrong or expired. Home Assistant starts the reauthentication flow, if the integration has one.
- `ConfigEntryError` when the problem will not go away by itself, like a closed account. Home Assistant does not retry.

## Why it matters

These exceptions are how the user finds out that something is wrong. The integration card in **Settings** > **Devices & services** shows that the entry failed to set up, and why, instead of entities that silently never get a value. Home Assistant also handles the retry for you, with a backoff, so you do not have to write that yourself.

## Example

Map the exceptions of the library to the setup exceptions:

```python
async def async_setup_entry(hass: HomeAssistant, entry: MyConfigEntry) -> bool:
    """Set up My integration from a config entry."""
    client = MyClient(entry.data[CONF_HOST])

    try:
        await client.connect()
    except MyConnectionError as err:
        raise ConfigEntryNotReady(
            translation_domain=DOMAIN,
            translation_key="cannot_connect",
        ) from err
    except MyAuthenticationError as err:
        raise ConfigEntryAuthFailed(
            translation_domain=DOMAIN,
            translation_key="invalid_auth",
        ) from err

    entry.runtime_data = client
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True
```

You often get this for free. `await coordinator.async_config_entry_first_refresh()` raises `ConfigEntryNotReady` when the first update of a [coordinator](/glossary/coordinator/) fails, and `ConfigEntryAuthFailed` and `ConfigEntryError` raised by the update pass through. `await session.async_ensure_token_valid()` on an OAuth2 session raises the right exception when the token cannot be refreshed.

Do not log the error yourself before raising: Home Assistant already reports these exceptions, and for `ConfigEntryNotReady` it would log on every retry.

### Devices that are often offline

Some devices are offline on purpose, like a solar inverter at night or a TV in standby. Raising `ConfigEntryNotReady` and letting Home Assistant retry is usually still the simplest approach. But you can also finish the setup without reaching the device. Refresh the coordinator with `await coordinator.async_refresh()`, which does not raise, and the entities stay unavailable until the device answers. A `ConfigEntryAuthFailed` raised by the update method still starts the reauthentication flow. Until then, `coordinator.data` is still `None`, so code that reads it while setting up the platforms has to handle that. Fetch anything you could not get during setup, like device information, once the device is back. Errors that are not temporary, like wrong credentials or a closed account, must still be reported during setup when they are detected.

## How it is checked

- Hassfest, when the rule is `done`: `async_setup_entry` must await `async_config_entry_first_refresh` or `async_ensure_token_valid`, or the integration must raise `ConfigEntryNotReady`, `ConfigEntryAuthFailed`, or `ConfigEntryError` somewhere in its code.
- Pylint: `home-assistant-log-and-raise` warns when an error is logged at warning level or higher and then raised.
- Whether the right exception is raised for each failure is checked in review.

## Exceptions

If the integration cannot check its configuration during setup, or it only does local calculations, this rule does not apply.

## Related rules

- [runtime-data](/core/quality-scale/runtime-data/): store runtime data in runtime_data.
- [entity-unavailable](/core/quality-scale/entity-unavailable/): mark entities unavailable when appropriate.

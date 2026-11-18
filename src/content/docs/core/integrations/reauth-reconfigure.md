---
title: Reauthentication and reconfiguration
description: Let users fix expired credentials and change connection details of an existing config entry, without removing and adding it again.
sidebarLabel: Reauth and reconfigure
sidebarGroup: Setup and configuration
order: 6
---

Things change after setup. A password expires, a token gets revoked, a device moves to a new IP address. Two special steps of your config flow handle that, and both update the existing config entry instead of creating a new one:

- **Reauthentication** (`reauth`) fixes credentials. Home Assistant starts it when your integration reports that authentication failed.
- **Reconfiguration** (`reconfigure`) changes other setup data, like a host. Users start it from the menu of the config entry.

Neither is for options. Settings that change how the integration behaves belong in an [options flow](/core/integrations/options-flow/).

Both are rules of the [quality scale](/core/quality-scale/): reauthentication is part of Silver, reconfiguration of Gold.

## Reauthentication

### Start it

Raise `ConfigEntryAuthFailed` when your credentials no longer work, from `async_setup_entry` or from the `_async_update_data` of your [coordinator](/core/integrations/fetching-data/). Home Assistant puts the entry in an error state and starts a [reauthentication](/glossary/reauthentication/) flow. Raised anywhere else, it does not start the flow.

```python
async def async_setup_entry(
    hass: HomeAssistant, entry: ExampleConfigEntry
) -> None:
    """Set up Example from a config entry."""
    client = ExampleClient(entry.data[CONF_TOKEN])

    try:
        await client.login()
    except ExampleAuthError as err:
        raise ConfigEntryAuthFailed(
            translation_domain=DOMAIN,
            translation_key="invalid_token",
        ) from err
    ...
```

Without a coordinator, you can also start the flow yourself with `entry.async_start_reauth(hass)`.

### Handle it

The flow starts at `async_step_reauth`, with the data of the config entry. Show a form, check the new credentials, and update the existing entry:

```python
from collections.abc import Mapping

from homeassistant.config_entries import ConfigFlowResult


async def async_step_reauth(
    self, entry_data: Mapping[str, Any]
) -> ConfigFlowResult:
    """Start reauthentication."""
    return await self.async_step_reauth_confirm()


async def async_step_reauth_confirm(
    self, user_input: dict[str, Any] | None = None
) -> ConfigFlowResult:
    """Ask for a new token."""
    errors: dict[str, str] = {}

    if user_input is not None:
        try:
            account = await validate_token(user_input[CONF_TOKEN])
        except ExampleAuthError:
            errors["base"] = "invalid_auth"
        else:
            await self.async_set_unique_id_or_abort(account.id)

            return self.async_update_reload_and_abort(
                self._get_reauth_entry(),
                data_updates=user_input,
            )

    return self.async_show_form(
        step_id="reauth_confirm",
        data_schema=probatio.Schema({probatio.Required(CONF_TOKEN): str}),
        errors=errors,
    )
```

A few things happen here:

- `self._get_reauth_entry()` returns the config entry that needs new credentials. `self.source == SOURCE_REAUTH` tells you that you are in a reauthentication flow.
- `async_set_unique_id_or_abort` makes sure the user logs in to the same account, not a different one. In a reauthentication flow, it aborts with `unique_id_mismatch` when the account differs.
- `async_update_reload_and_abort` merges `data_updates` into the entry data, reloads the entry, and aborts the flow with `reauth_successful`. Pass `reload_even_if_entry_is_unchanged=False` to only reload when something changed.

Add the step to `strings.json`, using the shared title:

```json
{
  "config": {
    "step": {
      "reauth_confirm": {
        "title": "[%key:common::config_flow::title::reauth%]",
        "description": "The token for your Example account no longer works.",
        "data": {
          "token": "[%key:common::config_flow::data::api_token%]"
        }
      }
    }
  }
}
```

The `reauth_successful` and `reconfigure_successful` abort messages come from Home Assistant itself, so they do not go in your `strings.json`. Only a custom abort reason, passed as `reason`, needs its own string. Add the `unique_id_mismatch` abort reason, though, for when the user logs in to a different account.

For OAuth 2.0, reauthentication sends the user through the login of the service again. See [OAuth 2.0](/core/integrations/oauth2/#reauthentication).

### Test it

Automated tests must check that the flow updates the existing entry, and does not create a new one. A reauthentication or reconfiguration flow that calls `async_create_entry` raises an error.

To try it by hand, stop Home Assistant, edit the stored credentials in `config/.storage/core.config_entries` (on a copy of your configuration), and start it again. For OAuth 2.0, change `access_token`, `refresh_token`, or `expires_at`.

## Reconfiguration

Add an `async_step_reconfigure` to let users change setup data of an entry, like the host. Users find **Reconfigure** in the menu of the config entry as soon as the step exists.

```python
async def async_step_reconfigure(
    self, user_input: dict[str, Any] | None = None
) -> ConfigFlowResult:
    """Change the host of an existing entry."""
    errors: dict[str, str] = {}
    entry = self._get_reconfigure_entry()

    if user_input is not None:
        try:
            device = await get_device(self.hass, user_input[CONF_HOST])
        except ExampleConnectionError:
            errors["base"] = "cannot_connect"
        else:
            await self.async_set_unique_id_or_abort(device.serial_number)

            return self.async_update_reload_and_abort(
                entry, data_updates=user_input
            )

    return self.async_show_form(
        step_id="reconfigure",
        data_schema=self.add_suggested_values_to_schema(
            STEP_USER_SCHEMA, entry.data
        ),
        errors=errors,
    )
```

It works the same way as reauthentication: `self._get_reconfigure_entry()` returns the entry, `self.source == SOURCE_RECONFIGURE` tells you where you are, the unique ID check makes sure it is still the same device, and the flow ends with `reconfigure_successful`.

Many integrations share the code of the `user` step and the `reconfigure` step, and check `self.source` to decide whether to create or update the entry.

## Update without reloading

If your integration picks up the change by itself, use `async_update_and_abort` instead. It takes the same arguments, except `reload_even_if_entry_is_unchanged`, and does not reload the entry.

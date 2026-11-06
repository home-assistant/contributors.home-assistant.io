---
title: Reauthenticate from the UI
description: "Silver rule reauthentication-flow: the integration asks for new credentials when the old ones stop working."
sidebarLabel: reauthentication-flow
sidebarGroup: Silver
order: 9
---

This is a Silver rule. In `quality_scale.yaml`, it is called `reauthentication-flow`.

When the credentials of the integration stop working, the integration must start a [reauthentication](/glossary/reauthentication/) flow. In that flow, users enter new credentials, the integration tests them, and the existing [config entry](/glossary/config-entry/) is updated and reloaded.

## Why it matters

People change passwords and forget that Home Assistant still uses the old one, and API tokens expire. Users can fix that themselves, with a reconfigure flow if the integration has one, but first they have to notice the error, understand it, and find where to enter the new credentials.

A reauthentication flow takes those steps away: the integration asks for new credentials as soon as the old ones stop working. It shows up under **Settings** > **Devices & services** as needing attention, the user enters the new password, and everything keeps working as before.

## Example

The reauthentication flow starts when the integration raises `ConfigEntryAuthFailed`, during setup or in a coordinator update. See [test-before-setup](/core/quality-scale/test-before-setup/). It then runs `async_step_reauth` in the config flow:

```python
class MyConfigFlow(ConfigFlow, domain=DOMAIN):
    """Config flow for My integration."""

    async def async_step_reauth(
        self, entry_data: Mapping[str, Any]
    ) -> ConfigFlowResult:
        """Start reauthentication after an authentication error."""
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Ask for a new API token."""
        errors: dict[str, str] = {}
        if user_input is not None:
            entry = self._get_reauth_entry()
            client = MyClient(
                entry.data[CONF_HOST], user_input[CONF_API_TOKEN]
            )
            try:
                account_id = await client.get_account_id()
            except MyAuthError:
                errors["base"] = "invalid_auth"
            except MyConnectionError:
                errors["base"] = "cannot_connect"
            else:
                await self.async_set_unique_id(account_id)
                self._abort_if_unique_id_mismatch(reason="wrong_account")
                return self.async_update_reload_and_abort(
                    entry, data_updates=user_input
                )

        return self.async_show_form(
            step_id="reauth_confirm",
            data_schema=probatio.Schema(
                {probatio.Required(CONF_API_TOKEN): str}
            ),
            errors=errors,
        )
```

A few details matter here:

- The flow tests the new credentials before it saves them, just like the config flow does.
- `_abort_if_unique_id_mismatch` stops users from logging in with a different account by accident, which would swap the data behind all their entities.
- `async_update_reload_and_abort` updates the entry, reloads it, and ends the flow with the `reauth_successful` reason.

## How it is checked

- Pylint, when the rule is `done`: `config_flow.py` must implement `async_step_reauth` (`home-assistant-missing-reauthentication-flow`).
- The tests of the reauthentication flow count toward [config-flow-test-coverage](/core/quality-scale/config-flow-test-coverage/), and Codecov requires every changed line of `config_flow.py` to be covered.
- The rest is checked in review.

## Exceptions

If the integration does not need any form of authentication, this rule does not apply.

## Related rules

- [config-flow](/core/quality-scale/config-flow/): set up from the UI with a config flow.
- [test-before-configure](/core/quality-scale/test-before-configure/): test the connection in the config flow.
- [config-flow-test-coverage](/core/quality-scale/config-flow-test-coverage/): test the config flow fully.
- [test-before-setup](/core/quality-scale/test-before-setup/): check the connection during setup.
- [reconfiguration-flow](/core/quality-scale/reconfiguration-flow/): reconfigure from the UI.

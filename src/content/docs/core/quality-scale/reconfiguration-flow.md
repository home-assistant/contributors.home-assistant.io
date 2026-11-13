---
title: Reconfigure from the UI
description: "Gold rule reconfiguration-flow: users can change the setup of an entry without removing it."
sidebarLabel: reconfiguration-flow
sidebarGroup: Gold
order: 19
---

This is a Gold rule. In `quality_scale.yaml`, it is called `reconfiguration-flow`.

The config flow has a [reconfigure step](/glossary/reconfigure-flow/): `async_step_reconfigure`. It lets users change what they entered during setup, like the host of a device, from the menu of the integration entry, without removing it and setting it up again.

## Why it matters

Things change. A device gets a new IP address, a user moves a service to another server. Ideally, Home Assistant notices and asks the user to act, through discovery or reauthentication. That is not always possible. The reconfigure flow gives users a way to fix it themselves, and keep their entities, their history, and their automations.

Removing and adding an integration again loses all customization of its entities. Nobody should have to do that for a new IP address.

## Example

The reconfigure step tests the new input, makes sure it is still the same device or account, and updates the entry:

```python
async def async_step_reconfigure(
    self, user_input: dict[str, Any] | None = None
) -> ConfigFlowResult:
    """Handle reconfiguration of the integration."""
    errors: dict[str, str] = {}
    if user_input is not None:
        client = MyClient(user_input[CONF_HOST])
        try:
            serial = await client.get_serial()
        except MyConnectionError:
            errors["base"] = "cannot_connect"
        else:
            await self.async_set_unique_id_or_abort(serial, reason="wrong_device")
            return self.async_update_reload_and_abort(
                self._get_reconfigure_entry(),
                data_updates=user_input,
            )

    return self.async_show_form(
        step_id="reconfigure",
        data_schema=probatio.Schema({probatio.Required(CONF_HOST): str}),
        errors=errors,
    )
```

`async_set_unique_id_or_abort` stops a user from pointing the entry at a different device. `async_update_reload_and_abort` updates the data, reloads the entry, and ends the flow with the `reconfigure_successful` reason.

Pre-fill the form with the current values, with `self.add_suggested_values_to_schema`, so users only change what they need to.

## How it is checked

- Hassfest, when the rule is `done`: the config flow must have an `async_step_reconfigure`.
- Codecov requires 100% test coverage of the changed lines in `config_flow.py`, so the reconfigure step needs tests, including recovery from errors. See [config-flow-test-coverage](/core/quality-scale/config-flow-test-coverage/).

## Exceptions

- Integrations without settings in their config flow are exempt from this rule.
- Integrations where the only settings are credentials, which the reauthentication flow handles, are exempt from this rule.
- Integrations where every change would need a new config entry are exempt from this rule.

## Related rules

- [config-flow](/core/quality-scale/config-flow/): set up from the UI with a config flow.
- [test-before-configure](/core/quality-scale/test-before-configure/): test the connection in the config flow.
- [unique-config-entry](/core/quality-scale/unique-config-entry/): prevent duplicate config entries.
- [config-flow-test-coverage](/core/quality-scale/config-flow-test-coverage/): test the config flow fully.
- [reauthentication-flow](/core/quality-scale/reauthentication-flow/): reauthenticate from the UI.

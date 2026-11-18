---
title: Prevent duplicate config entries
description: "Bronze rule unique-config-entry: the same device or service cannot be set up twice."
sidebarLabel: unique-config-entry
sidebarGroup: Bronze
order: 20
---

This is a Bronze rule. In `quality_scale.yaml`, it is called `unique-config-entry`.

The config flow must stop the user from setting up the same device or service twice. Every flow, including discovery flows, aborts when the device or service already has a config entry.

## Why it matters

Setting up an integration from the UI is easy, so setting it up twice by accident is easy too. Two entries for the same device mean duplicate devices and entities, and unique IDs that collide. Discovery makes it worse: without a way to recognize a known device, Home Assistant keeps offering to set it up again.

## Example

There are two ways to do this.

### With a unique ID

Give the config entry a [unique ID](/glossary/unique-id/), like the serial number of the device, and abort when an entry with that ID exists. This is the preferred way, because it also lets discovery recognize the device:

```python
async def async_step_user(
    self, user_input: dict[str, Any] | None = None
) -> ConfigFlowResult:
    """Handle a flow started by the user."""
    errors: dict[str, str] = {}
    if user_input is not None:
        client = MyClient(user_input[CONF_HOST])
        try:
            info = await client.get_device_info()
        except MyConnectionError:
            errors["base"] = "cannot_connect"
        else:
            await self.async_set_unique_id_or_abort(info.serial_number)
            return self.async_create_entry(title=info.name, data=user_input)

    return self.async_show_form(
        step_id="user",
        data_schema=probatio.Schema({probatio.Required(CONF_HOST): str}),
        errors=errors,
    )
```

The unique ID only has to be unique within your integration. Use a stable hardware identifier, like a serial number or a MAC address formatted with `format_mac`. Do not use an IP address or hostname: those change.

### With unique data

When the device has no identifier to use, compare the data of the existing entries instead:

```python
if user_input is not None:
    self._async_abort_entries_match({CONF_HOST: user_input[CONF_HOST]})
```

The flow aborts with `already_configured` when an entry with the same host exists.

## How it is checked

- Hassfest, when the rule is `done`: the config flow must call `_async_abort_entries_match`, `async_set_unique_id_or_abort`, or both `async_set_unique_id` and `_abort_if_unique_id_configured`. Integrations with `single_config_entry` in their manifest pass this check.
- Pylint, for every integration: `home-assistant-unique-id-ip-based` warns when `async_set_unique_id` gets an IP address or hostname.
- Pylint: `home-assistant-tests-config-flow-unique-id` warns when a config flow test creates an entry without checking its unique ID.
- The test of the duplicate case is part of [config-flow-test-coverage](/core/quality-scale/config-flow-test-coverage/).

## Exceptions

Integrations that only support a single config entry are exempt from this rule. Usually, that is set with `"single_config_entry": true` in `manifest.json`.

## Related rules

- [config-flow](/core/quality-scale/config-flow/): set up from the UI with a config flow.
- [test-before-configure](/core/quality-scale/test-before-configure/): test the connection in the config flow.
- [config-flow-test-coverage](/core/quality-scale/config-flow-test-coverage/): test the config flow fully.
- [discovery](/core/quality-scale/discovery/): support discovery.
- [reauthentication-flow](/core/quality-scale/reauthentication-flow/): reauthenticate from the UI.
- [reconfiguration-flow](/core/quality-scale/reconfiguration-flow/): reconfigure from the UI.

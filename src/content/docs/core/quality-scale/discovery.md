---
title: Support discovery
description: "Gold rule discovery: devices are discovered, so users do not have to look them up."
sidebarLabel: discovery
sidebarGroup: Gold
order: 3
---

This is a Gold rule. In `quality_scale.yaml`, it is called `discovery`.

If the devices of the integration can be found on the network or on a bus, the integration supports [discovery](/glossary/discovery/). Home Assistant can discover devices with Bluetooth, DHCP, HomeKit, mDNS (zeroconf), MQTT, SSDP, and USB, and apps can announce a service through the Supervisor. You declare what to listen for in `manifest.json`, and handle the discovery in a step of the config flow.

## Why it matters

Without discovery, users first have to find out which integration supports their device, and then look up its IP address. With discovery, Home Assistant tells them it found a device, and they confirm. That is the difference between a setup that takes a minute and one that needs a router admin page.

Discovery also keeps working after setup: when the device gets a new IP address, the integration can update its configuration. See [discovery-update-info](/core/quality-scale/discovery-update-info/).

## Example

The device announces a `_mydevice._tcp.local.` service over mDNS. Declare it in `manifest.json`:

```json
{
  "zeroconf": ["_mydevice._tcp.local."]
}
```

Then handle it in `config_flow.py`, next to the user step. The discovery step sets the unique ID, aborts when the device is already configured, and asks the user to confirm:

```python
class MyConfigFlow(ConfigFlow, domain=DOMAIN):
    """Config flow for My integration."""

    host: str

    async def async_step_zeroconf(
        self, discovery_info: ZeroconfServiceInfo
    ) -> ConfigFlowResult:
        """Handle zeroconf discovery."""
        self.host = discovery_info.host
        serial = discovery_info.properties["serialno"]

        await self.async_set_unique_id_or_abort(serial, updates={CONF_HOST: self.host})

        try:
            await MyClient(self.host).get_data()
        except MyClientError:
            return self.async_abort(reason="cannot_connect")

        return await self.async_step_discovery_confirm()

    async def async_step_discovery_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Ask the user to confirm the discovered device."""
        if user_input is not None:
            return self.async_create_entry(
                title="My device",
                data={CONF_HOST: self.host},
            )

        self._set_confirm_only()
        return self.async_show_form(step_id="discovery_confirm")
```

`ZeroconfServiceInfo` comes from `homeassistant.helpers.service_info.zeroconf`. The other discovery methods have their own service info classes in `homeassistant.helpers.service_info`, and their own steps, like `async_step_dhcp` or `async_step_bluetooth`.

If the user step sets the same unique ID, it must not abort on a discovery flow in progress. Otherwise, a user who sets up the device by hand while a discovery flow for it is open gets an abort. `async_set_unique_id_or_abort` takes care of this in the user step. With `async_set_unique_id`, pass `raise_on_progress=False` there.

## How it is checked

- Hassfest, when the rule is `done`: the integration needs a `config_flow.py`, and either a discovery key in `manifest.json` (`bluetooth`, `dhcp`, `homekit`, `lorawan`, `mqtt`, `ssdp`, `usb`, or `zeroconf`) or a discovery step in the config flow, like `async_step_zeroconf` or `async_step_hassio`.
- Codecov requires 100% test coverage of the changed lines in `config_flow.py`, so the discovery steps need tests.
- Whether every way the device can be discovered is used, is checked in review.

## Exceptions

Not every device can be discovered. If the devices or service of the integration cannot be discovered, this rule does not apply.

## Related rules

- [config-flow](/core/quality-scale/config-flow/): set up from the UI with a config flow.
- [test-before-configure](/core/quality-scale/test-before-configure/): test the connection in the config flow.
- [unique-config-entry](/core/quality-scale/unique-config-entry/): prevent duplicate config entries.
- [config-flow-test-coverage](/core/quality-scale/config-flow-test-coverage/): test the config flow fully.

---
title: Update network information from discovery
description: "Gold rule discovery-update-info: discovery updates the address of a known device when it changes."
sidebarLabel: discovery-update-info
sidebarGroup: Gold
order: 4
---

This is a Gold rule. In `quality_scale.yaml`, it is called `discovery-update-info`.

When a device that is already set up is discovered again, the integration uses the discovery information to update the network information of its config entry, like the host or IP address. It only does so when it is sure that it is the same device, so it matches on a stable unique ID, never on the address itself.

## Why it matters

Most home networks hand out IP addresses dynamically. A device that restarts, or a router that reboots, can give a device a new address, and an integration that only knows the old one stops working. Asking users to set static IP addresses is not a fix: not everyone can, and nobody should have to.

Discovery already sees the device at its new address. Using that information makes the integration repair itself.

## Example

In the discovery step, set the unique ID of the flow, and pass the new address as `updates`. If an entry with that unique ID exists, Home Assistant updates its data, reloads it when something changed, and aborts the flow:

```python
async def async_step_zeroconf(
    self, discovery_info: ZeroconfServiceInfo
) -> ConfigFlowResult:
    """Handle zeroconf discovery."""
    host = discovery_info.host
    serial = discovery_info.properties["serialno"]

    await self.async_set_unique_id_or_abort(serial, updates={CONF_HOST: host})

    # Only a new device gets this far.
    self.host = host
    return await self.async_step_discovery_confirm()
```

DHCP discovery only starts flows for the matchers in `manifest.json`. To also get a flow when a device you already know shows up with a new address, set `registered_devices` to `true` in the DHCP matcher, and register the MAC address of the device in its device information with `connections={(CONNECTION_NETWORK_MAC, mac)}`.

```json
{
  "dhcp": [{ "registered_devices": true }]
}
```

## How it is checked

Checked in review. The tests of the config flow should cover a discovery of a known device at a new address.

## Exceptions

If the devices of the integration cannot be discovered, this rule does not apply.


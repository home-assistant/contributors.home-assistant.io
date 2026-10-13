---
title: Discovery
description: How Home Assistant finds your devices on the network, over USB, or over Bluetooth, and hands them to your config flow.
sidebarGroup: Discovery
order: 1
---

[Discovery](/glossary/discovery/) is how Home Assistant finds devices by itself and offers to set them up. Users see a "Discovered" card on the integrations page, confirm, and they are done. It is one of the best things you can do for the experience of your integration, and a rule of the Gold tier of the [quality scale](/core/quality-scale/).

Your integration does not search the network itself. Home Assistant runs the discovery integrations, like `zeroconf` and `dhcp`, and checks what they find against the matchers in the manifests of all integrations.

## How it works

1. You add a matcher to your [manifest](/core/integrations/manifest/#discovery), like the zeroconf service type of your device.
2. A discovery integration finds a device that matches.
3. Home Assistant starts your config flow, at the step named after the source, like `async_step_zeroconf`, with a service info object that describes what was found.
4. Your step sets the unique ID, checks whether the device is already set up, and asks the user to confirm. See [discovery steps](/core/integrations/config-flow/#discovery-steps).

The same device is often found again and again. Home Assistant does not start a new flow when one with the same discovery data is still in progress, and your unique ID makes the flow abort when the device is already set up. When a known device shows up with a new IP address, update the entry from the discovery step. See [update connection details on the fly](/core/integrations/config-flow/#update-connection-details-on-the-fly).

When a user ignores a discovered device, Home Assistant creates an ignored config entry with its unique ID, and does not offer it again.

## Discovery sources

| Source | Manifest key | Step | Service info |
| --- | --- | --- | --- |
| mDNS and zeroconf | `zeroconf` | `async_step_zeroconf` | `ZeroconfServiceInfo` |
| HomeKit, over zeroconf | `homekit` | `async_step_homekit` | `ZeroconfServiceInfo` |
| SSDP and UPnP | `ssdp` | `async_step_ssdp` | `SsdpServiceInfo` |
| DHCP | `dhcp` | `async_step_dhcp` | `DhcpServiceInfo` |
| USB | `usb` | `async_step_usb` | `UsbServiceInfo` |
| MQTT | `mqtt` | `async_step_mqtt` | `MqttServiceInfo` |
| Bluetooth | `bluetooth` | `async_step_bluetooth` | `BluetoothServiceInfoBleak` |
| LoRaWAN | `lorawan` | `async_step_integration_discovery` | `LoRaWANDiscoveryInfo` |
| A Supervisor app | None | `async_step_hassio` | `HassioServiceInfo` |
| Another integration | None | `async_step_integration_discovery` | Defined by that integration |

The service info classes live in `homeassistant.helpers.service_info`, except two: the Bluetooth one comes from `homeassistant.components.bluetooth`, and the LoRaWAN one from `homeassistant.components.lorawan`. For example:

```python
from homeassistant.helpers.service_info.zeroconf import ZeroconfServiceInfo


async def async_step_zeroconf(
    self, discovery_info: ZeroconfServiceInfo
) -> ConfigFlowResult:
    """Handle a device found with zeroconf."""
    host = discovery_info.host
    serial_number = discovery_info.properties["serialno"]
    ...
```

Some useful fields:

- `ZeroconfServiceInfo`: `host`, `port`, `hostname`, `name`, `type`, and the TXT records in `properties`.
- `SsdpServiceInfo`: the SSDP headers like `ssdp_location` and `ssdp_st`, and the UPnP device description in `upnp`.
- `DhcpServiceInfo`: `ip`, `hostname` (lowercase), and `macaddress` (lowercase, without colons).
- `UsbServiceInfo`: `device` (the path of the serial port), `vid`, `pid`, `serial_number`, `manufacturer`, and `description`.
- `MqttServiceInfo`: `topic`, `payload`, and `subscribed_topic`.

If you do not implement the step for a source, Home Assistant calls your `user` step instead. It only does so while your integration has no config entries yet, and with one flow at a time: once a device is set up, discovery no longer starts flows. That is how integrations that never have a unique ID still get discovered.

## Discovery by another integration

An integration can find devices for another integration. For example, the August integration knows the Bluetooth keys of locks that the Yale Access Bluetooth integration needs. Start a flow of the other integration with `discovery_flow.async_create_flow`, with the `integration_discovery` source:

```python
from homeassistant.config_entries import SOURCE_INTEGRATION_DISCOVERY
from homeassistant.helpers import discovery_flow

discovery_flow.async_create_flow(
    hass,
    "other_domain",
    context={"source": SOURCE_INTEGRATION_DISCOVERY},
    data={"address": address, "key": key},
)
```

The other integration handles it in `async_step_integration_discovery`. Use this helper for every discovery flow you start from code: it avoids starting a flow when one with the same data is already in progress, and waits until Home Assistant has started.

## Find devices after setup

Discovery through the manifest is about new config entries. A hub integration often also needs to know about devices that appear later, or about devices it already set up. The discovery integrations have APIs for that. See [network discovery](/core/integrations/network-discovery/) and [Bluetooth integrations](/core/integrations/bluetooth/).

## Test it

Test every discovery step: a new device, a device that is already set up, a device that moved to a new address, and a device that is ignored. Build the service info object by hand in your test, with the values a real device sends.

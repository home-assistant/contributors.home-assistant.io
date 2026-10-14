---
title: Modbus devices
description: How to write a library for a Modbus device with modbus-connection, and how your integration shares one Modbus connection with others.
sidebarGroup: APIs
order: 34
---

Modbus is a polling protocol, over serial lines and over TCP. It started in industry, and now shows up at home in solar inverters, energy meters, heat pumps, and batteries. Many of those speak Modbus and nothing else.

Like every integration, a Modbus integration talks to its device through a [library](/core/integrations/api-library/). This page covers what is special about Modbus: the shared library to build on, and sharing one connection.

## Build your library on modbus-connection

The Home Assistant project maintains [`modbus-connection`](https://github.com/home-assistant-libs/modbus-connection), a Python package to build Modbus device libraries on. It gives you:

- One interface on top of two popular Modbus libraries, [pymodbus](https://github.com/pymodbus-dev/pymodbus) and [tmodbus](https://github.com/wlcrs/tmodbus). Your library works with either, and the backend can change without changing your code.
- A framework to model a device: map its registers and coils to typed Python attributes, and read the whole device in as few requests as possible.
- A `pytest` plugin, to test your library without hardware.

For a complete example, see [sofar-modbus](https://github.com/darkrain-nl/sofar-modbus), a device library built on `modbus-connection`, and the [`sofar` integration](https://github.com/home-assistant/core/tree/dev/homeassistant/components/sofar) that uses it.

Your library takes a `ModbusUnit` from `modbus-connection`, the connection to one unit on a Modbus link, and does everything through it. It never opens a connection itself. That is what makes the next part work.

## Share one connection

One Modbus link addresses many units, and a device answers one request at a time. Two integrations that each open their own socket to the same device fight over it, and both get errors.

So do not open a connection in your integration. Ask the `modbus` integration for a unit instead. It hands out units over connections it shares between everyone who asks for the same link:

```python
from modbus_connection import ModbusTcpParams

from homeassistant.components.modbus import async_get_unit


async def async_setup_entry(
    hass: HomeAssistant, entry: MyConfigEntry
) -> bool:
    """Set up my device from a config entry."""
    unit = async_get_unit(
        hass,
        entry,
        ModbusTcpParams(
            host=entry.data[CONF_HOST], port=entry.data[CONF_PORT]
        ),
        entry.data[CONF_UNIT_ID],
    )
    entry.runtime_data = MyDevice(unit)
    ...
```

Collect the connection details in your own config flow, like any other. Two integrations that ask with the same details get units on one connection, and their requests queue up behind each other. For other links, use `ModbusUdpParams`, `ModbusTlsParams`, or `ModbusSerialParams`.

The connection is not stored anywhere. It exists while some config entry holds a unit on it, and closes when the last of them unloads. Your entry data stays yours.

Asking for a unit does no I/O, so a device that is switched off does not stop your integration from setting up. The first request opens the link, and a dropped link reopens on the next request. Do not reload your config entry when the connection drops.

If the same device is already in use with different link settings, like another baud rate, `async_get_unit` raises `HomeAssistantError`. One connection cannot do both.

## Talk to a device during the config flow

In a config flow there is no config entry yet to tie a unit to. Hold one for a moment with `async_get_temporary_unit`:

```python
from modbus_connection import ModbusTcpParams

from homeassistant.components.modbus import async_get_temporary_unit


async def async_validate_input(
    hass: HomeAssistant, params: ModbusTcpParams, unit_id: int
) -> None:
    """Check that the device can be reached."""
    async with async_get_temporary_unit(hass, params, unit_id) as unit:
        await MyDevice(unit).async_validate()
```

If a config entry already holds that connection, the temporary unit shares it. Otherwise, the connection is closed when the `async with` block ends.

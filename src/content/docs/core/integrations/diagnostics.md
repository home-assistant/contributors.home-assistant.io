---
title: Diagnostics
description: Let users download the data of a config entry or device, so they can share it when they report a problem, without leaking secrets.
sidebarGroup: Integration features
order: 4
---

[Diagnostics](/glossary/diagnostics/) let users download a JSON file with the data of your integration, and attach it to an issue. For you as a maintainer, that is often the fastest way to see what is going on at the home of a user.

Users download diagnostics for a config entry from the menu of the entry on the integration page, and for a device from the device page. If your integration has no device diagnostics, the device page offers the config entry diagnostics instead.

Diagnostics are a rule of the Gold tier of the [quality scale](/core/quality-scale/).

## Add diagnostics

Create `diagnostics.py`, and implement one or both of these functions:

```python
from typing import Any

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.const import CONF_API_KEY, CONF_PASSWORD
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntry

TO_REDACT = {CONF_API_KEY, CONF_PASSWORD, "serial_number"}


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: ExampleConfigEntry
) -> dict[str, Any]:
    """Return diagnostics for a config entry."""
    return {
        "entry_data": async_redact_data(entry.data, TO_REDACT),
        "data": async_redact_data(
            entry.runtime_data.data.to_dict(), TO_REDACT
        ),
    }


async def async_get_device_diagnostics(
    hass: HomeAssistant, entry: ExampleConfigEntry, device: DeviceEntry
) -> dict[str, Any]:
    """Return diagnostics for a device."""
    appliance = entry.runtime_data.get_appliance(device)

    return {"details": async_redact_data(appliance.raw_data, TO_REDACT)}
```

## Leave out sensitive data

Users post diagnostics in public issues. Make sure nothing sensitive ends up in them, like:

- Passwords, API keys, and tokens
- Location data, like coordinates and addresses
- Personal information, like names and email addresses

`async_redact_data` replaces the values of the keys you list with `**REDACTED**`, also in nested dictionaries and lists. Values that are `None` or an empty string stay as they are, so you can still see that a value is not set. Check the output of your diagnostics by hand: data from an API often holds more than you expect.

To include a device or entity registry entry, convert it with `device_entry_as_dict` or `entity_entry_as_dict` from `homeassistant.components.diagnostics`. They leave out the internal fields of the entry.

## Test diagnostics

Test the output with a snapshot, so changes to it show up in review. The test helpers `get_diagnostics_for_config_entry` and `get_diagnostics_for_device` in `tests/components/diagnostics` return what users would download. See [snapshot tests](/core/development/tests/#snapshot-tests).

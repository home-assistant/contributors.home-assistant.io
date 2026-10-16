---
title: Bluetooth integrations
description: Best practices for integrations that use Bluetooth, and the API of the Bluetooth integration.
sidebarLabel: Bluetooth
sidebarGroup: Discovery
order: 3
---

Home Assistant manages all Bluetooth adapters and scanners itself, including remote ones, like ESPHome Bluetooth proxies. Your integration never starts its own scanner: it uses the Bluetooth integration, which shares one stream of advertisements with every integration that needs it.

This page has the best practices and the API. To turn advertisements into entities, see [fetching Bluetooth data](/core/integrations/bluetooth-data/). To get discovered, add a `bluetooth` matcher to your [manifest](/core/integrations/manifest/#bluetooth).

## Best practices

- Add `bluetooth_adapters` to the `dependencies` in your manifest. That makes sure all supported remote adapters are connected before your integration tries to use them.
- Need a `BleakScanner` for your library? Get one with `bluetooth.async_get_scanner(hass)`. Running several scanners costs a lot, and this one keeps working when the user changes adapter settings.
- Do not reuse a `BleakClient` between connections. It makes connecting less reliable.
- Use a connection timeout of at least 10 seconds. BlueZ has to resolve services the first time it connects to a new or updated device.
- Expect connections to fail now and then, and retry. The [`bleak-retry-connector`](https://pypi.org/project/bleak-retry-connector/) package takes the guesswork out of connecting quickly and reliably.

## Connectable and non-connectable

Some Bluetooth adapters, like many remote ones, can only listen to advertisements: they cannot connect to devices. Many devices do not need a connection, because everything is in their advertisements.

That is what `connectable` is about. It defaults to `True`: you only get data from adapters that can connect. Set it to `False` if your device only needs advertisements, and you get data from all adapters, connectable or not.

If some of your devices need a connection and others do not, set `connectable` per matcher in the manifest. If you cannot tell them apart with a matcher, check `connectable` on the `BluetoothServiceInfoBleak` in your config flow, and abort for devices that need a connection you cannot make.

## Subscribe to advertisements

`bluetooth.async_register_callback` calls you when a device that matches is seen, or when its advertisement changes. It uses the same matchers as the manifest, plus `address`. It returns a function that cancels the subscription.

```python
from homeassistant.components import bluetooth
from homeassistant.core import callback


@callback
def _async_discovered_device(
    service_info: bluetooth.BluetoothServiceInfoBleak,
    change: bluetooth.BluetoothChange,
) -> None:
    """Handle a new advertisement."""


entry.async_on_unload(
    bluetooth.async_register_callback(
        hass,
        _async_discovered_device,
        {"address": "44:33:11:22:33:22", "connectable": False},
        bluetooth.BluetoothScanningMode.ACTIVE,
    )
)
```

Other matchers work the same way, like `{"manufacturer_id": 76, "manufacturer_data_start": [6]}` for HomeKit devices, or `{"local_name": "Prodigio_*"}`.

### Replay of known devices

When you subscribe, the Bluetooth integration replays the advertisements it already has, so you see all known devices right away. Pass `replay` to change that:

| Value | Behavior |
| --- | --- |
| `BluetoothCallbackReplay.OLDEST_FIRST` | Replay in the order the devices were first seen. The default. |
| `BluetoothCallbackReplay.NEWEST_FIRST` | Replay the most recent advertisement first, for when you want to act on the current state right away |
| `BluetoothCallbackReplay.DISABLED` | No replay, only new advertisements |

### Active scans for one device

Scanners in `AUTO` mode scan passively, and switch to active scanning in short windows. If your matcher has an `address`, and the mode is not `PASSIVE`, you can ask for active scan windows for that address, at a pace that suits your device: pass `scan_interval` (seconds between windows) and `scan_duration` (seconds per window). Without them, the defaults of habluetooth apply: a window of 10 seconds every 5 minutes. The values are clamped to the range habluetooth allows. Scanners that the user set to `PASSIVE` or `ACTIVE` are not affected.

### Every advertisement

`async_register_callback` skips advertisements that did not change. To see every advertisement of one address, use `async_register_advertisement_callback`, for example to check whether a device is still advertising while a config flow is open:

```python
entry.async_on_unload(
    bluetooth.async_register_advertisement_callback(
        hass, _async_advertisement, "44:44:33:11:23:42"
    )
)
```

Only the `raw` bytes are per packet, and they are `None` on backends that do not provide raw advertisements. The other data is merged across packets. The callback runs once per scanner that hears a packet, also for advertisements that are then dropped in favor of a stronger source, so it runs a lot. Noisy Apple advertisements that Home Assistant filters out early never reach it. Unsubscribe as soon as you no longer need it.

### Wait for one advertisement

`async_process_advertisements` waits until your callback returns `True` for an advertisement, or until the timeout runs out:

```python
def _has_temperature(
    service_info: bluetooth.BluetoothServiceInfoBleak,
) -> bool:
    """Wait for an advertisement with manufacturer ID 323."""
    return 323 in service_info.manufacturer_data


service_info = await bluetooth.async_process_advertisements(
    hass,
    _has_temperature,
    {"address": discovery_info.address, "connectable": False},
    bluetooth.BluetoothScanningMode.ACTIVE,
    ADDITIONAL_DISCOVERY_TIMEOUT,
)
```

With an `address` in the matcher and a mode that is not `PASSIVE`, the timeout is also used as the active scan window for that address.

## Look up devices

| Function | Returns |
| --- | --- |
| `async_ble_device_from_address(hass, address, connectable=True)` | A bleak `BLEDevice` from the nearest adapter that can reach the device, or `None`. Use it instead of starting a scanner to resolve an address. |
| `async_last_service_info(hass, address, connectable=True)` | The latest `BluetoothServiceInfoBleak`, from the scanner with the best signal |
| `async_address_present(hass, address, connectable=True)` | Whether the device is still seen |
| `async_discovered_service_info(hass, connectable=True)` | Every device that is still present |
| `async_scanner_devices_by_address(hass, address, connectable=True)` | One `BluetoothScannerDevice` per adapter that sees the device, with its `ble_device`, `advertisement`, and `scanner` |
| `async_scanner_count(hass, connectable=True)` | The number of scanners. Use it to give a clear error when there is no scanner that can reach devices. |

If you receive data from non-connectable adapters but need to connect, exchange the `BLEDevice` for a connectable one with `async_ble_device_from_address(hass, address, connectable=True)`. That works as long as one connectable adapter is in range.

### Explain why a device is unreachable

When `async_ble_device_from_address` returns `None`, or connecting fails, `async_address_reachability_diagnostics` explains why, in a text for humans. Pass what you need from the device: someone who wants to connect cares about connection slots, someone who only reads advertisements does not.

```python
from homeassistant.components.bluetooth import BluetoothReachabilityIntent

reason = bluetooth.async_address_reachability_diagnostics(
    hass, address, BluetoothReachabilityIntent.CONNECTION
)
```

The text says whether the address was seen, by which scanners and with what signal, and whether all scanners are busy connecting. Put it in an error or log message, but do not parse it: its wording can change.

## Availability

`async_track_unavailable` calls you when the device is no longer seen. It can take up to five minutes. With `connectable=True`, the device counts as available as long as a connectable adapter can reach it. With `connectable=False`, any adapter will do.

```python
@callback
def _async_unavailable(
    service_info: bluetooth.BluetoothServiceInfoBleak,
) -> None:
    """Handle the device going away."""


entry.async_on_unload(
    bluetooth.async_track_unavailable(
        hass, _async_unavailable, address, connectable=True
    )
)
```

When a device counts as gone depends on how often it advertises. The Bluetooth integration learns that interval: get it with `async_get_learned_advertising_interval(hass, address)`. It returns `None` until it is known. Until then, the fallback interval is used, which you can set with `async_set_fallback_availability_interval(hass, address, seconds)` and read with `async_get_fallback_availability_interval`. Without both, `bluetooth.FALLBACK_MAXIMUM_STALE_ADVERTISEMENT_SECONDS` applies.

## Rediscovery

The Bluetooth integration remembers which devices it already started a discovery for, so it does not ask the user twice. Sometimes you want it to forget:

| Function | Use it when |
| --- | --- |
| `async_rediscover_address(hass, address)` | A config entry or device was removed. Clears the history and starts discovery again right away with the cached data, so the device can be set up again without a restart. |
| `async_clear_address_from_match_history(hass, address)` | A device changed state but still advertises the same UUIDs, like after a factory reset. Clears the history, so the next advertisement can start a new discovery. |
| `async_clear_advertisement_history(hass, address)` | The next advertisement should reach your callbacks, even if it is identical to the previous one. Useful after a GATT session, to hear the next "I am awake" advertisement. It does not affect discovery. |
| `async_request_active_scan(hass, duration=None)` | You want an active scan right now, for example in a config flow. Waits `duration` seconds (or the default of habluetooth), so you can read the new advertisements afterward. Calls at the same time share one scan window. Only affects `AUTO` mode scanners. |

> [!WARNING]
> Do not use `async_clear_address_from_match_history` for devices whose advertisements change often, like sensors that put their readings in them. Every change would start a new discovery flow.

## Scanners

These are for integrations that provide a Bluetooth adapter, or need to look at scanners.

### Inspect scanners

`async_scanner_by_source(hass, source)` returns one scanner by its MAC address, and `async_current_scanners(hass)` returns all of them. Use them for diagnostics and debugging only. The scanner objects come from habluetooth, and their interface can change between releases. Read simple properties like `source` and `current_mode`, expect them to be `None`, never change anything, and do not keep references to scanners.

### Provide a scanner

An integration that provides a Bluetooth adapter adds `bluetooth` to its `dependencies`, and is listed in the `after_dependencies` of the `bluetooth_adapters` integration. Register a scanner that extends `BaseHaScanner`. If the adapter needs to limit connections, pass the number of connection slots:

```python
cancel = bluetooth.async_register_scanner(
    hass, scanner, connection_slots=slots
)
```

The scanner feeds advertisements to Home Assistant as `BluetoothServiceInfoBleak` objects, through the callback from `bluetooth.async_get_advertisement_callback(hass)`. To remove a scanner for good, including its advertisement history, call `bluetooth.async_remove_scanner(hass, source)`.

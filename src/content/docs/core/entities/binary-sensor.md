---
title: Binary sensor entity
description: Report something that is either on or off, like a door that is open or motion that is detected.
sidebarLabel: Binary sensor
sidebarGroup: Sensors and status
---

A binary sensor reports one of two states: on or off. What on and off mean depends on its device class: a door is open or closed, a smoke detector sees smoke or is clear, a battery is low or normal. Inherit from `BinarySensorEntity`, imported from `homeassistant.components.binary_sensor`.

Use a binary sensor when the value has exactly two states and the user cannot change it. If the user can turn it on and off, use a [switch](/core/entities/switch/). If it has more than two states, use a [sensor](/core/entities/sensor/) with the `enum` device class.

## Properties

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `is_on` | `bool \| None` | Required | Whether the binary sensor is on. `None` means the state is unknown. |
| `device_class` | `BinarySensorDeviceClass \| None` | `None` | What the binary sensor detects. See [device classes](#device-classes). |

The generic properties every entity has, like `name` or `available`, are on [the entity class](/core/entities/entity-class/).

A binary sensor can never have the `config` [entity category](/glossary/entity-category/): Home Assistant refuses to add it.

## Supported features

This entity has no supported features.

## Device classes

The [device class](/glossary/device-class/) changes how the frontend shows on and off, and which icon the entity gets. A binary sensor with a device class and no name is named after its device class. See [naming](/core/entities/naming/). The value column is what you put in YAML, for example as `device_class` of an [MQTT binary sensor](https://www.home-assistant.io/integrations/binary_sensor.mqtt/) or a [template binary sensor](https://www.home-assistant.io/integrations/template/).

| Device class | Value | On means | Off means |
| --- | --- | --- | --- |
| `BATTERY` | `battery` | Low | Normal |
| `BATTERY_CHARGING` | `battery_charging` | Charging | Not charging |
| `CO` | `carbon_monoxide` | Carbon monoxide detected | Clear |
| `COLD` | `cold` | Cold | Normal |
| `CONNECTIVITY` | `connectivity` | Connected | Disconnected |
| `DOOR` | `door` | Open | Closed |
| `GARAGE_DOOR` | `garage_door` | Open | Closed |
| `GAS` | `gas` | Gas detected | Clear |
| `GLASS_BREAK` | `glass_break` | Glass break detected | Clear |
| `HEAT` | `heat` | Hot | Normal |
| `LIGHT` | `light` | Light detected | No light |
| `LOCK` | `lock` | Unlocked | Locked |
| `MOISTURE` | `moisture` | Wet | Dry |
| `MOTION` | `motion` | Motion detected | Clear |
| `MOVING` | `moving` | Moving | Stopped |
| `OCCUPANCY` | `occupancy` | Occupied | Clear |
| `OPENING` | `opening` | Open | Closed |
| `PLUG` | `plug` | Plugged in | Unplugged |
| `POWER` | `power` | Power detected | No power |
| `PRESENCE` | `presence` | Home | Away |
| `PROBLEM` | `problem` | Problem detected | OK |
| `RUNNING` | `running` | Running | Not running |
| `SAFETY` | `safety` | Unsafe | Safe |
| `SMOKE` | `smoke` | Smoke detected | Clear |
| `SOUND` | `sound` | Sound detected | Clear |
| `TAMPER` | `tamper` | Tampering detected | Clear |
| `UPDATE` | `update` | Update available | Up to date |
| `VIBRATION` | `vibration` | Vibration detected | No vibration |
| `WINDOW` | `window` | Open | Closed |

The device classes are in `BinarySensorDeviceClass`, in `homeassistant/components/binary_sensor/const.py`.

Avoid the `UPDATE` device class. To report that new firmware or software is available, use an [update entity](/core/entities/update/) instead.

## Methods

A binary sensor has no actions, so there is nothing to implement beyond keeping `is_on` current. Fetch data in `update` or `async_update`, or push it with `async_write_ha_state`. See [updating state](/core/entities/state-updates/).

## States

The base class sets the state from `is_on`: `on` for `True`, `off` for `False`, and `unknown` for `None`. Do not set `state` yourself.

## Example

A motion detector that receives pushed updates from a device:

```python
from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)


class ExampleMotionSensor(BinarySensorEntity):
    """Motion detector of an example device."""

    _attr_has_entity_name = True
    _attr_device_class = BinarySensorDeviceClass.MOTION
    _attr_should_poll = False

    def __init__(self, device: ExampleDevice) -> None:
        """Initialize the binary sensor."""
        self._device = device
        self._attr_unique_id = f"{device.serial}_motion"

    async def async_added_to_hass(self) -> None:
        """Subscribe to motion updates."""
        self.async_on_remove(
            self._device.subscribe_motion(self._handle_motion)
        )

    def _handle_motion(self, detected: bool) -> None:
        """Handle a motion update from the device."""
        self._attr_is_on = detected
        self.async_write_ha_state()
```

The entity has no name, so it is named after its device class: "Motion".

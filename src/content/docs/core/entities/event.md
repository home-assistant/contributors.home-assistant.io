---
title: Event entity
description: Turn things that happen in the physical world, like a button press or a doorbell ring, into an entity you can automate on.
sidebarLabel: Event
sidebarGroup: Sensors and status
---

An event entity captures something that happens at a moment in time: a button on a remote is pressed, a doorbell rings, a motion sensor fires. It has no lasting state of its own. You fire events, and Home Assistant keeps track of the last one. Inherit from `EventEntity`, imported from `homeassistant.components.event`.

Use an event entity for momentary signals that have no on or off state. If the thing stays on for a while, like detected motion that clears after a minute, a [binary sensor](/core/entities/binary-sensor/) fits better.

## Properties

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `event_types` | `list[str]` | Required | The event types this entity can fire. |
| `device_class` | `EventDeviceClass \| None` | `None` | What kind of events these are. See [device classes](#device-classes). |

The generic properties every entity has, like `name` or `available`, are on [the entity class](/core/entities/entity-class/). The `event_types` list is a capability attribute and is not recorded in history.

## Supported features

This entity has no supported features.

## Device classes

| Device class | Use it for |
| --- | --- |
| `EventDeviceClass.BUTTON` | A button on a remote or a wall switch was pressed. |
| `EventDeviceClass.DOORBELL` | A button that is a doorbell. |
| `EventDeviceClass.MOTION` | A motion sensor detected motion. |

An event entity with a device class and no name is named after its device class. See [naming](/core/entities/naming/).

### Standard event types

Some device classes have standard event types, so one automation works no matter which integration provides the entity. They are enums in `homeassistant.components.event`.

A `DOORBELL` entity must support `DoorbellEventType.RING`. Home Assistant logs a warning when it does not, and from Home Assistant 2027.4 that will stop working.

A `BUTTON` entity can use these `ButtonEventType` values. None of them are mandatory: only use the ones your hardware can produce.

The types come in two layers. The physical types, `PRESS_START` and `PRESS_END`, describe the button going down and up. The gesture types describe what the device concluded from the presses.

| Event type | Layer | Meaning |
| --- | --- | --- |
| `PRESS_START` | Physical | The button went down. Only use it if the device reports it for every press. |
| `PRESS_END` | Physical | The button was released after a press the device did not classify as long. |
| `LONG_PRESS_START` | Gesture | The button reached the hold threshold and is still down. Fired once per hold. |
| `LONG_PRESS_END` | Gesture | The button was released after a press the device classified as long. |
| `SINGLE_PRESS` | Gesture | The device concluded that exactly one short press happened. |
| `MULTI_PRESS` | Gesture | The device finished counting a series of two or more presses. A long press never counts. |

`MULTI_PRESS` includes a `press_count` attribute (the `ATTR_PRESS_COUNT` constant) with the number of presses. Only list `MULTI_PRESS` in `event_types` if you also list `SINGLE_PRESS`. A device that reports a double press, but never a resolved single press, keeps its double press as a non-standard event type.

When mapping the events of your device:

- Map one event of the device to one standard event. Do not suppress, delay, or synthesize events, and do not run timers.
- Only list a type in `event_types` if its meaning holds for every event you fire under that name.
- A device that reports both the release and the resolved single press fires both, as `PRESS_END` and `SINGLE_PRESS`.
- A device that sends one event per press maps it by what that event is. Sent when the button goes down, it is `PRESS_START`. Sent when the button is released, it is `PRESS_END`. Reported as a completed press, like after a debounce or through a cloud service, it is `SINGLE_PRESS`. When in doubt, use `SINGLE_PRESS`.
- A hold reported when the threshold is reached is `LONG_PRESS_START`. A hold reported after the release is `LONG_PRESS_END`.
- Only keep local state to classify a release as `PRESS_END` or `LONG_PRESS_END` after a `LONG_PRESS_START`, or to fire `LONG_PRESS_START` once when the device repeats it.

For a button that reports a direction from one source, like an up and down rocker, prefer one entity per direction. A non-standard `direction` attribute is acceptable when separate entities are not practical. Other, non-standard event types are allowed too.

## Methods

You do not implement any methods. You fire events by calling `_trigger_event`, and then write the state.

### `_trigger_event`

```python
def _trigger_event(
    self, event_type: str, event_attributes: dict[str, Any] | None = None
) -> None:
```

`event_type` must be in `event_types`, or the call raises a `ValueError`. The optional `event_attributes` are added to the state attributes, next to `event_type`. Call `self.async_write_ha_state()` right after to publish the event.

The event entity restores its last event after a restart by itself: it is a `RestoreEntity`.

## States

The state is the time the last event fired, as an ISO 8601 timestamp with milliseconds. Before the first event, it is `unknown`. The `event_type` attribute holds the type of the last event, along with any attributes you passed.

When two events fire in the same millisecond, the base class moves the second one forward by a millisecond, so each event is its own state change.

## Example

A doorbell button that listens to a device:

```python
from homeassistant.components.event import (
    DoorbellEventType,
    EventDeviceClass,
    EventEntity,
)
from homeassistant.core import callback


class ExampleDoorbell(EventEntity):
    """Doorbell button of an example device."""

    _attr_has_entity_name = True
    _attr_device_class = EventDeviceClass.DOORBELL
    _attr_event_types = [DoorbellEventType.RING]

    def __init__(self, device: ExampleDevice) -> None:
        """Initialize the event entity."""
        self._device = device
        self._attr_unique_id = f"{device.serial}_doorbell"

    async def async_added_to_hass(self) -> None:
        """Listen for rings."""
        self.async_on_remove(self._device.on_ring(self._handle_ring))

    @callback
    def _handle_ring(self) -> None:
        """Handle a ring from the device."""
        self._trigger_event(DoorbellEventType.RING)
        self.async_write_ha_state()
```

Registering the listener with `async_on_remove` makes sure it is removed again with the entity. See [the entity lifecycle](/core/entities/lifecycle/).

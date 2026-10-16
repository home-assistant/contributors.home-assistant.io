---
title: Text entity
description: Build a text entity that lets people set a short text value on a device, like a display message or a network name.
sidebarLabel: Text
sidebarGroup: Inputs and helpers
---

A text entity lets people set a text value on a device or service, like the message on a display, a network name, or a PIN code. Inherit from `TextEntity` in `homeassistant.components.text`.

A text entity has a value that stays. If you want to send a message that is gone once it is delivered, like a push notification, use a [notify](/core/entities/notify/) entity instead.

## Properties

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `native_value` | `str \| None` | Required | The current text. |
| `native_min` | `int` | `0` | The minimum number of characters, inclusive. |
| `native_max` | `int` | `255` | The maximum number of characters, inclusive. Values above 255 are capped at 255, the longest state Home Assistant can store. |
| `pattern` | `str \| None` | `None` | A regular expression that the value must match. It is checked with `re.match`, so it only anchors at the start: end it with `$` to match the whole value. |
| `mode` | `TextMode` | `TextMode.TEXT` | How the frontend shows the field: `TextMode.TEXT` for plain text, or `TextMode.PASSWORD` to hide what you type. |

The generic properties every entity has, like `name`, `available`, and `unique_id`, are on [the entity class](/core/entities/entity-class/).

> [!NOTE]
> `TextMode.PASSWORD` only hides the input in the frontend. The value is still the state of the entity, readable by anyone who can see the entity and stored in the history. Don't use a text entity for real secrets.

## Supported features

This entity has no supported features.

## Methods

### Set value

Called when someone changes the text in the UI, or an automation or script calls the `text.set_value` action. Implement one of the two.

```python
class MyText(TextEntity):
    # Implement one of these methods.

    def set_value(self, value: str) -> None:
        """Set the text value."""

    async def async_set_value(self, value: str) -> None:
        """Set the text value."""
```

The action checks the value against `native_min`, `native_max`, and `pattern` before it calls your method. A value that doesn't fit raises a `ServiceValidationError`, and your method is not called.

## States

The state is `native_value`. It is `unknown` when `native_value` is `None`.

The same checks run on your own value when the state is written: a `native_value` that is too short, too long, or doesn't match `pattern` raises a `ValueError`. Make sure what the device reports fits the limits you set.

The mode, minimum, maximum, and pattern are capability attributes: they are written to the [entity registry](/core/entities/registry/) and left out of the recorder history.

## Restoring the value

If the text lives in Home Assistant and not on a device, inherit from `RestoreText`. Call `await self.async_get_last_text_data()` in `async_added_to_hass` to get the last `native_value`, `native_min`, and `native_max` back after a restart. It returns `None` when there is nothing to restore.

## Example

```python
from homeassistant.components.text import TextEntity
from homeassistant.const import EntityCategory


class ExampleDisplayMessage(TextEntity):
    """The message on the display of the device."""

    _attr_has_entity_name = True
    _attr_translation_key = "display_message"
    _attr_entity_category = EntityCategory.CONFIG
    _attr_native_max = 32

    def __init__(self, device: ExampleDevice) -> None:
        """Initialize the text entity."""
        self._device = device
        self._attr_unique_id = f"{device.serial}_display_message"
        self._attr_native_value = device.message

    async def async_set_value(self, value: str) -> None:
        """Set the message on the display."""
        await self._device.set_message(value)
        self._attr_native_value = value
        self.async_write_ha_state()
```

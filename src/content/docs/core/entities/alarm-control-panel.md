---
title: Alarm control panel entity
description: Build an alarm control panel entity that arms, disarms, and triggers a security system.
sidebarLabel: Alarm control panel
sidebarGroup: Openings and security
---

An alarm control panel entity controls a security system: it arms the system in one or more modes, disarms it, and can trigger the alarm. It can ask for a code. Inherit from `AlarmControlPanelEntity` in `homeassistant.components.alarm_control_panel`.

The sensors of the system, like door contacts and motion detectors, are [binary sensors](/core/entities/binary-sensor/). A siren that is part of the system is a [siren](/core/entities/siren/).

For how the frontend shows an alarm control panel, see the [alarm control panel more-info view](/design/more-info/alarm-control-panel/).

## Properties

Alarm control panel entities have these properties on top of the [generic entity properties](/core/entities/entity-class/). Every property can be set with its `_attr_` attribute, like `_attr_alarm_state`.

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `alarm_state` | `AlarmControlPanelState \| None` | Required | The state of the alarm. See [States](#states). |
| `code_format` | `CodeFormat \| None` | `None` | The kind of code the panel asks for: `CodeFormat.NUMBER` or `CodeFormat.TEXT`. `None` means no code. |
| `code_arm_required` | `bool` | `True` | Whether arming needs a code. Disarming always passes the code along when there is one. |
| `changed_by` | `str \| None` | `None` | Who or what changed the alarm last. |

`code_format` tells the frontend which keypad to show: a number pad for `NUMBER`, a text field for `TEXT`.

## Codes

Your methods receive the code as the `code` argument, or `None` when there is none. Users can store a default code in the entity settings. When a disarm or arm action comes without a code, Home Assistant uses that default code. The trigger action does not: `alarm_trigger` gets only the code from the action. It reads the setting from the [entity registry options](/core/entities/registry/) for you.

When `code_arm_required` is `True` and an arm action has no code and there is no default code, Home Assistant raises a validation error before it calls you. Set `code_arm_required` to `False` when the panel arms without a code.

## Supported features

Combine the `AlarmControlPanelEntityFeature` flags with `|` and set them as `supported_features`. See [supported features](/glossary/supported-features/). Disarming is always available.

| Value | Description |
| ----- | ----------- |
| `ARM_HOME` | The alarm can arm in home mode. Implement `alarm_arm_home`. |
| `ARM_AWAY` | The alarm can arm in away mode. Implement `alarm_arm_away`. |
| `ARM_NIGHT` | The alarm can arm in night mode. Implement `alarm_arm_night`. |
| `ARM_VACATION` | The alarm can arm in vacation mode. Implement `alarm_arm_vacation`. |
| `ARM_CUSTOM_BYPASS` | The alarm can arm with some zones bypassed. Implement `alarm_arm_custom_bypass`. |
| `TRIGGER` | The alarm can be triggered from Home Assistant. Implement `alarm_trigger`. |

## Methods

Implement the sync or the async variant of each method, not both. Every method takes `code: str | None = None`.

| Method | Async variant | Feature |
| ------ | ------------- | ------- |
| `alarm_disarm` | `async_alarm_disarm` | Always |
| `alarm_arm_home` | `async_alarm_arm_home` | `ARM_HOME` |
| `alarm_arm_away` | `async_alarm_arm_away` | `ARM_AWAY` |
| `alarm_arm_night` | `async_alarm_arm_night` | `ARM_NIGHT` |
| `alarm_arm_vacation` | `async_alarm_arm_vacation` | `ARM_VACATION` |
| `alarm_arm_custom_bypass` | `async_alarm_arm_custom_bypass` | `ARM_CUSTOM_BYPASS` |
| `alarm_trigger` | `async_alarm_trigger` | `TRIGGER` |

## States

The state is the value of `alarm_state`, from the `AlarmControlPanelState` enum. When `alarm_state` is `None`, the state is `unknown`.

| Value | Description |
| ----- | ----------- |
| `DISARMED` | The alarm is disarmed. |
| `ARMED_HOME` | The alarm is armed in home mode. |
| `ARMED_AWAY` | The alarm is armed in away mode. |
| `ARMED_NIGHT` | The alarm is armed in night mode. |
| `ARMED_VACATION` | The alarm is armed in vacation mode. |
| `ARMED_CUSTOM_BYPASS` | The alarm is armed with one or more zones or sensors bypassed, in a combination that does not match home, away, or night. Do not use it to signal a disconnected, broken, or low battery sensor. Report those with their own sensor entities. |
| `PENDING` | The alarm is about to trigger, giving you time to disarm it. |
| `ARMING` | The alarm is arming, usually during an exit delay. |
| `DISARMING` | The alarm is disarming. |
| `TRIGGERED` | The alarm is triggered. |

## Example

```python
from homeassistant.components.alarm_control_panel import (
    AlarmControlPanelEntity,
    AlarmControlPanelEntityFeature,
    AlarmControlPanelState,
    CodeFormat,
)


class MyAlarm(AlarmControlPanelEntity):
    """An alarm panel that arms home and away."""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_code_format = CodeFormat.NUMBER
    _attr_supported_features = (
        AlarmControlPanelEntityFeature.ARM_HOME
        | AlarmControlPanelEntityFeature.ARM_AWAY
    )

    def __init__(self, panel: MyPanel) -> None:
        """Set up the alarm panel."""
        self._panel = panel
        self._attr_unique_id = panel.serial

    @property
    def alarm_state(self) -> AlarmControlPanelState:
        """Return the state of the alarm."""
        return AlarmControlPanelState(self._panel.state)

    async def async_alarm_disarm(self, code: str | None = None) -> None:
        """Disarm the alarm."""
        await self._panel.disarm(code)

    async def async_alarm_arm_home(self, code: str | None = None) -> None:
        """Arm the alarm in home mode."""
        await self._panel.arm("home", code)

    async def async_alarm_arm_away(self, code: str | None = None) -> None:
        """Arm the alarm in away mode."""
        await self._panel.arm("away", code)
```

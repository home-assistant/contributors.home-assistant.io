---
title: Triggers and conditions
description: Provide automation triggers and conditions from your integration with a trigger and condition platform, and name them so users can predict them.
sidebarGroup: Integration features
order: 2
---

An integration can offer its own [triggers](/glossary/trigger/) and [conditions](/glossary/condition/) to automations, like "Light turned on", "Fuel became low", or "Moon is in phase". Users pick them in the automation editor, next to the built-in ones, and fill in the fields you describe. You provide them in a `trigger.py` and a `condition.py` platform.

> [!IMPORTANT]
> This API is in use, but it is young and still changes often. Most implementations today are the entity domains, like `light` and `lock`, with a handful of integrations like `fumis`, `moon`, and `zwave_js`. In recent releases the helpers moved into the `homeassistant/helpers/trigger/` and `homeassistant/helpers/condition/` packages, and the trigger runner gained a new argument. Before you build on it, read the current code and an existing implementation, and expect to follow along with changes.

Looking for triggers and conditions that are picked per device, like "Button 1 pressed"? Those are [device automations](/core/integrations/device-automations/), an older mechanism that does not accept new implementations.

## What users write

A trigger or condition is identified by the domain of your integration and its key. In YAML, the settings go in `options`, and the entities, devices, or areas it applies to in `target`:

```yaml
triggers:
  - trigger: light.turned_on
    target:
      area_id: living_room
  - trigger: fumis.fuel_became_low
    options:
      device_id: 0c5ac1d9e3f8a4b2c6d7e8f9a0b1c2d3
conditions:
  - condition: moon.is_phase
    options:
      phase: full_moon
```

## Triggers

### The trigger class

A trigger extends `Trigger` from `homeassistant.helpers.trigger` and implements two methods:

- `async_validate_config`: a class method that validates the configuration. It gets a dictionary with the `options` and `target` of the trigger, and returns the validated version.
- `async_attach_runner`: starts listening. Every time the trigger fires, call `run_action` with the trigger data and a description. Return a callback that stops listening.

The constructor gets a `TriggerConfig`, with the `key`, `target`, and `options` of the trigger.

```python
from typing import override

import probatio

from homeassistant.const import ATTR_DEVICE_ID, CONF_OPTIONS
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.trigger import (
    Trigger,
    TriggerActionRunner,
    TriggerConfig,
    TriggerNotTriggeredReporter,
)
from homeassistant.helpers.typing import ConfigType

from .const import SIGNAL_BUTTON_PRESSED

_CONFIG_SCHEMA = probatio.Schema(
    {
        probatio.Required(CONF_OPTIONS): {
            probatio.Required(ATTR_DEVICE_ID): probatio.All(
                cv.ensure_list, [cv.string]
            ),
        },
    }
)


class ButtonPressedTrigger(Trigger):
    """Trigger when a button on the hub is pressed."""

    @classmethod
    @override
    async def async_validate_config(
        cls, hass: HomeAssistant, config: ConfigType
    ) -> ConfigType:
        """Validate the trigger config."""
        return _CONFIG_SCHEMA(config)

    def __init__(self, hass: HomeAssistant, config: TriggerConfig) -> None:
        """Initialize the trigger."""
        super().__init__(hass, config)
        assert config.options is not None
        self._device_ids: list[str] = config.options[ATTR_DEVICE_ID]

    @override
    async def async_attach_runner(
        self,
        run_action: TriggerActionRunner,
        did_not_trigger: TriggerNotTriggeredReporter | None = None,
    ) -> CALLBACK_TYPE:
        """Start listening for button presses."""

        @callback
        def async_button_pressed(device_id: str) -> None:
            """Run the automation for a watched device."""
            if device_id in self._device_ids:
                run_action({ATTR_DEVICE_ID: device_id}, "button pressed")

        return async_dispatcher_connect(
            self._hass, SIGNAL_BUTTON_PRESSED, async_button_pressed
        )
```

The first argument of `run_action` is added to the `trigger` variable that the automation can use in its actions. The second is a short description of what happened, shown in the automation trace and the logbook. `run_action` returns a task, so you can await it if you need to wait for the actions to finish.

`did_not_trigger` is optional. Triggers can call it with a `NotTriggeredInfo` when they looked at a change but decided not to fire, which shows up in the trace.

### Register triggers

Return your triggers from `async_get_triggers` in `trigger.py`, keyed by their key. The key is relative to your domain: `button_pressed` becomes `example.button_pressed`.

```python
TRIGGERS: dict[str, type[Trigger]] = {
    "button_pressed": ButtonPressedTrigger,
}


async def async_get_triggers(
    hass: HomeAssistant,
) -> dict[str, type[Trigger]]:
    """Return the triggers of the Example integration."""
    return TRIGGERS
```

### Describe triggers

`triggers.yaml` tells the automation editor which fields a trigger has, in the same way `services.yaml` does for [actions](/core/integrations/actions/#describe-actions-in-servicesyaml). A trigger has a `target`, `fields`, or both. Each field can have a `selector`, `required`, `default`, and `example`.

```yaml
button_pressed:
  fields:
    device_id:
      required: true
      selector:
        device:
          filter:
            - integration: example
          multiple: true
```

Top-level keys that start with a `.` are ignored, so you can use them for YAML anchors that several triggers share. A trigger without fields is written as `button_pressed: {}`.

### Text and icons

The name and description of every trigger, and the name of every field, go in `strings.json` under `triggers`. See [translations](/core/integrations/translations/#triggers-and-conditions).

```json
{
  "triggers": {
    "button_pressed": {
      "name": "Button pressed",
      "description": "Triggers when one or more buttons are pressed.",
      "fields": {
        "device_id": {
          "name": "Buttons",
          "description": "The buttons to watch."
        }
      }
    }
  }
}
```

Every trigger of a core integration also needs an icon in `icons.json`:

```json
{
  "triggers": {
    "button_pressed": {
      "trigger": "mdi:gesture-tap-button"
    }
  }
}
```

Hassfest checks all of this: an integration that registers triggers needs a `triggers.yaml`, and in a core integration every trigger needs a name, a description, and an icon.

### Triggers based on entity states

Entity domains provide triggers that follow the state of their entities. `homeassistant.helpers.trigger` has base classes and factories for these, like `make_entity_target_state_trigger`, which builds a trigger that fires when an entity reaches a state:

```python
TRIGGERS: dict[str, type[Trigger]] = {
    "turned_off": make_entity_target_state_trigger(DOMAIN, STATE_OFF),
    "turned_on": make_entity_target_state_trigger(DOMAIN, STATE_ON),
}
```

These triggers take a `target` and handle `behavior` and `for` for you. See `homeassistant/components/light/trigger.py` and its `triggers.yaml` for a complete example, including numeric triggers for brightness.

## Conditions

### The condition class

A condition extends `Condition` from `homeassistant.helpers.condition` and implements:

- `async_validate_config`: a class method that validates the configuration, like for triggers.
- `_async_check`: returns whether the condition is met. It is called every time the condition is checked, so keep it fast and do not do I/O.

The constructor gets a `ConditionConfig`, with the `options` and `target` of the condition. This example, from the `moon` integration, tests the phase of the moon:

```python
from typing import Unpack, cast, override

import probatio

from homeassistant.const import CONF_OPTIONS
from homeassistant.core import HomeAssistant
from homeassistant.helpers.condition import (
    Condition,
    ConditionCheckParams,
    ConditionConfig,
)
from homeassistant.helpers.typing import ConfigType

from .const import CONF_PHASE
from .helpers import MOON_PHASES, moon_phase

_IS_PHASE_SCHEMA = probatio.Schema(
    {
        probatio.Required(CONF_OPTIONS, default=dict): {
            probatio.Required(CONF_PHASE): probatio.In(MOON_PHASES),
        }
    }
)


class IsPhaseCondition(Condition):
    """Test if the moon is in a specific phase."""

    @classmethod
    @override
    async def async_validate_config(
        cls, hass: HomeAssistant, config: ConfigType
    ) -> ConfigType:
        """Validate the condition config."""
        return cast(ConfigType, _IS_PHASE_SCHEMA(config))

    def __init__(self, hass: HomeAssistant, config: ConditionConfig) -> None:
        """Initialize the condition."""
        super().__init__(hass, config)
        assert config.options is not None
        self._phase: str = config.options[CONF_PHASE]

    @override
    def _async_check(self, **kwargs: Unpack[ConditionCheckParams]) -> bool:
        """Check the condition."""
        return moon_phase() == self._phase
```

### Register and describe conditions

Conditions work like triggers from here on:

- Return them from `async_get_conditions` in `condition.py`, keyed by their key.
- Describe their fields in `conditions.yaml`, in the same format as `triggers.yaml`.
- Put their names and descriptions in `strings.json`, under `conditions`.
- Give each one an icon in `icons.json`, under `conditions`, with the key `condition`.

```python
CONDITIONS: dict[str, type[Condition]] = {
    "is_phase": IsPhaseCondition,
}


async def async_get_conditions(
    hass: HomeAssistant,
) -> dict[str, type[Condition]]:
    """Return the conditions of the moon integration."""
    return CONDITIONS
```

```yaml
is_phase:
  fields:
    phase:
      required: true
      selector:
        select:
          translation_key: phase
          options:
            - new_moon
            - full_moon
```

For conditions on entity states, `homeassistant.helpers.condition` has `make_entity_state_condition` and base classes like `EntityNumericalConditionBase`. See `homeassistant/components/light/condition.py`.

## Naming

Users see the triggers and conditions of many integrations side by side. Consistent names let them guess how yours work once they know another one.

Pick one name for the kind of device, like "light", "lock", "media player", or "climate-control device", and use it in all your triggers, conditions, and actions. Do not mix variants like "vacuum" and "vacuum cleaner".

### Trigger names

A trigger names an event that just happened, led by the device type.

| Kind of event | Title | Key |
| --- | --- | --- |
| Instant change | "Light turned on", "Door opened", "Button pressed" | `turned_on`, `opened`, `pressed` |
| Start or end of an activity | "Lawn mower started mowing", "Battery stopped charging" | `started_mowing`, `stopped_charging` |
| Measurement | "Temperature changed", "Battery level crossed threshold" | `level_changed`, `level_crossed_threshold` |
| Detection | "Motion detected", "Smoke cleared" | `detected`, `cleared` |
| Status | "Battery became low", "Battery no longer low" | `became_low`, `no_longer_low` |

- Use "started" or "stopped" for activities: "Vacuum cleaner cleaned" sounds finished, "Vacuum cleaner started cleaning" does not.
- Do not use bare states as titles, like "Battery low". They read as a state, not as an event.
- Lead with the device type, also for sensors and zones: "Zone entered", not "Entered zone".
- Descriptions follow "Triggers when one or more [devices] [present tense verb].", like "Triggers when one or more lights turn on."

### Condition names

A condition tests the current state, so its title reads "[Device type] is [state]", like "Light is on" or "Lock is locked". Use "is not" for the opposite, like "Media player is not playing". For values, use "[Device type] [property]", like "Media player volume".

- Keys use `is_`, which keeps conditions apart from triggers and actions: `is_on`, `is_not_playing`, `is_hvac_mode`, `is_brightness`. A subtype goes in front of it, like `blind_is_open`.
- Descriptions follow "Tests if one or more [devices] are [state].", like "Tests if one or more locks are locked." For values: "Tests the [property] of one or more [devices]."

### Keys

- Keys are lowercase `snake_case`, and match the meaning of the title.
- Do not repeat the domain: in the `update` domain, use `became_available`, not `update_became_available`.
- Do not use placeholder keys, like `_`.
- Put a subtype in front: `awning_opened`, `blind_is_open`.

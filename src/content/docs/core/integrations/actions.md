---
title: Actions in integrations
description: Register actions that users call from automations, scripts, and dashboards, describe them in services.yaml, and return response data.
sidebarGroup: Integration features
order: 1
sidebarLabel: Actions
---

An [action](/glossary/action/) is something users can call from an automation, a script, or the **Actions** tab of the developer tools, like `light.turn_on`. Entity integrations, like `light`, provide the common actions. Your integration can register its own, for things that are specific to it, like `sonos.set_sleep_timer`.

This page is about adding actions to your integration. How the action registry works underneath, what a handler gets, and how to call actions from code, is on [how core works: actions](/core/internals/actions/).

Add an action to your own integration first, rather than changing a shared one. When a pattern shows up across integrations, it can become a shared action later.

> [!NOTE]
> In code, actions are still called services: `hass.services`, `ServiceCall`, and `services.yaml`. It is the same thing.

## Register actions in async_setup

Register actions in `async_setup` of your integration, not in `async_setup_entry` and not in a platform. That way they exist even when no config entry is loaded, so automations that use them can be edited and validated, and users get a clear error instead of an unknown action. That is a rule of the Bronze tier of the [quality scale](/core/quality-scale/).

Since your integration now has an `async_setup`, it needs a `CONFIG_SCHEMA`. See [integrations without YAML](/core/integrations/yaml/#integrations-without-yaml).

## Choose the right target

Target the thing the action acts on, at the right level. Do not use a higher or lower level, even if one can be resolved to the other.

- **Entity**: the action controls or needs a specific entity, like setting a sleep timer on a media player. Register an [entity action](#entity-actions).
- **Device**: the action needs a device as a whole, like rebooting it. Use a `device_id` field. Do not use an entity ID as a stand-in for its device.
- **Config entry**: the action needs the integration instance, like creating something in the account at a cloud service. Use a `config_entry_id` field. Do not use a device or entity ID as a stand-in for its config entry.

When an action needs a target, make it required. Do not fall back to a default target: an automation that works today would silently do something else when the user adds a second device.

## Actions for a config entry

```python
import probatio

from homeassistant.const import ATTR_CONFIG_ENTRY_ID
from homeassistant.core import (
    HomeAssistant,
    ServiceCall,
    ServiceResponse,
    SupportsResponse,
)
from homeassistant.helpers import config_validation as cv, service
from homeassistant.helpers.typing import ConfigType

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

GET_FORECAST_SCHEMA = probatio.Schema(
    {
        probatio.Required(ATTR_CONFIG_ENTRY_ID): cv.string,
        probatio.Required("days"): cv.positive_int,
    }
)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Example integration."""

    async def async_get_forecast(call: ServiceCall) -> ServiceResponse:
        """Return the forecast for the coming days."""
        entry: ExampleConfigEntry = service.async_get_config_entry(
            hass, DOMAIN, call.data[ATTR_CONFIG_ENTRY_ID]
        )
        forecast = await entry.runtime_data.client.get_forecast(
            call.data["days"]
        )

        return {"forecast": [day.as_dict() for day in forecast]}

    hass.services.async_register(
        DOMAIN,
        "get_forecast",
        async_get_forecast,
        schema=GET_FORECAST_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )

    return True
```

`service.async_get_config_entry` checks that the config entry exists, belongs to your integration, and is loaded. If not, it raises a `ServiceValidationError` with a translated message. For device targets, `service.async_get_device_and_config_entry(hass, DOMAIN, device_id)` does the same for a device and the config entry that owns it.

## Entity actions

Entity actions run on the entities the user targets. Users can target them by entity, device, area, floor, or label, and Home Assistant resolves that to your entities. Register them with `async_register_platform_entity_service`, under your own domain (like `sonos`), not under the entity domain (like `media_player`):

```python
import probatio

from homeassistant.components.media_player import (
    DOMAIN as MEDIA_PLAYER_DOMAIN,
)
from homeassistant.helpers import config_validation as cv, service


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Sonos integration."""
    service.async_register_platform_entity_service(
        hass,
        DOMAIN,
        "set_sleep_timer",
        entity_domain=MEDIA_PLAYER_DOMAIN,
        schema={probatio.Required("sleep_time"): cv.positive_int},
        func="set_sleep_timer",
    )

    return True
```

This calls the `set_sleep_timer` method of every targeted entity with `sleep_time` as keyword argument. Instead of a method name, `func` can be an async function that receives the entity and the `ServiceCall`. The schema can be a dictionary, which is turned into an entity action schema for you. To only allow entities with certain features, pass `required_features`.

Entity actions support the `exclude` block of a target for you. When a user targets a floor and excludes an area, the entities of that area are not called, also when the target is `entity_id: all`. The `exclude` block is not passed on to your method.

If an action resolves its target itself instead, use `service.async_extract_entities` or `target.async_extract_referenced_entity_ids`, which remove the exclusions. Do not read `entity_id`, `device_id`, or `area_id` from `call.data` and resolve them yourself: the entity action schema accepts `exclude`, so your action would act on exactly the entities the user left out. When you require at least one target in your own schema, use `probatio.AtLeastOne(*cv.TARGET_ID_KEYS)`, so a target with only an exclude block doesn't pass.

## Admin-only actions

Actions that can change configuration, or have other security implications, should only be available to administrators. Register them with `async_register_admin_service` from `homeassistant.helpers.service`, instead of `hass.services.async_register`. It takes `hass` first, then the same arguments, and checks that the user of the call is an admin before your handler runs.

## Raise errors

When an action fails, raise an exception, so the user sees what went wrong: `ServiceValidationError` when the user did something wrong, `HomeAssistantError` for anything else. Use translated messages. See [exceptions in actions](/core/integrations/setup-failures/#exceptions-in-actions-and-entity-methods).

## Return response data

Actions can return data, for automations that need more than the state of an entity, like a list of calendar events or search results. Do not use it for data that fits entity state: a temperature is a sensor, not a response.

Response data is a `dict` that can be serialized to JSON. Pass `supports_response` when you register the action:

| Value | Meaning |
| --- | --- |
| `SupportsResponse.NONE` | The action returns nothing. The default. |
| `SupportsResponse.OPTIONAL` | The action does something, and can also return data. Check `call.return_response` to see if the caller wants it, and return `None` if not. |
| `SupportsResponse.ONLY` | The action does nothing but return data |

Errors are always exceptions, never error codes in the response. Users should not need error handling in their automations.

## Describe actions in services.yaml

Users only use actions they can find. Describe every action in `services.yaml`, so the UI can show the right fields and selectors. The key is the name of the action, without your domain:

```yaml
set_speed:
  target:
    entity:
      domain: fan
      supported_features:
        - fan.FanEntityFeature.SET_SPEED
  fields:
    speed:
      required: true
      example: "low"
      selector:
        select:
          translation_key: "fan_speed"
          options:
            - "off"
            - "low"
            - "medium"
            - "high"
    advanced_options:
      collapsed: true
      fields:
        speed_pct:
          selector:
            number:
              min: 0
              max: 100
```

- `target`: for actions that take entities. It lets users pick entities, devices, and areas. Without a filter it offers every entity, so narrow it with the `entity` [selector](/glossary/selector/). Hassfest refuses a `device` filter on a target: use a device selector in a field for that. With `target`, do not add an `entity_id` field.
- `supported_features`: only offer entities that support at least one of these features. To require several features together, put them in a nested list.
- `fields`: one entry per field, with `required`, an `example`, a `default`, and a `selector` that decides the input in the UI.
- Sections: a key with `collapsed` and its own `fields` groups fields in a collapsible section. It only changes how the fields look: the data is not nested, so the action above gets `{"speed_pct": 50}`.

### Show fields only when they apply

A `filter` on a field shows it only when at least one selected entity supports it. Filters only work in actions with a `target`, because they look at the selected entities: hassfest refuses them in other actions. Use either `supported_features` or `attribute`, not both:

```yaml
temperature:
  filter:
    supported_features:
      - climate.ClimateEntityFeature.TARGET_TEMPERATURE
color_temp:
  filter:
    attribute:
      supported_color_modes:
        - light.ColorMode.COLOR_TEMP
        - light.ColorMode.HS
```

With an `attribute` filter, the field is shown when the attribute of a selected entity has one of the listed values. If the attribute is a list, one matching item is enough.

### Names and descriptions

The name and description of each action and each field are not in `services.yaml`: they are in `strings.json`, under `services`, and every action and field needs one. Keep URLs out of translations with description placeholders, which you pass when you register the action:

```python
hass.services.async_register(
    DOMAIN,
    "get_forecast",
    async_get_forecast,
    schema=GET_FORECAST_SCHEMA,
    supports_response=SupportsResponse.ONLY,
    description_placeholders={"docs_url": "https://example.com/forecast"},
)
```

See [translations](/core/integrations/translations/#actions) for the format, and [make your strings translatable](/translate/guides/developers/).

### Icons

Give each action an icon in `icons.json`, under `services`. Sections can have an icon too:

```json
{
  "services": {
    "start_brewing": {
      "service": "mdi:flask",
      "sections": {
        "advanced_options": "mdi:test-tube"
      }
    }
  }
}
```

## Try it

Open the **Actions** tab of the developer tools, pick your action, fill in the fields, and select **Perform action**.

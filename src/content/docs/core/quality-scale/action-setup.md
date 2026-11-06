---
title: Register actions in async_setup
description: "Bronze rule action-setup: actions are registered when the integration loads, not per config entry."
sidebarLabel: action-setup
sidebarGroup: Bronze
order: 1
---

This is a Bronze rule. In `quality_scale.yaml`, it is called `action-setup`.

If the integration adds its own [actions](/glossary/action/), it registers them in `async_setup`, not in `async_setup_entry`. The actions then exist as soon as the integration loads, whether a [config entry](/glossary/config-entry/) is loaded or not. The validation happens inside the action: check that the config entry it targets exists and is loaded, and raise `ServiceValidationError` when it is not, or when the input is otherwise invalid.

## Why it matters

Many integrations used to register their actions in `async_setup_entry`, and remove them again in `async_unload_entry`. That means the actions only exist while an entry is loaded. When the device is offline at startup, the action is missing, and Home Assistant cannot validate the automations and scripts that use it. The user gets a vague "action not found" instead of a clear reason.

Registered in `async_setup`, the action is always there. When the entry is not loaded, the action itself tells the user why it cannot run.

## Example

Register the actions in `services.py`, in one function called `async_setup_services`. It is a synchronous function, decorated with `@callback`, that takes only `hass`:

```python title="services.py"
@callback
def async_setup_services(hass: HomeAssistant) -> None:
    """Register the actions of My integration."""

    async def async_get_schedule(call: ServiceCall) -> ServiceResponse:
        """Get the schedule of a device."""
        entry: MyConfigEntry = service.async_get_config_entry(
            hass, DOMAIN, call.data[ATTR_CONFIG_ENTRY_ID]
        )
        schedule = await entry.runtime_data.client.get_schedule()
        return {"schedule": schedule}

    hass.services.async_register(
        DOMAIN,
        SERVICE_GET_SCHEDULE,
        async_get_schedule,
        schema=SERVICE_GET_SCHEDULE_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
```

`service.async_get_config_entry` from `homeassistant.helpers.service` does the checks for you. It raises a translated `ServiceValidationError` when the entry does not exist, belongs to another integration, or is not loaded.

Call the function from `async_setup` in `__init__.py`. An integration that is only set up from the UI also needs a `CONFIG_SCHEMA` that says so:

```python title="__init__.py"
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up My integration."""
    async_setup_services(hass)
    return True
```

## How it is checked

- Pylint warns when actions are registered in `async_setup_entry` (`home-assistant-service-registered-in-setup-entry`).
- Pylint warns when actions are registered outside `services.py` (`home-assistant-action-registered-outside-services-module`).
- Pylint warns when `async_setup_services` does not have the shape shown in the example (`home-assistant-invalid-setup-services`).
- The checks inside the action are verified in review.

## Exceptions

If the integration does not register any actions of its own, this rule does not apply.

## Related rules

- [action-exceptions](/core/quality-scale/action-exceptions/): raise exceptions when actions fail.

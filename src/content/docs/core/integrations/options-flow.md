---
title: Options flow
description: Let users change how your integration behaves after setup, and reload it when they do.
sidebarGroup: Setup and configuration
order: 4
---

An [options flow](/glossary/options-flow/) lets users change settings of a config entry after setup, like which devices to include or whether to show guests. Users open it with the **Configure** button of the entry. The options end up in `entry.options`.

Options are for how the integration behaves. Changing how it connects, like a new host, is [reconfiguration](/core/integrations/reauth-reconfigure/), and changing credentials is [reauthentication](/core/integrations/reauth-reconfigure/#reauthentication). The polling interval is not an option either: you pick it for your users, see [appropriate polling](/core/quality-scale/appropriate-polling/).

## Add an options flow

Return your options flow from `async_get_options_flow` on the config flow. The options flow starts at `async_step_init`, and reaches the config entry through `self.config_entry`.

```python
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlowWithReload,
)
from homeassistant.core import callback

OPTIONS_SCHEMA = probatio.Schema(
    {probatio.Required(CONF_SHOW_GUESTS, default=False): bool}
)


class ExampleConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Example."""

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: ConfigEntry,
    ) -> ExampleOptionsFlow:
        """Create the options flow."""
        return ExampleOptionsFlow()


class ExampleOptionsFlow(OptionsFlowWithReload):
    """Handle the options of Example."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Manage the options."""
        if user_input is not None:
            return self.async_create_entry(data=user_input)

        return self.async_show_form(
            step_id="init",
            data_schema=self.add_suggested_values_to_schema(
                OPTIONS_SCHEMA, self.config_entry.options
            ),
        )
```

`async_create_entry` in an options flow does not create a new entry: it stores `data` as the new options of the existing one. `add_suggested_values_to_schema` fills the form with the current options. The texts go in `strings.json` under the `options` key, the same way as the [config flow texts](/core/integrations/flow-steps/#labels-and-descriptions).

The config entry is not available in the `__init__` of the options flow. Use `self.config_entry` in the steps.

## Act on new options

Most integrations need to reload to use new options. Extend `OptionsFlowWithReload` instead of `OptionsFlow`, as in the example above, and Home Assistant reloads the config entry when the options change.

If your integration can apply new options without a reload, extend `OptionsFlow`, and register an update listener when you set up the entry. It runs when the entry is updated, and stops when the entry unloads:

```python
async def async_setup_entry(
    hass: HomeAssistant, entry: ExampleConfigEntry
) -> bool:
    """Set up Example from a config entry."""
    ...
    entry.async_on_unload(entry.add_update_listener(async_update_options))

    return True


async def async_update_options(
    hass: HomeAssistant, entry: ExampleConfigEntry
) -> None:
    """Apply the new options."""
    entry.runtime_data.show_guests = entry.options[CONF_SHOW_GUESTS]
```

Do not combine the two: an `OptionsFlowWithReload` raises an error when the entry has an update listener. An update listener is also called on every other update of the entry, so if you have one, it is in charge of reloading. Home Assistant logs a warning when a reconfigure or reauthentication flow, or a discovery that updates the entry, reloads an entry that has an update listener. That warning is planned to become an error in Home Assistant 2026.12. A subentry reconfigure flow that reloads an entry with an update listener already raises an error.

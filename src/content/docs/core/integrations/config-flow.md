---
title: Config flow
description: Let users add your integration from the UI with a config flow, and make sure the same device is never set up twice.
sidebarGroup: Setup and configuration
order: 2
---

A [config flow](/glossary/config-flow/) is the dialog users go through when they add your integration: a few steps that collect what is needed, check that it works, and create a [config entry](/core/integrations/config-entries/). Discovery starts the same flow when Home Assistant finds one of your devices.

Because the flow validates everything before the entry exists, your integration does not have to check its configuration on every start.

Every integration in core needs a config flow. What it must do to meet the quality scale, like a `data_description` for every field and the split between `data` and `options`, is in the [config-flow](/core/quality-scale/config-flow/) rule.

## Add a config flow

1. Set `"config_flow": true` in the [manifest](/core/integrations/manifest/#config_flow).
2. Create `config_flow.py` with a class that extends `ConfigFlow` and passes your domain.
3. Run `python3 -m script.hassfest` once, so Home Assistant knows your integration has a config flow.

The [scaffold script](/core/integrations/create/) does all three for you.

```python
from typing import Any

import probatio

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.const import CONF_HOST
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import DOMAIN

STEP_USER_SCHEMA = probatio.Schema({probatio.Required(CONF_HOST): str})


class ExampleConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Example."""

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Handle a flow started by the user."""
        errors: dict[str, str] = {}

        if user_input is not None:
            client = ExampleClient(
                user_input[CONF_HOST],
                session=async_get_clientsession(self.hass),
            )

            try:
                device = await client.get_device()
            except ExampleConnectionError:
                errors["base"] = "cannot_connect"
            else:
                await self.async_set_unique_id(device.serial_number)
                self._abort_if_unique_id_configured()

                return self.async_create_entry(
                    title=device.model,
                    data=user_input,
                )

        return self.async_show_form(
            step_id="user",
            data_schema=STEP_USER_SCHEMA,
            errors=errors,
        )
```

Each step is a method named `async_step_<step_id>`. It is called once without input to show its form, and again with the input when the user submits it. A step returns what happens next: a form, a menu, a new entry, or an abort. [Forms, menus, and progress](/core/integrations/flow-steps/) covers all of them.

Schemas are written with Probatio (`import probatio`), the validation library Home Assistant uses, often combined with [selectors](/glossary/selector/).

## Reserved steps

Some step names have a fixed meaning. Home Assistant calls them for you:

| Step | When it runs |
| --- | --- |
| `user` | The user adds the integration from the UI. Also used for discovery if you do not implement the matching discovery step. |
| `reconfigure` | The user reconfigures an existing entry. See [reauthentication and reconfiguration](/core/integrations/reauth-reconfigure/). |
| `reauth` | Your integration reports that its credentials no longer work |
| `bluetooth`, `dhcp`, `homekit`, `mqtt`, `ssdp`, `usb`, `zeroconf` | Your device was discovered through the matcher in your [manifest](/core/integrations/manifest/#discovery) |
| `hassio` | A Supervisor app announced itself to your integration |
| `integration_discovery` | Another integration found a device for you. See [discovery](/core/integrations/discovery/#discovery-by-another-integration). |
| `import` | Reserved for moving YAML configuration into a config entry |
| `discovery` | Deprecated. Called when a discovery step for the source is missing. |

## Unique IDs

A unique ID ties a config entry to the device or account behind it, so it cannot be set up twice. Set it in the flow with `async_set_unique_id`, and the config entry inherits it. It only needs to be unique within your integration.

```python
# Abort if another flow for this device is already in progress
await self.async_set_unique_id(device.serial_number)

# Abort if a config entry for this device already exists
self._abort_if_unique_id_configured()
```

When the flow aborts because the entry exists, users see the `already_configured` abort reason from your `strings.json`. Use the shared string for it:

```json
{
  "config": {
    "abort": {
      "already_configured": "[%key:common::config_flow::abort::already_configured_device%]"
    }
  }
}
```

A unique ID also lets users ignore a discovered device, so they are not asked about it again. That is why discovery requires one.

### Update connection details on the fly

When a device on the local network gets a new IP address, the unique ID lets you update the existing entry from a discovery step. Pass the new values to `_abort_if_unique_id_configured`. If the data changed, Home Assistant updates the entry and reloads it:

```python
await self.async_set_unique_id(serial_number)
self._abort_if_unique_id_configured(updates={CONF_HOST: host})
```

The reload only happens when the entry is loaded or waiting to retry its setup. Pass `reload_on_update=False` to update the entry without a reload. Even without changes, a discovery reloads an entry that is waiting to retry its setup: the device is evidently online again.

### What makes a good unique ID

It must be a string, stable, and not something the user can change.

- **Good**: a serial number, a MAC address formatted with `homeassistant.helpers.device_registry.format_mac`, a unique identifier printed on the device or burned into it, or a latitude and longitude.
- **Sometimes fine for local devices**: a hostname, if part of it contains one of the good sources.
- **Sometimes fine for cloud services**: an email address in lowercase, a username (in lowercase if usernames are not case sensitive), or an account ID that cannot collide.
- **Never**: an IP address, a device name, a URL, or a hostname the user can change.

Get the MAC address from the device API or from discovery. Tools that read the ARP cache, like `getmac`, do not work in every network setup Home Assistant runs in.

### Discovery without a unique ID

If some of your devices have no unique ID, call this in the discovery step instead. Discovery then still works, as long as no entry of your integration exists yet:

```python
if device_unique_id:
    await self.async_set_unique_id(device_unique_id)
else:
    await self._async_handle_discovery_without_unique_id()
```

If you never get a unique ID, leave the discovery steps out. Home Assistant then calls your `user` step when it discovers a device, as long as your integration has no config entry yet.

## Discovery steps

A discovery step receives a service info object with what was found, like a `ZeroconfServiceInfo`. It has to:

- Make sure no other flow is already setting up the same device. Setting the unique ID usually takes care of that. When the same device can be found in several ways that give different unique IDs, implement `is_matching(self, other_flow)` on your flow, and call `self.hass.config_entries.flow.async_has_matching_flow(self)`. Home Assistant then calls `is_matching` for every other flow in progress.
- Make sure the device is not already set up.
- Always ask the user to confirm. A discovery step must never create an entry by itself.

```python
async def async_step_zeroconf(
    self, discovery_info: ZeroconfServiceInfo
) -> ConfigFlowResult:
    """Handle a discovered device."""
    serial_number = discovery_info.properties["serialno"]
    await self.async_set_unique_id(serial_number)
    self._abort_if_unique_id_configured(
        updates={CONF_HOST: discovery_info.host}
    )

    self._host = discovery_info.host
    self.context["title_placeholders"] = {"name": serial_number}

    return await self.async_step_discovery_confirm()


async def async_step_discovery_confirm(
    self, user_input: dict[str, Any] | None = None
) -> ConfigFlowResult:
    """Ask the user to confirm the discovered device."""
    if user_input is not None:
        return self.async_create_entry(
            title=self.unique_id, data={CONF_HOST: self._host}
        )

    self._set_confirm_only()

    return self.async_show_form(step_id="discovery_confirm")
```

`_set_confirm_only()` tells the frontend this step only asks for confirmation. See [discovery](/core/integrations/discovery/) for how devices get found in the first place.

### Discoverable integrations without authentication

If your integration is discoverable and needs no authentication, you might not need to write a flow at all. `python3 -m script.scaffold integration` generates this flow when you answer that your device is discoverable and needs no authentication. For an existing integration, run `python3 -m script.scaffold config_flow_discovery`. The flow checks whether any devices can be found before it finishes, supports every discovery method in the manifest, and allows a single config entry that takes care of all devices.

The generated `config_flow.py` has no flow class. It calls `config_entry_flow.register_discovery_flow()` with your domain, a title, and a function that returns whether any device can be found. Home Assistant only calls that function when a user adds the integration by hand and no discovered device is waiting to be set up.

#### Scanning in the flow and in setup

Many discovery protocols wait for a timeout to collect every device that answers. Your function only has to know whether there is at least one, and then `async_setup_entry` has to find all of them. That looks like scanning twice. The integrations in core that use this helper accept that, and keep the cost low:

- Nothing the function finds reaches setup. The helper creates the entry with empty `data`, and skips the function when the flow started from discovery. Setup also runs on every start of Home Assistant. So setup always does its own discovery, and only the first setup by hand scans twice.
- Return as soon as one device answers, instead of waiting for the full timeout. Govee lights local polls until the first device shows up, within a timeout. Deako asks for a single address. Fjäråskupan does not scan at all: it checks the Bluetooth devices Home Assistant has already seen.
- In setup, keep discovering, and add entities for devices that show up later. Gree, Refoss, and Zerproc scan again on an interval with `async_track_time_interval()`. Govee lights local and Escea keep a listener running. A device that answers late still gets added.

Escea is the one exception that shares work between the two. Its function starts a discovery service and stores it in `hass.data`, and `async_setup_entry` picks up the running service instead of starting a second one. When the function finds nothing, it stops the service again. This only makes sense when your library has a discovery service that runs for as long as the entry is loaded.

## The flow title

The title of a flow in the UI, like the name of a discovered device, is chosen in this order:

1. If the flow sets `title_placeholders` in `self.context`, and it is not empty:
   1. With a `flow_title` in your translations, that string is used, with the placeholders filled in.
   2. Without a `flow_title`, the `name` placeholder is used, if there is one.
2. The `title` of your translations.
3. The `name` of the manifest.
4. The domain.

Reauthentication flows set `title_placeholders` to `{"name": <entry title>}` by themselves.

## Texts and translations

All text of the flow lives in `strings.json`, under the `config` key: titles, descriptions, field labels, errors, and abort reasons. For example:

```json
{
  "config": {
    "step": {
      "user": {
        "data": {
          "host": "[%key:common::config_flow::data::host%]"
        },
        "data_description": {
          "host": "The hostname or IP address of your Example device."
        }
      }
    },
    "error": {
      "cannot_connect": "[%key:common::config_flow::error::cannot_connect%]"
    },
    "abort": {
      "already_configured": "[%key:common::config_flow::abort::already_configured_device%]"
    }
  }
}
```

While developing, run `python3 -m script.translations develop` to see changes to `strings.json` in the UI. See [translations](/core/integrations/translations/#flows) for every key, [make your strings translatable](/translate/guides/developers/) for the rules, and [forms, menus, and progress](/core/integrations/flow-steps/#labels-and-descriptions) for the keys of a step.

## Continue in another flow

A flow can start another flow, and let the frontend show it as soon as the first one finishes. Pass `next_flow` to `async_create_entry`, with the type and ID of the next flow:

```python
from homeassistant.config_entries import SOURCE_USER, FlowType

result = await self.hass.config_entries.flow.async_init(
    "other_domain", context={"source": SOURCE_USER}
)

return self.async_create_entry(
    title="Example",
    data={},
    next_flow=(FlowType.CONFIG_FLOW, result["flow_id"]),
)
```

Subentry flows and options flows need the config entry to exist before they start. To continue with one of those, override `async_on_create_entry`. It runs after the entry is created:

```python
from homeassistant.config_entries import SubentryFlowContext


async def async_on_create_entry(
    self, result: ConfigFlowResult
) -> ConfigFlowResult:
    """Start adding a location right after the entry is created."""
    subentry_result = await self.hass.config_entries.subentries.async_init(
        (result["result"].entry_id, "location"),
        context=SubentryFlowContext(source=SOURCE_USER),
    )
    result["next_flow"] = (
        FlowType.CONFIG_SUBENTRIES_FLOW,
        subentry_result["flow_id"],
    )

    return result
```

## Simple flows with SchemaConfigFlowHandler

For helpers and other integrations with simple flows, `SchemaConfigFlowHandler` defines the whole config flow and options flow as data. Keep its limits in mind:

- All input is stored in the `options` of the entry, not in `data`. That makes it unsuitable for connection details or API keys.
- Extensive validation, unique IDs, or duplicate checks are often easier in a normal config flow.
- Starting the flow with steps other than `user` and `import` is discouraged.

```python
from homeassistant.helpers.schema_config_entry_flow import (
    SchemaCommonFlowHandler,
    SchemaConfigFlowHandler,
    SchemaFlowError,
    SchemaFlowFormStep,
)


async def validate_options(
    handler: SchemaCommonFlowHandler, user_input: dict[str, Any]
) -> dict[str, Any]:
    """Validate the options."""
    if user_input[CONF_THRESHOLD] < 0:
        # The error key must exist in strings.json
        raise SchemaFlowError("negative_threshold")

    return user_input


OPTIONS_SCHEMA = probatio.Schema(
    {probatio.Required(CONF_THRESHOLD): NumberSelector()}
)

CONFIG_FLOW = {
    "user": SchemaFlowFormStep(
        probatio.Schema({probatio.Required(CONF_NAME): TextSelector()}),
        next_step="options",
    ),
    "options": SchemaFlowFormStep(
        OPTIONS_SCHEMA, validate_user_input=validate_options
    ),
}

OPTIONS_FLOW = {
    "init": SchemaFlowFormStep(
        OPTIONS_SCHEMA, validate_user_input=validate_options
    ),
}


class ExampleConfigFlowHandler(SchemaConfigFlowHandler, domain=DOMAIN):
    """Handle a config flow for Example."""

    config_flow = CONFIG_FLOW
    options_flow = OPTIONS_FLOW
    # Reload the entry when the options change
    options_flow_reloads = True

    def async_config_entry_title(self, options: Mapping[str, Any]) -> str:
        """Return the title of the config entry."""
        return cast(str, options[CONF_NAME])
```

## Test your config flow

Integrations in core need full test coverage of `config_flow.py`. Test every path: success, every error, every abort, and that a second setup of the same device aborts. See [writing tests](/core/development/tests/).

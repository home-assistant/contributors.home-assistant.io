---
title: Create an integration
description: Generate a new integration with the scaffold script, and learn what the smallest possible integration looks like.
sidebarGroup: Getting started
order: 4
---

The fastest way to start a new integration is the scaffold script in the [core repository](https://github.com/home-assistant/core). It asks you a few questions and generates a working integration with a config flow, tests, and translations, so you can start with the part that is specific to your device or service.

This page is the reference for the scaffold and the parts of an integration. Want to be walked through it instead? Follow the [tutorial](/core/integrations/tutorial/).

## Does it belong in core?

Check this before you write any code.

For a new integration, the project recommends that you publish it in the [Marketplace](/marketplace/) first, as a [custom integration](/glossary/custom-integration/). You gain experience, and you can iterate faster. Once it has matured and has a user base, ask in the **#developers** channel on [Discord](https://www.home-assistant.io/join-chat/) whether it should ship built in. [Publish a custom integration](/marketplace/guides/integrations/) explains what is different outside core.

To ship built in, an integration has to meet these requirements:

- The product or service must be available for people to buy and use today. Products that are not released yet, private betas, and crowdfunding projects do not qualify.
- It must be established, with an actual user base. Home Assistant is not a marketing platform for new products.
- All communication goes through a Python library on PyPI that meets the [dependency-transparency](/core/quality-scale/dependency-transparency/) rule. See [build a Python library](/core/integrations/api-library/).

Not sure where yours fits? Ask in **#developers** before you start.

## Keep the first pull request small

A new integration must reach the Bronze tier of the [integration quality scale](/core/quality-scale/), and nothing more. Reviewers ask for a minimal first pull request:

- One platform only, like just `sensor`.
- No diagnostics, custom actions, reauthentication flow, or reconfigure flow.
- No options flow, unless the integration really cannot work without one.
- Leave the harder rules, like `dynamic-devices` and `stale-devices`, for later.

Everything else comes in follow up pull requests, one at a time. Big pull requests that dump a lot of code at once may be closed. [Submitting a pull request](/core/development/submitting/#new-integrations) explains what to put in the description.

You need a [development environment](/core/development/environment/) for the rest of this page. Run every command from the root of your core checkout.

## Run the scaffold script

```shell
python3 -m script.scaffold integration
```

The script asks for:

- **Domain**: the short, unique name of your integration, like `airgradient`. It becomes the folder name and can never change. See [the manifest](/core/integrations/manifest/#domain).
- **Name**: the name users see, like "AirGradient".
- **GitHub handle**: you become the first [integration owner](/glossary/integration-owner/).
- **PyPI package**: the library that talks to your device or service, pinned with `==`. Leave it blank if you do not have one yet.
- **IoT class**: how the integration gets its data, like `local_polling` or `cloud_push`.
- **Authentication, discovery, OAuth 2.0, and integration type**: these decide which kind of config flow the script generates.

Based on your answers, the script picks one of these config flow templates:

| Your answers | Template |
| --- | --- |
| The integration type is `helper` | `config_flow_helper` |
| Users log in with OAuth 2.0 | `config_flow_oauth2` |
| Users need to authenticate, or the device is not discoverable | `config_flow` |
| Discoverable, no authentication | `config_flow_discovery` |

When it is done, the script runs hassfest, updates the requirement files, and generates the English translations from `strings.json`. You end up with a folder in `homeassistant/components/<domain>/` and a matching test folder in `tests/components/<domain>/`.

> [!NOTE]
> The scaffold leaves `TODO` comments where your code goes, and a placeholder class that you replace with your library. Search for `TODO` before you open a pull request.

## Other scaffold templates

The same script adds pieces to an integration that already exists. Run it with the name of a template, and it asks which integration to change:

| Template | Adds |
| --- | --- |
| `config_flow` | A config flow with a form |
| `config_flow_discovery` | A config flow for discoverable devices without authentication |
| `config_flow_oauth2` | A config flow that uses [OAuth 2.0](/core/integrations/oauth2/) |
| `config_flow_helper` | A config flow for a helper |
| `device_trigger` | [Device triggers](/core/integrations/device-automations/) |
| `device_condition` | [Device conditions](/core/integrations/device-automations/) |
| `device_action` | [Device actions](/core/integrations/device-automations/) |
| `reproduce_state` | [Reproduce state](/core/integrations/reproduce-state/) support |
| `significant_change` | [Significant change](/core/integrations/significant-change/) support |
| `backup` | A [backup platform](/core/integrations/backup/) |

For example, to add device triggers:

```shell
python3 -m script.scaffold device_trigger
```

## The smallest possible integration

The scaffold generates more than the bare minimum. It helps to know what is required, so you know what is optional. An integration needs two things:

- A `manifest.json` with at least a `domain` and a `name`.
- An `__init__.py` with a setup function that returns whether setup succeeded.

```json
{
  "domain": "hello_state",
  "name": "Hello, state!"
}
```

```python
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

DOMAIN = "hello_state"


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the integration."""
    hass.states.async_set("hello_state.world", "Paulus")

    return True
```

This integration loads when `hello_state:` is in `configuration.yaml`. That is fine to learn from, but integrations that talk to devices or services are set up from the UI with a [config flow](/core/integrations/config-flow/), not from YAML. See [YAML configuration](/core/integrations/yaml/) for the rules.

## Platforms: the entities of your integration

Your integration provides [entities](/glossary/entity/) by adding a [platform](/glossary/platform/) for each entity type it supports. To provide a light, add `light.py`. To provide a sensor, add `sensor.py`. Each platform file has an `async_setup_entry` function that creates the entities, and your integration forwards its config entry to them:

```python
from homeassistant.const import Platform

PLATFORMS = [Platform.LIGHT, Platform.SENSOR]


async def async_setup_entry(hass: HomeAssistant, entry: MyConfigEntry) -> None:
    """Set up the integration from a config entry."""
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
```

See [config entries](/core/integrations/config-entries/#set-up-the-platforms) for the full setup and unload flow, and [entities and platforms](/core/entities/) for what each entity type supports.

## Talk to devices through a library

Your integration never talks to a device or service directly. All protocol and API code lives in a separate Python library, published on PyPI, which your integration lists as a [requirement](/core/integrations/manifest/#requirements). This keeps Home Assistant maintainable, and lets the rest of the Python community use that code too.

The integration translates between that library and Home Assistant: it sets up the library, turns its data into entities, and turns user actions into library calls. [Build a Python library](/core/integrations/api-library/) explains how to write one.

## Core and custom integrations

Integrations in the core repository live in `homeassistant/components/`. A [custom integration](/glossary/custom-integration/) lives in the `custom_components/` folder of a user's configuration directory. They are built the same way, with two differences in the manifest: a custom integration needs a `version`, and its `documentation` points to its own documentation, not to home-assistant.io.

The [example-custom-config repository](https://github.com/home-assistant/example-custom-config/tree/master/custom_components/) has small example integrations, such as one that sets up platforms from a config entry. They are custom integrations, so they include a `version`.

## Next steps

- Build a complete integration step by step in the [tutorial](/core/integrations/tutorial/).
- Look at the [file structure](/core/integrations/file-structure/) of an integration.
- Fill in the [manifest](/core/integrations/manifest/).
- Build the [config flow](/core/integrations/config-flow/) and get the data with a [coordinator](/core/integrations/fetching-data/).
- Check the [Bronze tier rules](/core/quality-scale/rules/#bronze) of the quality scale.

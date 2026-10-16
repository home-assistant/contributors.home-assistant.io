---
title: YAML configuration
description: When an integration may still be configured in configuration.yaml, and how Home Assistant validates that configuration.
sidebarGroup: Setup and configuration
order: 8
---

`configuration.yaml` is the configuration file users write themselves. For a long time, it was how every integration was set up. Today, most integrations are set up in the UI, with a [config flow](/core/integrations/config-flow/).

## When YAML is allowed

The rule comes from [ADR-0010](https://github.com/home-assistant/architecture/blob/master/adr/0010-integration-configuration.md):

- Integrations that talk to devices or services are only configured in the UI. In rare cases an exception is made.
- All other integrations, like helpers or integrations that only process data, can be configured in YAML, in the UI, or both.

This applies to every new integration. Existing integrations that talk to devices or services and still have YAML are encouraged to add a config flow and remove YAML support. Changes to their YAML configuration are no longer accepted.

## Integrations without YAML

Even without YAML support, your `__init__.py` often has an `async_setup` function, for example to [register actions](/core/integrations/actions/). Hassfest requires every integration with an `async_setup` or `setup` function in `__init__.py` to define a `CONFIG_SCHEMA` there. It also accepts a `PLATFORM_SCHEMA` or `PLATFORM_SCHEMA_BASE`, which entity integrations like `sensor` define, or an `async_validate_config` function in `config.py`. Without YAML support, use one of these helpers from `homeassistant.helpers.config_validation`:

```python
from homeassistant.helpers import config_validation as cv

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
```

| Helper | Use it when |
| --- | --- |
| `config_entry_only_config_schema` | The integration is only set up from config entries. If a user adds the domain to YAML anyway, Home Assistant logs an error and creates a repair issue that points to adding the integration in the UI. |
| `platform_only_config_schema` | The integration only has platforms configured in YAML, nothing under its own key |
| `empty_config_schema` | The integration can be set up with its key in YAML, but takes no options |

## How YAML is validated

When Home Assistant loads an integration that is configured in YAML, it first validates the configuration with the `CONFIG_SCHEMA` of the integration. The `config` your setup function receives is the result of that validation.

```python
import probatio

from homeassistant.helpers import config_validation as cv

CONFIG_SCHEMA = probatio.Schema(
    {
        DOMAIN: probatio.Schema(
            {
                probatio.Required(CONF_NAME): cv.string,
                probatio.Optional(CONF_PORT, default=80): cv.port,
            }
        )
    },
    extra=probatio.ALLOW_EXTRA,
)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the integration from YAML."""
    if DOMAIN not in config:
        return True

    name = config[DOMAIN][CONF_NAME]
    ...
    return True
```

The schema gets the whole configuration, so use `extra=probatio.ALLOW_EXTRA` to leave the keys of other integrations alone.

## Platforms in YAML

Older integrations put their configuration under the domain of an entity integration, with a `platform` key:

```yaml
sensor:
  - platform: example
    name: "Outside"
```

That is the existing mechanism for entity integrations, and new integrations must not use it. Per [ADR-0007](https://github.com/home-assistant/architecture/blob/master/adr/0007-integration-config-yaml-structure.md), all YAML configuration of an integration goes under its own domain key. The integration then loads its platforms itself, with `async_load_platform` from `homeassistant.helpers.discovery`:

```python
from homeassistant.const import Platform
from homeassistant.helpers.discovery import async_load_platform


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the integration and its platforms from YAML."""
    hass.async_create_task(
        async_load_platform(
            hass, Platform.SENSOR, DOMAIN, config[DOMAIN], config
        )
    )

    return True
```

The platform receives the data as `discovery_info` in its `async_setup_platform`. The YAML configuration in platform sections of existing integrations is frozen until the integration is refactored.

For entity integrations, `PLATFORM_SCHEMA` is how this works under the hood. Home Assistant collects the configuration of every key that starts with the domain (like `sensor:` and `sensor living room:`), validates each item first against the schema of the entity integration (`PLATFORM_SCHEMA_BASE`, or else `PLATFORM_SCHEMA`) and then against the `PLATFORM_SCHEMA` of its platform, if it has one, and drops items for unknown platforms or with invalid configuration.

## Move from YAML to a config flow

When an integration moves to a config flow, existing YAML configuration is usually imported once. `async_setup` starts the flow with the `import` source, the config flow creates the entry in `async_step_import`, and the integration creates a [repair issue](/core/integrations/repairs/) that tells users to remove the YAML. Moving away from YAML is a [backward-incompatible change](/glossary/backward-incompatible-change/), so follow the [deprecation process](/core/development/deprecating/).

For OAuth 2.0 credentials in YAML, see [credentials from YAML](/core/integrations/oauth2/#credentials-from-yaml).

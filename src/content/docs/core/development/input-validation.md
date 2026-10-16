---
title: Validating input
description: Validate what users give your integration with probatio schemas and the helpers in config_validation, in config flows, actions, and YAML.
sidebarGroup: Write code
order: 6
---

Whatever a user gives your integration, check it before you use it. That goes for a config flow form, the data of an action, and YAML configuration. A clear error up front beats a confusing failure halfway through the setup.

Core validates input with schemas from [probatio](https://pypi.org/project/probatio/). A schema says which keys are required or optional, and what type or values each key accepts.

```python
import probatio

from homeassistant.const import CONF_HOST, CONF_PASSWORD, CONF_PORT
from homeassistant.helpers import config_validation as cv

DEFAULT_PORT = 993

DATA_SCHEMA = probatio.Schema(
    {
        probatio.Required(CONF_HOST): cv.string,
        probatio.Required(probatio.Secret(CONF_PASSWORD)): cv.string,
        probatio.Optional(CONF_PORT, default=DEFAULT_PORT): probatio.Port(),
    }
)
```

In a config flow, you pass a schema like this as the `data_schema` of a step. For YAML, the schema is the `CONFIG_SCHEMA` of the integration. [Building integrations](/core/integrations/) covers both.

## Rules for schemas

- Import probatio as `import probatio`. Ruff blocks the old `vol` alias, and it blocks voluptuous itself.
- Use the `CONF_*` constants from `homeassistant.const` when one exists, and your own from `const.py` otherwise.
- Put the required keys first, then the optional ones.
- A default must be a valid value. Never use `default=None` for a string: use `default=""` if you need a default at all.

## Helpers in config_validation

Next to the validators of probatio, `homeassistant.helpers.config_validation`, usually imported as `cv`, has validators for things that are specific to Home Assistant:

- **Types**: `cv.string`, `cv.byte`, `cv.boolean`
- **Entity IDs**: `cv.entity_id`, `cv.entity_ids`
- **Numbers**: `cv.small_float`, `cv.positive_int`
- **Time**: `cv.time`, `cv.time_zone`
- **Other**: `cv.template`, `cv.slug`, `cv.temperature_unit`, `cv.latitude`, `cv.longitude`, `cv.isfile`, `cv.sun_event`, `cv.url`, `cv.icon`

For MQTT topics, the MQTT integration has `valid_subscribe_topic` and `valid_publish_topic` in `homeassistant/components/mqtt/util.py`.

Some of the older `cv` helpers are now thin wrappers around a probatio validator. In core, a lint rule makes you use the probatio version directly:

| Instead of | Use |
| --- | --- |
| `cv.ensure_list` | `probatio.EnsureList()` |
| `cv.port` | `probatio.Port()` |
| `cv.has_at_least_one_key` | `probatio.AtLeastOne` |
| `cv.has_at_most_one_key` | `probatio.AtMostOne` |

The `cv` names keep working for custom integrations.

## Examples

### Limit the choices

```python
DATA_SCHEMA = probatio.Schema(
    {
        probatio.Optional(CONF_METHOD, default="GET"): probatio.In(
            ["GET", "POST"]
        ),
    }
)
```

### A list of known options

```python
SENSOR_TYPES = {
    "article_cache": ("Article cache", "MB"),
    "average_download_rate": ("Average speed", "MB/s"),
}

DATA_SCHEMA = probatio.Schema(
    {
        probatio.Optional(CONF_MONITORED_VARIABLES, default=[]): probatio.All(
            probatio.EnsureList(), [probatio.In(SENSOR_TYPES)]
        ),
    }
)
```

### Secrets

Wrap a key in `probatio.Secret` when its value grants access, like a password, a token, an API key, or a PIN. When validation fails, the error then names the key and the problem, but not the value, so the secret does not end up in the log:

```text
Invalid config for 'demo': value should be a string for dictionary value
'password', got **REDACTED**
```

Only mark real secrets. A host name, a serial number, or a GPIO pin is not a secret, and hiding it makes the error useless to the person trying to fix their configuration.

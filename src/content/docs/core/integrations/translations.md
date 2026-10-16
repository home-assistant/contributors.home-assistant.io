---
title: Integration translations
description: Every section of an integration's strings.json, how references and placeholders work, and how custom integrations ship their own translations.
sidebarGroup: Reference
order: 3
sidebarLabel: Translations
---

Every piece of text your integration shows to users lives in `strings.json`, in the folder of your integration. Code never contains user facing text: it refers to a key, and Home Assistant looks up the text in the language of the user. That covers the config flow, entity names and states, errors, repair issues, actions, and more.

`strings.json` holds the English source text. After your pull request is merged, the English strings are uploaded to [Lokalise](/glossary/lokalise/), translators translate them, and the translations are pulled back into core. You do not need to do anything for that. See [how translation works](/translate/how-it-works/) for the whole journey, and [make your strings translatable](/translate/guides/developers/) for how to write strings that translators can work with.

This page is the reference for the file itself: which sections exist and what goes in them. The structure is checked by hassfest (`script/hassfest/translations.py` in core), so when this page and hassfest disagree, hassfest wins.

## See your changes

Home Assistant does not read `strings.json` directly. It reads the compiled files in the `translations` folder of the integration, which are generated and not committed. Compile your strings to see them in the UI:

```shell
python3 -m script.translations develop --integration example
```

Leave out `--integration` to be asked for one, or use `--all` for all integrations. If a change does not show, restart Home Assistant and clear the cache of your browser.

## The sections

All sections are optional. Add the ones your integration needs.

| Section | What it translates |
| --- | --- |
| `title` | The name of the integration, only when it is not a brand name |
| `common` | Strings your integration reuses in several places |
| `config` | The [config flow](/core/integrations/config-flow/) |
| `options` | The [options flow](/core/integrations/options-flow/) |
| `config_subentries` | The flows of [subentries](/core/integrations/subentries/) |
| `selector` | Options and labels of selectors in flows, actions, triggers, and conditions |
| `entity` | Names, states, state attributes, and units of your entities |
| `entity_component` | States and attributes of an entity domain, for integrations that are one, like `sensor` |
| `device` | Names of your devices |
| `exceptions` | Messages of exceptions you raise |
| `issues` | [Repair](/core/integrations/repairs/) issues and their repair flows |
| `services` | Names and descriptions of your [actions](/core/integrations/actions/) and their fields |
| `triggers` | Names and descriptions of your [triggers](/core/integrations/triggers-and-conditions/) |
| `conditions` | Names and descriptions of your [conditions](/core/integrations/triggers-and-conditions/) |
| `device_automation` | [Device triggers, conditions, and actions](/core/integrations/device-automations/) |
| `system_health` | Labels on the [system health](/core/integrations/system-health/) page |
| `application_credentials` | The explanation in the [application credentials](/core/integrations/oauth2/#help-users-create-credentials) dialog |
| `preview_features` | [Labs](/core/development/labs/) preview features |

A few more sections exist for specific integrations: `config_panel` for integrations that bring their own configuration panel, like ZHA and KNX, and `conversation` for the conversation integration. The `auth`, `onboarding`, and `homeassistant_hardware` integrations each have their own schema.

## Title

The name of your integration comes from the [manifest](/core/integrations/manifest/), and is a brand name in almost every case. Brand names are not translated, so leave `title` out.

Only add `title` when the name is a description rather than a brand, like "Local calendar". For core integrations, hassfest refuses a `title` that equals the name in the manifest, unless the integration is on its allow list.

## Flows

`config`, `options`, and each type under `config_subentries` share one format:

```json
{
  "config": {
    "flow_title": "{name} ({host})",
    "step": {
      "user": {
        "title": "Connect to your hub",
        "description": "Enter the address of your Example hub.",
        "data": {
          "host": "[%key:common::config_flow::data::host%]"
        },
        "data_description": {
          "host": "The hostname or IP address of your hub."
        }
      }
    },
    "error": {
      "cannot_connect": "[%key:common::config_flow::error::cannot_connect%]"
    },
    "abort": {
      "no_devices_found": "[%key:common::config_flow::abort::no_devices_found%]"
    }
  }
}
```

| Key | What it is |
| --- | --- |
| `flow_title` | The title of a flow in the list of discovered devices. See [the flow title](/core/integrations/config-flow/#the-flow-title). |
| `step` | Per step ID: `title`, `description`, `data`, `data_description`, `sections`, `menu_options`, `menu_option_descriptions`, and `submit` (the label of the submit button) |
| `error` | Errors shown on a form, keyed by the error you return |
| `abort` | Reasons a flow aborts. Supports Markdown. |
| `progress` | Messages for a progress step, keyed by `progress_action` |
| `create_entry` | Messages shown when the entry is created. `default` is used when you pass no description. |
| `initiate_flow` | Labels of the buttons that start a flow. `user` is required when you add it. |

Every key in `data_description` needs a matching key in `data`. The keys of a step are explained in [forms, menus, and progress](/core/integrations/flow-steps/#labels-and-descriptions).

Subentry types also need `entry_type` and `initiate_flow`. See [subentries](/core/integrations/subentries/#texts-and-translations). Helper integrations must give their `user` step a `description`.

## Selectors

Selectors in a flow, an action, a trigger, or a condition get their own text through a `translation_key` in their config. The text goes under `selector`, keyed by that translation key:

```json
{
  "selector": {
    "fan_speed": {
      "options": {
        "off": "[%key:common::state::off%]",
        "low": "Low",
        "high": "High"
      }
    }
  }
}
```

```python
SelectSelector(
    SelectSelectorConfig(
        options=["off", "low", "high"],
        translation_key="fan_speed",
    )
)
```

Which keys apply depends on the selector:

- `options`: the options of a select selector
- `unit_of_measurement`: the units of a number selector
- `choices`: the choices of a choose selector
- `fields`: the fields of an object selector, each with a `name`, an optional `description`, and an optional `overview_label`

An object selector shows the items you added as a list, with the values of their fields. The `overview_label` of a field sets the text for its value in that list. It must contain the `{value}` placeholder and no other placeholders. The frontend fills in the formatted value of the field, so your code passes nothing. Without an `overview_label`, the list shows only the value.

```json
{
  "selector": {
    "sensor_offsets": {
      "fields": {
        "uncompensated": {
          "name": "Uncompensated value",
          "description": "The value before the offset is applied.",
          "overview_label": "Uncompensated value: {value}"
        }
      }
    }
  }
}
```

## Entities

The `entity` section translates your entities, keyed by entity domain and then by the [translation key](/glossary/translation-key/) of the entity:

```json
{
  "entity": {
    "sensor": {
      "operating_mode": {
        "name": "Operating mode",
        "state": {
          "eco": "Eco",
          "boost": "Boost"
        },
        "state_attributes": {
          "fan_mode": {
            "name": "Fan mode",
            "state": {
              "quiet": "Quiet"
            }
          }
        }
      },
      "goal": {
        "name": "Goal",
        "unit_of_measurement": "steps"
      }
    }
  }
}
```

- `name`: the name of the entity. See [translated names](/core/entities/naming/#translated-names), including placeholders in names.
- `state`: the text for each state. States are lowercase keys, like `eco`, never text. See the [select](/core/entities/select/) entity for an example.
- `state_attributes`: the name and the states of attributes.
- `unit_of_measurement`: a unit that is a word, like "steps". An entity with a translated unit does not set `native_unit_of_measurement`. See [sensor](/core/entities/sensor/).

States, state attributes, and units cannot contain placeholders. Icons use the same translation key, in `icons.json`. See [icons](/core/entities/icons/).

Entity translations are a rule of the Gold tier of the quality scale: see [entity translations](/core/quality-scale/entity-translations/).

## Entity components

Integrations that are an entity domain, like `sensor` or `binary_sensor`, translate their states and attributes under `entity_component`, keyed by device class. The key `_` is for entities without a device class:

```json
{
  "entity_component": {
    "_": {
      "name": "Binary sensor",
      "state": {
        "off": "[%key:common::state::off%]",
        "on": "[%key:common::state::on%]"
      }
    },
    "door": {
      "name": "Door",
      "state": {
        "off": "[%key:common::state::closed%]",
        "on": "[%key:common::state::open%]"
      }
    }
  }
}
```

Each device class can have a `name`, `state`, and `state_attributes`, in the same shape as under `entity`. Other integrations reuse these strings with references, like `[%key:component::sensor::entity_component::temperature::name%]`.

## Devices

The `device` section translates device names, keyed by the translation key you pass in the device info:

```json
{
  "device": {
    "power_strip": {
      "name": "Power strip with {socket_count} sockets"
    }
  }
}
```

With a translation key, the `name` of the device info is ignored. If the key has no translation, the translation key itself becomes the name. Fill placeholders with `translation_placeholders`. See the [device registry](/core/integrations/device-registry/).

## Exceptions

Exceptions that extend `HomeAssistantError` take a `translation_domain`, `translation_key`, and `translation_placeholders`. Their messages go under `exceptions`:

```json
{
  "exceptions": {
    "cannot_connect": {
      "message": "Could not connect to {host}."
    }
  }
}
```

See [setup failures and exceptions](/core/integrations/setup-failures/) for where to raise them, and the [exception translations](/core/quality-scale/exception-translations/) rule of the quality scale.

## Issues

Repair issues go under `issues`, keyed by the translation key of the issue. Each issue has a `title`, an optional `short_title`, and either a `description` or a `fix_flow`, never both. A `fix_flow` has the same format as a [flow](#flows). See [repairs](/core/integrations/repairs/).

## Actions

The names and descriptions of your actions go under `services`:

```json
{
  "services": {
    "set_speed": {
      "name": "Set speed",
      "description": "Sets the speed of the fan.",
      "fields": {
        "speed": {
          "name": "Speed",
          "description": "The speed to set."
        }
      },
      "sections": {
        "advanced": {
          "name": "Advanced options"
        }
      }
    }
  }
}
```

Every action needs a `name` and a `description`, and every field needs a `name`. Fields can also have an `example`. Fields inside a collapsible section still go under `fields`; `sections` only names the sections. See [actions](/core/integrations/actions/#names-and-descriptions).

## Triggers and conditions

`triggers` and `conditions` work like `services`: per trigger or condition, a `name`, a `description`, and `fields` with a `name`, an optional `description`, and an optional `example`. They have no `sections`. See [triggers and conditions](/core/integrations/triggers-and-conditions/) for how to name them.

## Device automations

Device triggers, conditions, and actions go under `device_automation`, in `trigger_type`, `trigger_subtype`, `condition_type`, and `action_type`. Extra fields of a device automation get labels in `extra_fields` and descriptions in `extra_fields_descriptions`. See [device automations](/core/integrations/device-automations/#texts).

## Other sections

- `system_health`: the labels of your system health information, under `info`. See [system health](/core/integrations/system-health/#texts).
- `application_credentials`: a `description` for the dialog where users enter their credentials. See [OAuth 2.0](/core/integrations/oauth2/#help-users-create-credentials).
- `preview_features`: a `name` and `description` per feature, plus optional `enable_confirmation` and `disable_confirmation`. The description can contain links, but no placeholders. See [Labs](/core/development/labs/).

## References

Many strings already exist, like "Failed to connect" or "Device is already configured". Do not write them again: point to them with a reference, written as `[%key:<path>%]`. Translators then translate the string once, for every integration that uses it.

The path uses `::` between the parts:

- `common::...` points to the shared strings in `homeassistant/strings.json` in core, like `[%key:common::config_flow::data::host%]`.
- `component::<domain>::...` points to any integration, including your own, like `[%key:component::example::config::step::user::title%]`.

For strings you use several times, put them in your own `common` section and refer to them with `[%key:component::example::common::<key>%]`.

A reference must be the whole string: `"Error: [%key:common::...%]"` is refused. A reference also cannot point to a string that is itself a reference, because Lokalise only supports one level. Point to the original instead. The compile step replaces the references with the text, so the files Home Assistant reads contain only plain strings.

## Placeholders

Values that are only known at runtime, like a host name or a count, go in placeholders: `"Could not connect to {host}."`. Your code fills them in:

| Where | How you pass them |
| --- | --- |
| Flow steps | `description_placeholders` on `async_show_form`, `async_show_menu`, `async_abort`, and `async_create_entry` |
| Flow title | `title_placeholders` in `self.context` |
| Entities and devices | `translation_placeholders` |
| Exceptions and repair issues | `translation_placeholders` |
| Actions | `description_placeholders` when you register the action |

Hassfest checks every string:

- Placeholder names are valid Python identifiers, like `{host_name}`.
- Placeholders are not wrapped in single quotes, like `'{name}'`.
- Strings contain no HTML, and no spaces at the start or end.
- Strings contain no URLs. Put a URL in a placeholder instead, so a changed link does not need new translations.
- Translation keys are lowercase letters, digits, `-`, and `_`. They do not start or end with `-` or `_`, and have no two of them in a row.

At runtime, a translation that misses a key falls back to English. A translation whose placeholders differ from the English string is dropped, and the English string is used instead.

## Custom integrations

Custom integrations do not use `strings.json`, and they are not translated on Lokalise. The compile step that turns `strings.json` into translations only runs in core. A custom integration ships the finished files itself, in its `translations` folder:

```text
custom_components/example/
├── __init__.py
├── manifest.json
└── translations/
    ├── en.json
    └── nl.json
```

Each file is named after a [BCP 47](https://www.rfc-editor.org/info/bcp47) language code and has the same structure as `strings.json`. `en.json` is required and complete, because it is the fallback for every other language.

References do not work in these files: nothing replaces them, so users see the raw `[%key:...%]` text. Write out every string in full. Placeholders work as usual.

Hassfest validates `translations/en.json` of a custom integration too. You can run it in your own repository with the [hassfest GitHub Action](https://github.com/home-assistant/actions#hassfest).

## Who to talk to

Questions about `strings.json` or a hassfest error? Ask in the **#core** channel on the [Home Assistant Discord](https://www.home-assistant.io/join-chat/). For questions about translating itself, see the [Translate](/translate/) area.

---
title: Set up from the UI with a config flow
description: "Bronze rule config-flow: the integration is set up from the UI, with a clear config flow that stores its data in the right place."
sidebarLabel: config-flow
sidebarGroup: Bronze
order: 5
---

This is a Bronze rule. In `quality_scale.yaml`, it is called `config-flow`.

This page is about what the rule requires, and how it is checked. How to build a config flow, step by step, is on [config flow](/core/integrations/config-flow/) in building integrations.

The integration must be set up from the UI, with a [config flow](/glossary/config-flow/). The flow must be easy to understand: the right [selectors](/glossary/selector/) for each field, validation where it is needed, and a `data_description` in `strings.json` that explains every field. Store the settings the integration needs to work in `ConfigEntry.data`, and optional settings in `ConfigEntry.options`.

## Why it matters

Since 2018, the config flow has been the standard way to set up an integration. It gives every integration the same setup experience, guides users through the steps, and means nobody has to edit YAML to get started. The config flow is the first thing a user sees of your integration, so it should be clear and friendly.

Keeping the settings the integration needs to work apart from the options gives each its own flow after setup: users change the first with a [reconfigure flow](/glossary/reconfigure-flow/), and the options with an [options flow](/glossary/options-flow/).

## Example

Set `config_flow` to `true` in `manifest.json`, and add a `config_flow.py` with a class that extends `ConfigFlow`. [Config flow](/core/integrations/config-flow/#add-a-config-flow) shows a complete example, and the [tutorial](/core/integrations/tutorial/#4-build-the-config-flow) builds one from the scaffold.

The text of the form lives in `strings.json`. Give every field a label in `data` and an explanation in `data_description`:

```json
{
  "config": {
    "step": {
      "user": {
        "data": {
          "host": "[%key:common::config_flow::data::host%]"
        },
        "data_description": {
          "host": "The hostname or IP address of your device."
        }
      }
    }
  }
}
```

A real config flow also tests the connection and prevents duplicates. Those are rules of their own: [test-before-configure](/core/quality-scale/test-before-configure/) and [unique-config-entry](/core/quality-scale/unique-config-entry/).

## How it is checked

- Hassfest, when the rule is `done`: `config_flow` must be `true` in `manifest.json`, and `config_flow.py` must exist.
- Pylint warns when a config flow asks for a name (`home-assistant-config-flow-name-field`) or a polling interval (`home-assistant-config-flow-polling-field`). Names come from the device, and the polling interval is up to the integration.
- Pylint warns when a field of a config, options, or subentry flow has no translation in `strings.json` (`home-assistant-config-flow-field-not-translated` and its siblings).
- The use of selectors, `data_description`, and `data` versus `options` is checked in review.

## Exceptions

Integrations that [ADR-0010](https://github.com/home-assistant/architecture/blob/master/adr/0010-integration-configuration.md) exempts from UI setup are exempt from this rule.

## Related rules

- [test-before-configure](/core/quality-scale/test-before-configure/): test the connection in the config flow.
- [unique-config-entry](/core/quality-scale/unique-config-entry/): prevent duplicate config entries.
- [config-flow-test-coverage](/core/quality-scale/config-flow-test-coverage/): test the config flow fully.
- [discovery](/core/quality-scale/discovery/): support discovery.
- [reauthentication-flow](/core/quality-scale/reauthentication-flow/): reauthenticate from the UI.
- [reconfiguration-flow](/core/quality-scale/reconfiguration-flow/): reconfigure from the UI.

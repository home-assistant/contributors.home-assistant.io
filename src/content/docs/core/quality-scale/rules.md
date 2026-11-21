---
title: All rules
description: Every rule of the integration quality scale per tier, with a checklist to copy into your pull request.
order: -4
---

The quality scale has 54 rules: 20 for Bronze, 10 for Silver, 21 for Gold, and 3 for Platinum. A tier needs every rule of that tier and of the tiers below it. This list follows the rules as hassfest knows them, in `script/hassfest/quality_scale.py` of core.

## Bronze

The baseline for every integration in core. 20 rules.

| Rule | What it asks |
| ---- | ------------ |
| [action-setup](/core/quality-scale/action-setup/) | Actions are registered when the integration loads, not per config entry. |
| [appropriate-polling](/core/quality-scale/appropriate-polling/) | A polling integration uses an interval that fits its data. |
| [brands](/core/quality-scale/brands/) | The integration has a logo and icon in the [brands repository](https://github.com/home-assistant/brands). |
| [common-modules](/core/quality-scale/common-modules/) | The coordinator lives in coordinator.py and the base entity in entity.py. |
| [config-flow](/core/quality-scale/config-flow/) | The integration is set up from the UI, with a clear config flow. |
| [config-flow-test-coverage](/core/quality-scale/config-flow-test-coverage/) | The config flow has full test coverage, including recovery from errors. |
| [dependency-transparency](/core/quality-scale/dependency-transparency/) | Dependencies are open source, on PyPI, and built and published in public CI. |
| [docs-actions](/core/quality-scale/docs-actions/) | The documentation describes the actions of the integration. |
| [docs-conditions](/core/quality-scale/docs-conditions/) | The documentation describes the conditions of the integration. |
| [docs-high-level-description](/core/quality-scale/docs-high-level-description/) | The documentation describes what the integration connects to. |
| [docs-installation-instructions](/core/quality-scale/docs-installation-instructions/) | The documentation has step-by-step setup instructions, with prerequisites. |
| [docs-removal-instructions](/core/quality-scale/docs-removal-instructions/) | The documentation explains how to remove the integration. |
| [docs-triggers](/core/quality-scale/docs-triggers/) | The documentation describes the triggers of the integration. |
| [entity-event-setup](/core/quality-scale/entity-event-setup/) | Entities subscribe in async_added_to_hass and unsubscribe when removed. |
| [entity-unique-id](/core/quality-scale/entity-unique-id/) | Every entity has a unique ID, so users can customize it. |
| [has-entity-name](/core/quality-scale/has-entity-name/) | Entities set has_entity_name to True, and are named in context of their device. |
| [runtime-data](/core/quality-scale/runtime-data/) | Runtime data is stored in ConfigEntry.runtime_data. |
| [test-before-configure](/core/quality-scale/test-before-configure/) | The config flow tests the connection before it creates the entry. |
| [test-before-setup](/core/quality-scale/test-before-setup/) | Setup checks that it works, and raises the right exception when it does not. |
| [unique-config-entry](/core/quality-scale/unique-config-entry/) | The same device or service cannot be set up twice. |

## Silver

Reliability: errors, offline devices, reauthentication, and ownership. 10 rules.

| Rule | What it asks |
| ---- | ------------ |
| [action-exceptions](/core/quality-scale/action-exceptions/) | Actions raise ServiceValidationError or HomeAssistantError when they fail. |
| [config-entry-unloading](/core/quality-scale/config-entry-unloading/) | The integration can be unloaded and reloaded without a restart. |
| [docs-configuration-parameters](/core/quality-scale/docs-configuration-parameters/) | The documentation describes every option of the options flow. |
| [docs-installation-parameters](/core/quality-scale/docs-installation-parameters/) | The documentation describes every field asked for during setup. |
| [entity-unavailable](/core/quality-scale/entity-unavailable/) | Entities become unavailable when the device or service cannot be reached. |
| [integration-owner](/core/quality-scale/integration-owner/) | The integration has at least one integration owner. |
| [log-when-unavailable](/core/quality-scale/log-when-unavailable/) | The integration logs a lost connection once, and once when it comes back. |
| [parallel-updates](/core/quality-scale/parallel-updates/) | Every entity platform sets PARALLEL_UPDATES. |
| [reauthentication-flow](/core/quality-scale/reauthentication-flow/) | The integration asks for new credentials when the old ones stop working. |
| [test-coverage](/core/quality-scale/test-coverage/) | The tests cover more than 95% of every module of the integration. |

## Gold

The best user experience: discovery, devices, translations, and documentation for users. 21 rules.

| Rule | What it asks |
| ---- | ------------ |
| [devices](/core/quality-scale/devices/) | Entities are grouped in devices, with complete device information. |
| [diagnostics](/core/quality-scale/diagnostics/) | Users can download diagnostics, with sensitive data redacted. |
| [discovery](/core/quality-scale/discovery/) | Devices are discovered, so users do not have to look them up. |
| [discovery-update-info](/core/quality-scale/discovery-update-info/) | Discovery updates the address of a known device when it changes. |
| [docs-data-update](/core/quality-scale/docs-data-update/) | The documentation explains how and how often data is updated. |
| [docs-examples](/core/quality-scale/docs-examples/) | The documentation gives automation examples or blueprints. |
| [docs-known-limitations](/core/quality-scale/docs-known-limitations/) | The documentation lists the known limitations. |
| [docs-supported-devices](/core/quality-scale/docs-supported-devices/) | The documentation lists known supported and unsupported devices. |
| [docs-supported-functions](/core/quality-scale/docs-supported-functions/) | The documentation describes the entities and functionality it provides. |
| [docs-troubleshooting](/core/quality-scale/docs-troubleshooting/) | The documentation helps users solve common problems themselves. |
| [docs-use-cases](/core/quality-scale/docs-use-cases/) | The documentation shows what you can do with the integration. |
| [dynamic-devices](/core/quality-scale/dynamic-devices/) | Devices that appear after setup are added without a reload. |
| [entity-category](/core/quality-scale/entity-category/) | Configuration and diagnostic entities have an entity category. |
| [entity-device-class](/core/quality-scale/entity-device-class/) | Entities use a device class wherever one fits. |
| [entity-disabled-by-default](/core/quality-scale/entity-disabled-by-default/) | Entities that few users need are disabled by default. |
| [entity-translations](/core/quality-scale/entity-translations/) | Entity names come from strings.json, so they can be translated. |
| [exception-translations](/core/quality-scale/exception-translations/) | Errors shown to users come from strings.json, so they can be translated. |
| [icon-translations](/core/quality-scale/icon-translations/) | Entity icons are defined in icons.json. |
| [reconfiguration-flow](/core/quality-scale/reconfiguration-flow/) | Users can change the setup of an entry without removing it. |
| [repair-issues](/core/quality-scale/repair-issues/) | The integration raises repair issues for problems users can fix. |
| [stale-devices](/core/quality-scale/stale-devices/) | Devices that are gone are removed, or can be removed by the user. |

## Platinum

Technical excellence: async, efficient, and strictly typed. 3 rules.

| Rule | What it asks |
| ---- | ------------ |
| [async-dependency](/core/quality-scale/async-dependency/) | The library of the integration uses asyncio. |
| [inject-websession](/core/quality-scale/inject-websession/) | The library accepts the web session of Home Assistant. |
| [strict-typing](/core/quality-scale/strict-typing/) | The integration is fully typed and checked with strict mypy settings. |

## Checklist

When you ask for a new tier, copy the checklist of that tier and of every tier below it into the description of your pull request. Check every rule that is done, write "exempt" behind the rules that are exempt, and link to the code for each rule. See [Raise the tier of an integration](/core/quality-scale/raise-tier/).

```markdown
## Bronze

- [ ] `action-setup`: Register actions in async_setup
- [ ] `appropriate-polling`: Poll at an appropriate interval
- [ ] `brands`: Provide brand assets
- [ ] `common-modules`: Put common patterns in common modules
- [ ] `config-flow`: Set up from the UI with a config flow
  - [ ] Uses `data_description` to give context to fields
  - [ ] Uses `ConfigEntry.data` and `ConfigEntry.options` correctly
- [ ] `config-flow-test-coverage`: Test the config flow fully
- [ ] `dependency-transparency`: Use transparent dependencies
- [ ] `docs-actions`: Document the actions
- [ ] `docs-conditions`: Document the conditions
- [ ] `docs-high-level-description`: Describe the brand, product, or service
- [ ] `docs-installation-instructions`: Document the installation
- [ ] `docs-removal-instructions`: Document how to remove the integration
- [ ] `docs-triggers`: Document the triggers
- [ ] `entity-event-setup`: Subscribe to events in the entity lifecycle
- [ ] `entity-unique-id`: Give entities a unique ID
- [ ] `has-entity-name`: Use has_entity_name
- [ ] `runtime-data`: Store runtime data in runtime_data
- [ ] `test-before-configure`: Test the connection in the config flow
- [ ] `test-before-setup`: Check the connection during setup
- [ ] `unique-config-entry`: Prevent duplicate config entries

## Silver

- [ ] `action-exceptions`: Raise exceptions when actions fail
- [ ] `config-entry-unloading`: Support unloading the config entry
- [ ] `docs-configuration-parameters`: Document the options
- [ ] `docs-installation-parameters`: Document the setup parameters
- [ ] `entity-unavailable`: Mark entities unavailable when appropriate
- [ ] `integration-owner`: Have an integration owner
- [ ] `log-when-unavailable`: Log once when unavailable, and once when back
- [ ] `parallel-updates`: Set the number of parallel updates
- [ ] `reauthentication-flow`: Reauthenticate from the UI
- [ ] `test-coverage`: Test more than 95% of the code

## Gold

- [ ] `devices`: Create devices
- [ ] `diagnostics`: Implement diagnostics
- [ ] `discovery`: Support discovery
- [ ] `discovery-update-info`: Update network information from discovery
- [ ] `docs-data-update`: Document how data is updated
- [ ] `docs-examples`: Document automation examples
- [ ] `docs-known-limitations`: Document known limitations
- [ ] `docs-supported-devices`: Document supported devices
- [ ] `docs-supported-functions`: Document supported functionality
- [ ] `docs-troubleshooting`: Document troubleshooting
- [ ] `docs-use-cases`: Document use cases
- [ ] `dynamic-devices`: Add new devices automatically
- [ ] `entity-category`: Assign entity categories
- [ ] `entity-device-class`: Use device classes
- [ ] `entity-disabled-by-default`: Disable noisy or less popular entities
- [ ] `entity-translations`: Translate entity names
- [ ] `exception-translations`: Translate exception messages
- [ ] `icon-translations`: Use icon translations
- [ ] `reconfiguration-flow`: Reconfigure from the UI
- [ ] `repair-issues`: Raise repair issues when the user needs to act
- [ ] `stale-devices`: Remove stale devices

## Platinum

- [ ] `async-dependency`: Use an async dependency
- [ ] `inject-websession`: Pass in the web session
- [ ] `strict-typing`: Use strict typing
```

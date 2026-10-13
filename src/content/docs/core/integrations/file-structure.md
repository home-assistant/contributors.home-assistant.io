---
title: Integration file structure
description: The files of an integration, what each one does, and where Home Assistant looks for integrations.
sidebarLabel: File structure
sidebarGroup: Getting started
order: 5
---

Every integration lives in a folder named after its [domain](/glossary/domain/). The mobile app integration has the domain `mobile_app`, so all its files are in `mobile_app/`. Home Assistant finds most features of an integration by file name, so the names below matter.

## The required files

- `manifest.json`: describes the integration, its requirements, and how it can be discovered. See [the manifest](/core/integrations/manifest/).
- `__init__.py`: the integration itself, with its setup functions. If the integration only offers a platform, this file can be limited to a docstring, like `"""The Mobile App integration."""`.

## Common files

| File | What it holds |
| --- | --- |
| `const.py` | Constants, like `DOMAIN` |
| `config_flow.py` | The [config flow](/core/integrations/config-flow/) and [options flow](/core/integrations/options-flow/) |
| `coordinator.py` | The [data update coordinator](/core/integrations/fetching-data/), if you subclass it |
| `entity.py` | A base entity class shared by your platforms |
| `light.py`, `sensor.py`, and so on | One [platform](/glossary/platform/) per entity type. See [entities and platforms](/core/entities/). |
| `strings.json` | All user-facing text, in English. See [make your strings translatable](/translate/guides/developers/). |
| `icons.json` | Icons for entities, actions, and form sections |
| `services.yaml` | The description of the [actions](/core/integrations/actions/) your integration registers |
| `quality_scale.yaml` | The status of each [quality scale](/core/quality-scale/) rule for your integration |

## Platform files

Some files are integration platforms: Home Assistant loads them by name when the feature they provide is needed. You add the file, and the feature appears.

| File | Feature |
| --- | --- |
| `diagnostics.py` | [Diagnostics](/core/integrations/diagnostics/) |
| `system_health.py` | [System health](/core/integrations/system-health/) |
| `repairs.py` | [Repair flows](/core/integrations/repairs/) |
| `reproduce_state.py` | [Reproduce state](/core/integrations/reproduce-state/) for scenes |
| `significant_change.py` | [Significant change](/core/integrations/significant-change/) |
| `backup.py` | [Backup agents and hooks](/core/integrations/backup/) |
| `media_source.py` | [Media source](/core/integrations/media-source/) |
| `application_credentials.py` | [Application credentials](/core/integrations/oauth2/#application-credentials) for OAuth 2.0 |
| `device_trigger.py`, `device_condition.py`, `device_action.py` | [Device automations](/core/integrations/device-automations/) |

## Where Home Assistant looks for integrations

Home Assistant looks for an integration when a config entry or `configuration.yaml` references its domain, or when another integration depends on it. It looks in two places:

- `<config directory>/custom_components/<domain>`
- `homeassistant/components/<domain>` (the integrations that ship with Home Assistant)

A custom integration with the same domain as a built-in one overrides it. That works, but the user then stops getting updates for that integration, and the manifest needs a `version`. Pick a unique domain for a custom integration unless you really mean to replace a built-in one.

## Brand images in custom integrations

A custom integration can ship its own icon and logo in a `brand/` folder inside the integration folder. Integrations in core put them in the [brands repository](https://github.com/home-assistant/brands) instead. See [integration brands and images](/core/integrations/brands/).

## Tests

Tests live outside the integration folder, in `tests/components/<domain>/`. See [writing tests](/core/development/tests/).

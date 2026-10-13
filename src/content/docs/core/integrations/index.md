---
title: Building integrations
description: Everything an integration is made of, from the manifest and the config flow to fetching data, discovery, and diagnostics.
order: 10
sidebarGroups:
  - Getting started
  - Setup and configuration
  - Data and updates
  - Discovery
  - Devices and registries
  - Integration features
  - Reference
---

An [integration](/glossary/integration/) connects Home Assistant to a device, a service, or an idea. It lives in its own folder, describes itself in a manifest, sets itself up from a config entry, and hands its data to Home Assistant as entities.

This part of the site walks through all of it, task by task. It is written for people who write Python. You do not need to read it front to back: start with the tutorial, and come back for the rest when your integration needs it.

> [!TIP]
> Want to add support for a new device or service? Read [how an integration fits in](/core/integrations/concepts/), then build one in the [tutorial](/core/integrations/tutorial/). Check first whether it [belongs in core](/core/integrations/create/#does-it-belong-in-core): the project recommends publishing a new integration in the [Marketplace](/marketplace/) first, and new integrations in core need to reach at least the Bronze tier of the [quality scale](/core/quality-scale/).

## Getting started

- [How an integration fits in](/core/integrations/concepts/): integrations, config entries, platforms, entities, devices, coordinators, and the event loop, in plain language.
- [Build your first integration](/core/integrations/tutorial/): a complete integration, step by step, from the scaffold to the pull request.
- [Build a Python library](/core/integrations/api-library/): the library every integration uses to talk to its device or service.
- [Create an integration](/core/integrations/create/): what is accepted in core, the scaffold script, and the smallest possible integration.
- [File structure](/core/integrations/file-structure/): which file does what, and where Home Assistant looks for integrations.
- [Writing tests](/core/development/tests/), in the development workflow: how to test an integration, with fixtures, mocks, and snapshots.

## Setup and configuration

- [Config entries](/core/integrations/config-entries/): set up, unload, and migrate an integration, and keep its runtime data.
- [Config flow](/core/integrations/config-flow/): let users add your integration from the UI.
- [Forms, menus, and progress](/core/integrations/flow-steps/): the building blocks of every flow.
- [Options flow](/core/integrations/options-flow/): let users change how the integration behaves.
- [Subentries](/core/integrations/subentries/): store repeatable parts of a config entry, like locations.
- [Reauthentication and reconfiguration](/core/integrations/reauth-reconfigure/): fix credentials and connection details without removing the integration.
- [OAuth 2.0 and application credentials](/core/integrations/oauth2/): link a user's account at a cloud service.
- [YAML configuration](/core/integrations/yaml/): when it is still allowed, and how it works.
- [Setup failures and exceptions](/core/integrations/setup-failures/): retry when a device is offline, and raise the right errors.

## Data and updates

- [Fetching data](/core/integrations/fetching-data/): polling, push, and the data update coordinator.
- [Events](/core/integrations/events/): fire events, and listen to what happens in Home Assistant.
- [Instance URL](/core/integrations/instance-url/): find the URL a device or service can reach Home Assistant on.

## Discovery

- [Discovery](/core/integrations/discovery/): how Home Assistant finds devices and starts your config flow.
- [Network discovery](/core/integrations/network-discovery/): the zeroconf, SSDP, DHCP, USB, and network APIs.
- [Bluetooth integrations](/core/integrations/bluetooth/): best practices and the Bluetooth API.
- [Fetching Bluetooth data](/core/integrations/bluetooth-data/): coordinators driven by advertisements.

## Devices and registries

- [Device registry](/core/integrations/device-registry/): register devices, and link and split them.
- [Entity registry](/core/integrations/entity-registry/): look up and migrate the entities of your integration.
- [Area registry](/core/integrations/area-registry/): what Home Assistant knows about areas.

## Integration features

- [Actions](/core/integrations/actions/): register actions that users can call from automations and scripts.
- [Device automations](/core/integrations/device-automations/): device triggers, conditions, and actions.
- [Triggers and conditions](/core/integrations/triggers-and-conditions/): provide automation triggers and conditions.
- [Diagnostics](/core/integrations/diagnostics/): let users download data to troubleshoot.
- [System health](/core/integrations/system-health/): show the state of your integration on the system information page.
- [Repairs](/core/integrations/repairs/): tell users about problems, and help them fix them.
- [Asking for a restart](/core/integrations/restart-required/): tell Home Assistant it needs a restart to apply a change.
- [Reproduce state](/core/integrations/reproduce-state/): make scenes work with your entities.
- [Significant change](/core/integrations/significant-change/): tell exporters which state changes matter.
- [Backup](/core/integrations/backup/): store backups somewhere, or prepare for one.
- [Media source](/core/integrations/media-source/): expose browsable and playable media.

## Reference

- [The manifest](/core/integrations/manifest/): every key of `manifest.json`.
- [Integration brands and images](/core/integrations/brands/): icons, logos, and grouping integrations under one brand.
- [Translations](/core/integrations/translations/): every section of `strings.json`, references, and placeholders.

## Related topics

- [Entities and platforms](/core/entities/): the entity types your integration provides, like sensors and lights.
- [Development workflow](/core/development/): the environment, tests, code style, and submitting your work.
- [How core works](/core/internals/): the `hass` object, the event loop, and the APIs beneath your integration.
- [Make your strings translatable](/translate/guides/developers/): how to write strings that translators can work with.
- [Document your integration](/writing/guides/integration/): every integration has a page on [home-assistant.io](https://www.home-assistant.io/).

## Who to talk to

- Ask in the **#core** channel on the [Home Assistant Discord](https://www.home-assistant.io/join-chat/). Share a link to your branch, so people can see the code you are asking about.
- Look at a well maintained integration that does something similar. Many integrations at the Platinum tier of the quality scale, like `airgradient`, are good examples of current patterns.
- Not sure if your idea fits Home Assistant? Open a discussion in the [architecture repository](https://github.com/home-assistant/architecture/discussions) before you write a lot of code.

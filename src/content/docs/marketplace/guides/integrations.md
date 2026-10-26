---
title: Publish a custom integration
description: What is different when your integration lives in its own repository instead of in core, and what the Marketplace needs from it.
sidebarLabel: Custom integrations
order: 1
---

A [custom integration](/glossary/custom-integration/) is built the same way as an integration in core. Everything in [Building integrations](/core/integrations/) applies: the manifest, config flows, entities, fetching data, and tests. This page only covers what is different when you publish it yourself.

For a new integration, the Marketplace is the recommended place to start, also when you want it in core one day. See [does it belong in core](/core/integrations/create/#does-it-belong-in-core).

## Put it in its own repository

One repository holds one integration, in `custom_components/<domain>/`:

```text
custom_components/my_integration/__init__.py
custom_components/my_integration/manifest.json
custom_components/my_integration/sensor.py
custom_components/my_integration/translations/en.json
custom_components/my_integration/brand/icon.png
hacs.json
README.md
```

The Marketplace installs the first folder it finds under `custom_components/`, to `custom_components/<domain>/` in the user's configuration folder. Every file the integration needs has to be inside that folder. The [repository structure](/marketplace/reference/repository-structure/#integrations) has the other layouts it accepts.

## The manifest

A custom integration needs two keys that integrations in core leave out:

- `version`: required. Without a version the loader accepts, the Marketplace refuses the install. Use the same version as the tag of your release.
- `issue_tracker`: where users report bugs. HACS requires it for the catalog.

`documentation` points to your own documentation, like your README. The [manifest reference](/core/integrations/manifest/#custom-integrations-only) has the details.

Only list `requirements` that are not already requirements of Home Assistant itself.

## Categories

Add `categories` to your manifest: one to three [integration categories](/glossary/integration-category/) that say what your integration is for. A custom integration doesn't need them, but the catalog includes them in the data it publishes for the Marketplace.

```json title="manifest.json"
{
  "categories": ["energy.ev_charging"]
}
```

Pick them the same way as an integration in core does. [Integration categories](/core/integrations/categories/) has every category, and how to choose. The HACS action checks them: a missing key is a warning, an unknown category fails the check.

## Connectivity

Add `connectivity` to your manifest: the protocols Home Assistant uses to reach the devices or service of your integration, like `zigbee` or `cloud`. It is optional. Home Assistant reads it from the manifest of a custom integration the same way as from one in core.

```json title="manifest.json"
{
  "connectivity": ["network", "cloud"]
}
```

[Integration connectivity](/core/integrations/connectivity/) has every value, and how to choose. Hassfest checks them. An unknown value is only a warning for a custom integration. The HACS action doesn't check `connectivity`, and the catalog doesn't publish it.

## Pick a domain that is yours

The `domain` is the folder name, and what Home Assistant knows your integration by. Pick one that no integration in core uses.

A custom integration with the domain of a built-in one replaces it. Home Assistant allows that, but the user loses the updates of the built-in one, and the Marketplace asks the user to confirm before such an install. The catalog does not accept integrations that replace a core integration. Users can still add them from a link.

Two repositories can not install the same domain. When a user has one installed, the Marketplace refuses the other.

## Translations

Custom integrations do not use `strings.json`, and are not translated on Lokalise. Ship the finished files in `translations/`, with a complete `en.json`. See [translations for custom integrations](/core/integrations/translations/#custom-integrations).

## Brand images

Put your icon and logo in a `brand/` folder inside the integration folder. Home Assistant shows them once your integration is installed. The Marketplace also shows them before that: the brands site picks them up from the latest release of every integration in the catalog.

Do not use Home Assistant branded images. Users would take your integration for an official one. The [brands page](/core/integrations/brands/#brand-images-for-custom-integrations) has the image names and sizes.

## Keep user files across updates

An update replaces the whole integration folder. If your integration writes files there that the user needs to keep, put them in one subfolder, and name it in `hacs.json`:

```json
{
  "name": "My integration",
  "persistent_directory": "userfiles"
}
```

The Marketplace moves that folder out of the way during an update, and puts it back after.

## Restarts

On a first install, an integration with a config flow loads right away, so the user can add it without a restart. An integration set up in YAML needs a restart, and so does every update or removal of an integration that Home Assistant already loaded. The Marketplace creates a repair for that, with a button to restart.

## Link to the setup

Once your integration is installed, a [My link](/glossary/my-link/) can take users straight to its setup. The `config_flow_start` link starts the [config flow](/glossary/config-flow/) of the domain you give it, in the user's own Home Assistant. The [My link creator](https://my.home-assistant.io/create-link/?redirect=config_flow_start) makes the badge for your README:

```markdown
[![Open your Home Assistant instance and start setting up a new integration.](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=my_integration)
```

To link to your repository in the Marketplace, so users can install it first, see [the link to your repository](/marketplace/guides/catalog/#the-link-to-your-repository).

## Check it in your repository

Run two GitHub Actions on every push and pull request:

- [hassfest](https://github.com/home-assistant/actions#hassfest) checks your manifest, translations, and other files of your integration.
- The [HACS action](https://github.com/hacs/action) with `category: "integration"` checks what the catalog needs. See [validation checks](/marketplace/reference/validation/).

Both have to pass to [get into the catalog](/marketplace/guides/catalog/).

## Keep up with Home Assistant

Changes in core can break a custom integration. Changes to what custom integrations use from core, like helpers, constants, and entity properties, are deprecated for 12 months first, and announced on the [blog](/blog/). The [deprecation policy](/core/development/deprecating/#developer-facing-deprecations) has the details. Test your integration against the [beta](/releases/), and set `homeassistant` in `hacs.json` when a release needs a newer Home Assistant. See [releases and updates](/marketplace/guides/releases/).

The [integration quality scale](/core/quality-scale/) has no tiers for custom integrations, but its rules are still a good guide.

## Bring it to core

Once your integration has matured and has a user base, reach out to the maintainers, for example in the **#core** channel on [Discord](https://www.home-assistant.io/join-chat/), to see whether it should ship built in. [Does it belong in core](/core/integrations/create/#does-it-belong-in-core) lists what core asks for, and every new integration in core needs the [Bronze rules](/core/quality-scale/rules/#bronze) of the quality scale.

Some differences on this page turn around in core. For example, the brand images go to the [brands repository](/core/integrations/brands/), and the translations come from `strings.json`.

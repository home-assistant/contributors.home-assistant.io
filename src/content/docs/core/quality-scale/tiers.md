---
title: Tiers
description: What Bronze, Silver, Gold, and Platinum mean, and the tiers outside the scale, like internal and legacy.
order: -5
---

The quality scale has four scaled tiers: Bronze, Silver, Gold, and Platinum. Each tier builds on the one below: to reach a tier, an integration follows every rule of that tier and of every tier below it. A Gold integration follows all Bronze, Silver, and Gold rules.

Next to the scale, there are tiers for integrations that do not fit on it: internal building blocks of core, old YAML-only integrations, and integrations outside core.

The tier lives in the `quality_scale` key of the `manifest.json` of the integration:

```json
{
  "domain": "my_integration",
  "name": "My integration",
  "quality_scale": "silver"
}
```

Hassfest accepts these values: `bronze`, `silver`, `gold`, `platinum`, `internal`, `legacy`, `custom`, and `no_score`.

## Bronze

Bronze is the baseline, and the minimum for every new integration. A Bronze integration:

- Can be set up from the UI, with a config flow that tests the connection.
- Follows the basic coding standards, like unique IDs for entities and the common file layout.
- Has automated tests for its config flow.
- Has documentation that is enough to get a user started, step by step.

See the [Bronze rules](/core/quality-scale/rules/#bronze).

## Silver

Silver is about reliability. A Silver integration keeps working, or recovers by itself, when the world around it does not cooperate. On top of Bronze, it:

- Has one or more active integration owners.
- Recovers from connection errors and offline devices by itself, without filling the logs.
- Starts reauthentication by itself when the credentials stop working.
- Raises clear errors when an action fails.
- Has tests that cover more than 95% of its code.
- Documents everything a user fills in during setup and in the options.

See the [Silver rules](/core/quality-scale/rules/#silver).

## Gold

Gold is the best user experience an integration can offer. On top of Silver, a Gold integration:

- Is discovered automatically, where the device supports that.
- Lets you update the firmware or software of devices from Home Assistant, where the device supports that.
- Creates devices, and adds and removes them as they come and go.
- Can be reconfigured from the UI.
- Has translated entity names, icons, and error messages.
- Offers diagnostics and raises repair issues when the user needs to act.
- Has entities with fitting device classes and categories, and disables noisy ones by default.
- Has extensive documentation for users: supported devices and functions, examples, use cases, known limitations, and troubleshooting.

Integrations for devices in the [Works with Home Assistant](/glossary/works-with-home-assistant/) program need at least Gold.

See the [Gold rules](/core/quality-scale/rules/#gold).

## Platinum

Platinum is the top of the scale: technical excellence on top of the best user experience. On top of Gold, a Platinum integration:

- Is fully typed, and checked with strict type checking.
- Uses an async library, so it does not need threads for its I/O.
- Shares the web session of Home Assistant, instead of opening its own.
- Handles data efficiently, keeping network and CPU usage low.
- Has clear code comments, so the code is easy to maintain.

See the [Platinum rules](/core/quality-scale/rules/#platinum).

## Tiers outside the scale

### Internal

`internal` is for integrations that are part of Home Assistant itself, like building blocks of core, or platforms that other integrations build on, such as `sensor` or `light`. They are maintained by the Home Assistant project and follow its architecture decisions. Internal integrations are not graded. Hassfest keeps a list of them in `script/hassfest/quality_scale.py`, and a new internal integration has to be added there: to `NO_QUALITY_SCALE` when it has no `quality_scale.yaml`, or to `INTEGRATIONS_WITHOUT_SCALE` when it uses the file only to track rules.

### Legacy

`legacy` is for older integrations, some of them as old as Home Assistant itself, that can only be set up with YAML. Many of them lack an active integration owner, and they do not meet today's expectations for setup and features. They still work, and you can help bring them to Bronze by adding a config flow and the other Bronze rules.

### No score

`no_score` means the integration has not been graded against the scale. It is not a judgment on its quality. No integration in core uses it at the moment, and a new integration cannot start without a score: it needs Bronze.

### Custom

`custom` is for custom integrations: integrations that are not part of core and are installed by hand or through the [Marketplace](/marketplace/). The Home Assistant project does not review, maintain, or support them. If you maintain a custom integration, the rules of the scale are still a good guide, and they are what you need to follow when you want to contribute it to core.

## A tier can go down

A tier is not forever. An integration can be moved down when it no longer follows the rules of its tier. A common reason is losing its last active integration owner: without an owner, an integration cannot stay Silver or higher, even when its code would be good enough for Platinum.

Rules also change over time, as Home Assistant and best practices move on. When a rule is added to a tier, the integrations on that tier need to follow it too. Integrations with devices in the Works with Home Assistant program keep their tier when that happens.

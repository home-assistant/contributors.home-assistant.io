---
title: Integration quality scale
description: The tiers and rules that describe how good an integration is, how an integration earns a tier, and how to move it up.
order: 30
sidebarGroups:
  - Bronze
  - Silver
  - Gold
  - Platinum
---

Home Assistant has thousands of integrations, written by thousands of people. The integration quality scale is how the project describes, in one word, how good each of them is: Bronze, Silver, Gold, or Platinum. Every tier is a list of concrete rules, and an integration earns a tier by following every rule of that tier and of the tiers below it.

> [!TIP]
> Working on an integration? Start with [all rules](/core/quality-scale/rules/): every rule per tier on one page, with what it asks in one line, and a checklist to copy into your pull request.

## Why there is a scale

For users, the tier is a promise. They see it on the integration page in the documentation and in **Settings** > **Devices & services**. A Bronze integration sets up from the UI and has tests. A Gold integration is discovered on the network, can be reconfigured, has translated names and errors, and comes with documentation that tells you which devices work. Users pick devices based on this, so the tier has to be honest.

For you as a contributor, the scale is a shared definition of "done". Instead of a reviewer's personal taste, there is a written rule with a reason behind it. You know what is expected before you open a pull request, and you know what to work on next when you want to improve an integration.

For maintainers and reviewers, it keeps thousands of integrations consistent. An integration that claims a rule is checked against it, partly by tools, and those claims can be relied on when the codebase moves forward.

## How it works

- The tier of an integration is the `quality_scale` key in its `manifest.json`. Many older integrations were never graded and have no tier yet. A new integration must have one.
- An integration with a tier also has a `quality_scale.yaml` file. It lists every rule and its status: `done`, `todo`, or `exempt` with a reason.
- Hassfest, the validation script of core, checks that file. It fails when a rule that the tier needs is not `done` or `exempt`, and it runs extra checks on some rules that are marked `done`.
- A reviewer checks the rest, and a member of the core team approves the new tier.

New integrations must reach Bronze. There is no way into core below it.

## Start here

1. [Tiers](/core/quality-scale/tiers/): what Bronze, Silver, Gold, and Platinum mean, and the tiers outside the scale, like internal and legacy.
2. [All rules](/core/quality-scale/rules/): every rule on one page, per tier, with a checklist to copy into your pull request. This is where you find what to do.
3. [Raise the tier of an integration](/core/quality-scale/raise-tier/): how to work your way up, how to check your work, and how to get the new tier reviewed.
4. [The quality scale file](/core/quality-scale/quality-scale-file/): the format of `quality_scale.yaml`, and everything that checks it.

Building a new integration? It needs every [Bronze rule](/core/quality-scale/rules/#bronze). The [tutorial](/core/integrations/tutorial/) builds one that meets them.

## The rules

Every rule has its own page. [All rules](/core/quality-scale/rules/) lists them per tier, with a link to each. Each page explains what the rule asks, why, how to implement it, how it is checked, and when it does not apply. The rule pages use the same names as `quality_scale.yaml`, so `/core/quality-scale/entity-unique-id/` is the page of the `entity-unique-id` rule.

### Bronze

The baseline: set up from the UI, a tested config flow, unique IDs, and basic documentation. Start with [config-flow](/core/quality-scale/config-flow/), or see [all 20 Bronze rules](/core/quality-scale/rules/#bronze).

### Silver

Reliability: handle errors and offline devices, reauthenticate, have an integration owner, and more than 95% test coverage. Start with [integration-owner](/core/quality-scale/integration-owner/), or see [all 10 Silver rules](/core/quality-scale/rules/#silver).

### Gold

The best user experience: discovery, devices, translations, diagnostics, repairs, and full documentation for users. Start with [devices](/core/quality-scale/devices/), or see [all 21 Gold rules](/core/quality-scale/rules/#gold).

### Platinum

Technical excellence: async dependencies, a shared web session, and strict typing. Start with [strict-typing](/core/quality-scale/strict-typing/), or see [all 3 Platinum rules](/core/quality-scale/rules/#platinum).


## Related pages

- [Building integrations](/core/integrations/): how integrations work, and the files they are made of.
- [Writing tests](/core/development/tests/): the tests that several rules ask for.
- [Write integration documentation](/writing/guides/integration/): the documentation rules are about the integration page on [home-assistant.io](https://www.home-assistant.io/).
- [Make your strings translatable](/translate/guides/developers/): for the translation rules.

## Who to talk to

- Ask about a rule, or whether an exemption is reasonable, in the **#core** channel on the [Home Assistant Discord](https://www.home-assistant.io/join-chat/).
- The integration owners of an integration, listed as `codeowners` in its `manifest.json`, know best where it stands. Mention them in your pull request.
- Ideas to change a rule, or to add one, belong in the [architecture discussions](https://github.com/home-assistant/architecture/discussions).

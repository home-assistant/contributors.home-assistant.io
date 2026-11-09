---
title: Deprecate something
description: The deprecation policy of Home Assistant, what it means for the people who use it, and how deprecations show up in the release notes.
order: 3
---

A [deprecation](/glossary/deprecation/) is a backward-incompatible change scheduled for the future. The old way keeps working for a while, everyone who uses it is warned, and only after that period does it get removed. It gives people time to move on at their own pace.

This page is the policy, and what it means for users and the release notes. How to deprecate something in code, with repair issues, translation strings, and the right severity, is in the Core and integrations area: [Deprecating](/core/development/deprecating/).

## The rule

Anything that is removed must be deprecated first. That holds even when you think only a few people use it, because an entity, action, or option can be used in automations, scripts, and dashboards that nobody else can see.

## How long

| Who is affected | Minimum period |
| --- | --- |
| Users: YAML configuration, actions, entities, attributes, integrations | 6 months |
| Developers: constants, helpers, entity properties, and platform APIs used by custom integrations | 12 months |

A deprecation names the release in which the old way is removed. The period can be extended when people need more time, but it is never shortened.

## What users see

A deprecation that asks something of users shows up as a [repair](/glossary/repair/) in **Settings** > **System** > **Repairs**, only on installations it affects. The repair explains what is going away, when, and what to do. People who are affected get told, and people who are not affected are not bothered.

## In the release notes

A deprecation reaches the release notes twice:

1. **When it starts.** The release notes of the version that deprecates something can list it under **Backward-incompatible changes**, like "The uptime sensor is deprecated and will be removed in a future release. Use the new last restart sensor instead."
2. **When it ends.** The pull request that removes the old way, after the deprecation period, is a backward-incompatible change when it can still affect users who did not act on the deprecation. Its text from the pull request ends up in the same section of that release. See [When it is backward-incompatible](/releases/guides/backward-incompatible-changes/#when-it-is-backward-incompatible).

Deprecations of Python APIs, which affect developers of custom integrations, are announced on the [developer blog](/blog/). The release notes link the most notable posts of that release, and the old code logs a warning while it still works.

## In the pull request

The pull request template of the [core repository](https://github.com/home-assistant/core) has a type of change for this: check **Deprecation** when the break happens in the future, and **Breaking change** when it happens now. A pull request that starts a deprecation is the first. The one that ends it is the second, unless it only removes a core API that nothing in Home Assistant Core uses anymore.

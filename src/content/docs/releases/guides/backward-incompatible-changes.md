---
title: Document a backward-incompatible change
description: When your change means users have to do something, tell them what breaks, how to fix it, and why. That text ends up in the release notes.
order: 2
---

A backward-incompatible change is a change that requires people to do something on their side after they update, like changing their configuration, an automation, or a dashboard. Home Assistant tries hard to avoid them. When one is unavoidable, it has to be explained well, because thousands of people read it right before they update.

## Avoid it if you can

Before you write a backward-incompatible change, check if you can avoid it:

- Can the old way keep working next to the new way for a while? Then it is a [deprecation](/releases/guides/deprecations/), not a backward-incompatible change yet.
- Can Home Assistant migrate the old configuration automatically? Then nobody has to do anything.

## When it is backward-incompatible

The question to ask is: can this change affect someone right after they update? Mark your pull request as a backward-incompatible change, with the **Breaking change** section and the `breaking-change` label, when:

- It breaks something right away, without a [deprecation](/releases/guides/deprecations/) first. Users were not told in advance, and had no chance to act before they updated.
- It removes something from an integration after its deprecation period. Users were warned with a [repair](/glossary/repair/), but some of them may not have acted on it, and the removal still affects them.

Do not mark it when:

- Nothing breaks.
- It removes a deprecated [core API](/core/development/deprecating/#developer-facing-deprecations), like a helper or a constant, after its deprecation period, and no integration or other code in Home Assistant Core uses it anymore. Only custom integrations can still be affected, and their developers were told on the [developer blog](/blog/) when the deprecation started.

The minimum deprecation periods, 6 months for what users see and 12 months for core APIs, are in [Deprecate something](/releases/guides/deprecations/#how-long).

## Mark the pull request

The pull request template of the [core repository](https://github.com/home-assistant/core) has a type of change checklist. Check **Breaking change** when existing functionality breaks for users, as described above, or **Deprecation** when the break happens in a future release. The pull request then gets the `breaking-change` label, which is what puts your text in the release notes.

## Write the backward-incompatible change section

The pull request template starts with a **Breaking change** section. The template says it plainly: tell users what breaks, how to make it work again, and why. The text is published with the release notes, so write it for users, not for developers.

A good backward-incompatible change section answers three questions:

1. **What changed?** Describe what the user sees, not the code. "The `uptime` sensor is removed" works. "Refactored the sensor platform" does not.
2. **What do I need to do?** Give the concrete steps. If the user needs to change YAML, show the new YAML.
3. **Why?** One or two sentences are enough. People accept a change more easily when they understand the reason.

For example:

```markdown
The **Subscribed to Xbox Game Pass** binary sensor has been removed,
because it never worked. The Xbox API always reported `false`, whether
you were subscribed to Game Pass or not.

If you use this binary sensor in an automation or a dashboard, remove it.
```

## Tips

- Write it so someone who does not know the integration understands it. Many people read every backward-incompatible change, just to check if it affects them.
- Name the integration and the entities, actions, or options that change, using the names users see in the UI.
- Do not hide the break. If something stops working, say so in the first sentence.
- Keep the section in your pull request up to date when the change evolves during review.
- Follow the [writing style of the user documentation](/writing/reference/style/). The release notes use it too.

## What happens with your text

When the release is prepared, the release team collects the backward-incompatible change sections of all merged pull requests with the `breaking-change` label. They end up under **Backward-incompatible changes** in the release notes, grouped per integration, with a link to your pull request and to the documentation. The release notes authors may edit your text for clarity and consistency.

Backward-incompatible changes that only affect developers, like a change to a Python API, go on the developer blog instead. The release notes link to those posts.

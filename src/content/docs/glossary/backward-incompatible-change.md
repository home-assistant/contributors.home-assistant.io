---
title: "Backward-incompatible change"
description: "A change that requires users or developers to change something on their side, like their configuration or their custom integration."
sidebarGroup: "Contributing"
term:
  aliases:
    - "backward-incompatible changes"
  code:
    - "breaking-change (label)"
  formerly:
    - "breaking change"
  related:
    - "deprecation"
    - "release"
    - "pull-request"
  autolink:
    - "backward-incompatible change"
    - "backward-incompatible changes"
---

Pull requests with a backward-incompatible change that can affect users get the `breaking-change` label, and explain in their description what changes and what to do about it. That text ends up in the **Backward-incompatible changes** section of the release notes. Removing a deprecated core API after its deprecation period, when only custom integrations can still use it, does not get the label: those developers hear about it on the developer blog instead. [Document a backward-incompatible change](/releases/guides/backward-incompatible-changes/#when-it-is-backward-incompatible) has the details.

The pull request template of Home Assistant Core and the label call it a "breaking change". Both mean the same thing. The release notes call it a backward-incompatible change, and so should everything you write.

When possible, a change is not backward-incompatible yet: it starts with a [deprecation](/glossary/deprecation/) first.

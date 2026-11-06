---
title: "Reconfigure flow"
description: "A flow that changes the settings a config entry needs to work, like its host, without removing and adding it again."
sidebarGroup: "Core and integrations"
term:
  aliases:
    - "reconfigure"
  code:
    - "async_step_reconfigure"
  ui: "Reconfigure"
  related:
    - "config-flow"
    - "options-flow"
    - "config-entry"
  autolink:
    - "reconfigure flow"
    - "reconfigure flows"
---

A reconfigure flow asks for the settings the integration cannot do without. That includes credentials users typed in, like a password. A [reauthentication](/glossary/reauthentication/) flow is different: Home Assistant starts it when the integration detects that the credentials no longer work. Optional settings belong in an [options flow](/glossary/options-flow/) instead.

Removing and adding a config entry again loses the names, areas, and other settings users gave its entities and devices. A reconfigure flow keeps them.

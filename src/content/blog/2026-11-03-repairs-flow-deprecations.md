---
title: "Repairs flows now require use of context for initiation"
description: As of Home Assistant Core 2026.12, setting `issue_id` in a `RepairsFlow` and the use of `data` to supply the `issue_id` to the `RepairsFlowManager` are deprecated. 
date: 2026-11-03
authors:
  - iluvdata
areas:
  - core
---

As of Home Assistant Core 2026.12, setting `issue_id` in a `RepairsFlow` and the use of `data` to supply the `issue_id` to the `RepairsFlowManager` are deprecated.

## Background

To align the repairs flow and repairs flow manager with other data entry flows and flow managers in Home Assistant the use of a flow context is now required to initiate a repairs flow. This will also allow repairs flow to support great flexibility in offering more advanced repairs to the user.

## `issue_id` attribute in repairs flows

Setting the `issue_id` attribute of a `RepairsFlow` is deprecated. Previously setting `issue_id` in the flow's constructor was futile as the `RepairsFlowManager` overwrote `issue_id` when creating a `RepairsFlow`. Going forward the repairs flow manager sets the `context` attribute in the flow and `issue_id` is available as a property.

## Use the `context` argument when initiating a repairs flow

Most integrations will not manually initiate a repairs flow.  Any integration doing so must provide the `issue_id` via `context` in `RepairsFlowManager.async_init`. Providing `issue_id` in the `data` argument (the legacy behavior) will still continue to initiate the corresponding flow with a deprecation warning in custom integrations until Home Assistant Core 2027.12.

```python
from homeassistant.components.repairs import repairs_flow_manager, RepairsFlowContext

from .const import DOMAIN

if rep_flow_mngr := repairs_flow_manager(hass):
  flow_result = await rep_flow_mngr.async_init(DOMAIN, context=RepairsFlowContext(issue_id="issue_id"))
```
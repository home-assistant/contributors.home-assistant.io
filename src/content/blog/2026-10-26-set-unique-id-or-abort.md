---
title: "New config flow helper: async_set_unique_id_or_abort"
description: "Config flows can now set the unique ID and run the matching abort check in one call."
date: 2026-10-26
authors:
  - Erwin Douna
areas:
  - core
---

Config flows have a new helper, `async_set_unique_id_or_abort`. It sets the unique ID of the flow, and then runs the abort check that fits the source of the flow:

- In reauthentication and reconfiguration flows, it calls `_abort_if_unique_id_mismatch`.
- In all other flows, it calls `_abort_if_unique_id_configured`, and passes on `updates` and `reload_on_update`.

```python
# Before
await self.async_set_unique_id(device.serial)
self._abort_if_unique_id_configured(updates={CONF_HOST: host})

# After
await self.async_set_unique_id_or_abort(device.serial, updates={CONF_HOST: host})
```

A step that is shared by the user flow and the reconfiguration flow no longer needs to check `self.source` to pick the right check.

A flow started by the user does not abort when another flow for the same unique ID is in progress, so the user takes over from a discovery flow for the same device. Other flows do abort in that case. Pass `raise_on_progress` to change this, and `reason` to use another abort reason.

The existing methods stay. Keep using `async_set_unique_id` with a separate check when the flow sets the unique ID and aborts at different moments, or when a reauthentication or reconfiguration flow allows the unique ID to change.

Read more in the [config flow documentation](/core/integrations/config-flow/#unique-ids).

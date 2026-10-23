---
title: Always pass a step_id to flow results
description: Leaving out step_id in async_show_form, async_show_menu, async_show_progress, or async_external_step is deprecated, and stops working in 2027.5.0.
date: 2026-10-23
authors:
  - G Johansson
areas:
  - core
---

When a step of a data entry flow shows a form, a menu, progress, or an external step, it now always has to pass a `step_id`. This goes for `async_show_form`, `async_show_menu`, `async_show_progress`, and `async_external_step`, in config flows, options flows, subentry flows, and repair flows alike.

## Why

Until now, `step_id` was optional. When you left it out, the flow manager filled in the step it had called. That goes wrong when one step method calls another directly: the result then gets the step ID of the first step, not of the step that built it.

Passing the `step_id` yourself removes that guesswork. The `step_id` is the name of the step method you are in, without `async_step_`:

```python
async def async_step_user(
    self, user_input: dict[str, Any] | None = None
) -> ConfigFlowResult:
    """Wait for the device to pair."""
    if not self._pair_task:
        self._pair_task = self.hass.async_create_task(self._async_pair())

    if not self._pair_task.done():
        return self.async_show_progress(
            step_id="user",
            progress_action="pairing",
            progress_task=self._pair_task,
        )

    return self.async_show_progress_done(next_step_id="finish")
```

## What changes

- Core integrations and core code that leave out `step_id` now raise an error. All core integrations already pass it.
- Custom integrations that leave it out log a deprecation warning. The flow manager still fills in the step it called, so your flows keep working until Home Assistant 2027.5.0.

In Home Assistant 2027.5.0, `step_id` becomes a required argument, and the fallback is removed. If you maintain a custom integration, search your flows for these four methods, and add the `step_id` where it is missing.

Read more in [forms, menus, and progress](/core/integrations/flow-steps/).

---
title: "Targets can exclude entities"
description: "A target can now leave out entities, devices, areas, floors, and labels with an exclude block. What that means for integrations that resolve targets themselves."
date: 2026-10-21
authors:
  - Jan-Philipp Benecke
areas:
  - core
---

Targeting an area, floor, or label is handy, until you want all of it except one or two things. Until now, the only way out was listing every entity separately, which loses the point of targeting the area in the first place.

So a target can now have an `exclude` block. It uses the same keys as the target itself, and Home Assistant removes whatever it matches from the resolved target:

```yaml
action: light.turn_on
target:
  floor_id: ground_floor
  exclude:
    area_id: kitchen
    label_id: night_light
```

Exclusions are resolved like the target, so they stay up to date. A light added to the kitchen later is left out as well. An exclusion applies to the whole target, including entities listed in the target directly. An `exclude` block on its own is not a valid target, and it can't be nested or use `all` or `none`.

## Nothing to do for most integrations

If Home Assistant resolves the target for you, your integration supports exclusions already:

- Entity actions registered with `async_register_platform_entity_service` or `async_register_entity_service`, including `entity_id: all`
- Triggers and conditions built on the entity helpers, like `make_entity_target_state_trigger`
- Code that uses `service.async_extract_entities`, `service.async_extract_entity_ids`, or `target.async_extract_referenced_entity_ids`
- Triggers that follow a target with `target.async_track_target_selector_state_change_event` or `TargetEntityChangeTracker`

## If you resolve targets yourself

`cv.TARGET_FIELDS`, `cv.ENTITY_SERVICE_FIELDS`, and `cv.TARGET_SERVICE_FIELDS` now accept `exclude`, and so does every schema built from them, like `cv.make_entity_service_schema`. If your code reads `entity_id`, `device_id`, or `area_id` from the target and resolves them on its own, it now accepts an `exclude` block and silently ignores it. That is worse than an error: the action or trigger then acts on exactly the entities the user asked to leave out.

Resolve the target with the target helpers instead. They apply the exclude block for you:

```python
from homeassistant.helpers import target as target_helpers

selection = target_helpers.TargetSelection(call.data)
selected = target_helpers.async_extract_referenced_entity_ids(
    hass, selection
)
entity_ids = selected.referenced | selected.indirectly_referenced
```

If your integration can't support exclusions, build its schema from `cv.TARGET_ID_FIELDS`. It has the target keys without `exclude`, so an exclude block fails validation instead of being ignored.

## New public API

- `TargetSelection.exclude`: the exclude block as a `TargetSelection`, or `None`. `TargetSelection.has_any_target` doesn't look at it, so a target with only an exclude block targets nothing.
- `target.async_extract_excluded_entity_ids(hass, target_selection)`: the entity IDs the exclude block matches.
- `cv.TARGET_ID_KEYS`: the keys that select what a target refers to. Use them instead of the keys of `cv.ENTITY_SERVICE_FIELDS` when you require at least one target, like `probatio.AtLeastOne(*cv.TARGET_ID_KEYS)`. That way a target with only an exclude block doesn't pass.
- `cv.TARGET_ID_FIELDS`: the target fields without `exclude`.

The details are in [entity actions](/core/integrations/actions/#entity-actions) and [triggers and conditions](/core/integrations/triggers-and-conditions/#targets-and-exclusions). The background is in [core pull request #187290](https://github.com/home-assistant/core/pull/187290).

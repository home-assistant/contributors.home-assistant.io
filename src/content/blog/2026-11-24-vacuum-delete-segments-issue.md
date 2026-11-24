---
title: Deleting the vacuum segments changed repair issue
description: Vacuum entities get async_delete_segments_issue(), so integrations can delete the segments changed repair once the robot reports the saved segments again.
date: 2026-11-24
authors:
  - Jan Bouwhuis
areas:
  - core
---

Vacuum integrations that support `CLEAN_AREA` call `async_create_segments_issue()` when the vacuum reports segments that differ from the segments saved with the area mapping. Until now, integrations had no way to delete that [repair](/glossary/repair/) again. The issue was only deleted after the user saved a changed area mapping. When the vacuum reported the saved segments again, the repair stayed open, and saving the mapping without changes didn't clear it either.

`StateVacuumEntity` now has a new method, `async_delete_segments_issue()`, to delete the issue again.

## Delete the issue when the segments match again

Call `async_delete_segments_issue()` when the vacuum reports the same segments as `last_seen_segments`. Calling it when no issue exists does nothing, so you can call it on every update.

```python
from homeassistant.components.vacuum import Segment, StateVacuumEntity
from homeassistant.core import callback


class MyVacuum(StateVacuumEntity):
    """Representation of a vacuum."""

    @callback
    def _async_handle_segments(self, segments: list[Segment]) -> None:
        """Create or delete the segments changed repair issue."""
        if (last_seen := self.last_seen_segments) is None:
            # No area mapping has been saved yet
            return
        if {s.id: s for s in last_seen} != {s.id: s for s in segments}:
            self.async_create_segments_issue()
        else:
            self.async_delete_segments_issue()
```

The method deletes the issue by its issue ID. This means it also deletes an issue that was created before the entity was reloaded. Like `async_create_segments_issue()`, it raises a `RuntimeError` when the entity has no entity registry entry.

You don't need to call the method after the user saves a changed area mapping. The vacuum entity still deletes the issue itself in that case.

## Update your integration

If your integration calls `async_create_segments_issue()`, also call `async_delete_segments_issue()` when the reported segments match `last_seen_segments` again. The MQTT vacuum platform does this from [core PR #194248](https://github.com/home-assistant/core/pull/194248).

For more information, see [core PR #194247](https://github.com/home-assistant/core/pull/194247) and the [vacuum entity documentation](/core/entities/vacuum/#cleaning-areas).


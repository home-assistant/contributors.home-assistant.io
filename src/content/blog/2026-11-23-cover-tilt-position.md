---
title: "Cover entities can describe their tilt position"
description: "Home Assistant Core 2026.12 adds four optional cover properties that say where the slats are open, where they are closed and what angle they have."
date: 2026-11-23
authors:
  - Paul Bottein
areas:
  - core
---

As of Home Assistant Core 2026.12, `CoverEntity` has four new optional properties that describe what the tilt position of a cover means: `open_tilt_position`, `closed_tilt_positions`, `tilt_start_angle`, and `tilt_end_angle`.

The tilt position is a number from 0 to 100, documented as closed at 0 and open at 100. Many covers don't work that way. The slats of a lot of blinds turn 180°, so they are closed at 0 and at 100, and open at 50. Nothing on the entity said so. The frontend and Alexa assume the slats are open at 100, and the HomeKit bridge assumes they are open at 50.

If your integration sets none of the new properties, nothing changes: the cover is open at 100 and closed at 0.

## The new properties

`open_tilt_position` is the tilt where the slats are open, which is where `open_cover_tilt` moves them.

`closed_tilt_positions` is a list of the one or two tilts where the slats are closed. `close_cover_tilt` moves the slats to one of them, and leaves slats that are already closed where they are.

`tilt_start_angle` and `tilt_end_angle` are the angles of the slats at tilt 0 and at tilt 100, from -90 to 90 degrees. 0° is a slat perpendicular to the cover, and at -90° and 90° the slat lies flat in the plane of the cover. Set both or neither.

When you only set the angles, Home Assistant works out the positions: the cover is open where the angle is 0°, and closed at the ends where the angle is -90° or 90°.

A blind that is open in the middle of the scale:

```python
class MyBlind(CoverEntity):
    _attr_open_tilt_position = 50
    _attr_closed_tilt_positions = [0, 100]
```

A blind that knows the angle of its slats. It is open at 50, where the angle is 0°, and closed at 0 and 100:

```python
class MyBlind(CoverEntity):
    _attr_tilt_start_angle = -90
    _attr_tilt_end_angle = 90
```

## What changes in Home Assistant

- A cover that supports `SET_TILT_POSITION` gets the `open_tilt_position` and `closed_tilt_positions` attributes, which are 100 and `[0]` unless the integration says otherwise. The `tilt_start_angle` and `tilt_end_angle` attributes are added when the integration sets both angles.
- `toggle_tilt` opens the slats when they are at a closed position and closes them otherwise. It used to open them only at 0.
- A scene that opens the slats moves them to the open position, where it used 100. A scene that closes them uses the first closed position, and leaves slats that are already closed where they are.

## Check your integration for the new names

A cover entity that already has a property or an attribute named `open_tilt_position`, `closed_tilt_positions`, `tilt_start_angle`, or `tilt_end_angle` with another meaning now replaces the new one. Rename it, or make it return what the new property expects.

More details are in the [cover entity documentation](/core/entities/cover/#tilt-position).

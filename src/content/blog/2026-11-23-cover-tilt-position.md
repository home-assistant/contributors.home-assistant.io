---
title: "Cover entities can describe their tilt position"
description: "Home Assistant Core 2026.12 adds three optional cover properties that say where the slats are open and what angle they have."
date: 2026-11-23
authors:
  - Paul Bottein
areas:
  - core
---

As of Home Assistant Core 2026.12, `CoverEntity` has three new optional properties that describe what the tilt position of a cover means: `open_tilt_position`, `tilt_start_angle`, and `tilt_end_angle`.

The tilt position is a number from 0 to 100, documented as closed at 0 and open at 100. Many covers don't work that way. The slats of a lot of blinds turn 180°, so they are closed at 0 and at 100, and open at 50. Nothing on the entity said so, and everything that reads the tilt had to guess where the slats are open.

If your integration sets none of the new properties, nothing changes: the cover is open at 100.

## The new properties

`open_tilt_position` is the tilt where the slats are open, which is where `open_cover_tilt` moves them.

`tilt_start_angle` and `tilt_end_angle` are the angle of the slats at tilt 0 and at tilt 100, from -90 to 90 degrees. 0° is a slat perpendicular to the cover, and at -90° and 90° the slat lies in the plane of the cover. Set both or neither.

When you only set the angles, the open position is the tilt where the slats are closest to perpendicular.

A blind that is open in the middle of the scale:

```python
class MyBlind(CoverEntity):
    _attr_open_tilt_position = 50
```

A blind that knows the angle of its slats. The open position is 50, where the angle is 0°:

```python
class MyBlind(CoverEntity):
    _attr_tilt_start_angle = -90
    _attr_tilt_end_angle = 90
```

## What changes in Home Assistant

- A cover that supports a tilt feature gets an `open_tilt_position` attribute, which is 100 unless the integration says otherwise. The `tilt_start_angle` and `tilt_end_angle` attributes are added when the integration sets both angles.
- An end of the scale, 0 or 100, is closed unless it is the open position. `toggle_tilt` opens the slats at a closed end and closes them otherwise. It used to open them only at 0.
- A scene that opens the slats moves them to the open position, where it used 100.

## Check your integration for the new names

A cover entity that already has a property or an attribute named `open_tilt_position`, `tilt_start_angle`, or `tilt_end_angle` with another meaning now replaces the new one. Rename it, or make it return what the new property expects.

More details are in the [cover entity documentation](/core/entities/cover/#tilt-position).

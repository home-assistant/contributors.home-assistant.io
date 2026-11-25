---
title: "Cover entities can describe their tilt position"
description: "Home Assistant Core 2026.12 adds four optional cover properties that say where the slats are open, where they are closed and what angle they have."
date: 2026-11-25
authors:
  - Paul Bottein
areas:
  - core
---

As of Home Assistant Core 2026.12, `CoverEntity` has four new optional properties that describe what the tilt position of a cover means: `open_tilt_position`, `closed_tilt_positions`, `tilt_start_angle`, and `tilt_end_angle`.

The tilt position is a number from 0 to 100, documented as closed at 0 and open at 100. Many covers don't work that way. The slats of a lot of blinds turn 180°, so they are closed at 0 and at 100, and open at 50. Nothing on the entity said so. The frontend and Alexa assume the slats are open at 100, and the HomeKit bridge assumes they are open at 50. They will read the new attributes in later releases.

If your integration sets none of the new properties, nothing changes in how the cover behaves: it is open at 100 and closed at 0. If it supports `SET_TILT_POSITION`, its state gets the `open_tilt_position` and `closed_tilt_positions` attributes, so state snapshots in your tests change.

## The new properties

`open_tilt_position` is the tilt where the slats are open, which is where `open_cover_tilt` moves them.

`closed_tilt_positions` is the list of the tilts where the slats are closed: 0, 100, or both. `close_cover_tilt` moves the slats to the most closed position. With both 0 and 100, your integration decides what that means: if one end blocks more light, it closes there. If both ends are equally closed, it can leave slats that are known to be closed where they are, or always close to the same end. If the tilt is only assumed, it closes anyway.

`tilt_start_angle` and `tilt_end_angle` are the angles of the slats at tilt 0 and at tilt 100, from -90 to 90 degrees. 0° is a slat perpendicular to the cover, and at -90° and 90° the slat lies flat in the plane of the cover. Set both or neither.

When you only set the angles, Home Assistant works out the positions: the cover is open where the angle is closest to 0°, and closed where the slats lie the flattest.

A blind that is open in the middle of the scale:

```python
class MyBlind(CoverEntity):
    _attr_supported_features = (
        CoverEntityFeature.OPEN_TILT
        | CoverEntityFeature.CLOSE_TILT
        | CoverEntityFeature.SET_TILT_POSITION
    )
    _attr_open_tilt_position = 50
    _attr_closed_tilt_positions = [0, 100]
```

A blind that knows the angle of its slats. It is open at 50, where the angle is 0°, and closed at 0 and 100:

```python
class MyBlind(CoverEntity):
    _attr_supported_features = (
        CoverEntityFeature.OPEN_TILT
        | CoverEntityFeature.CLOSE_TILT
        | CoverEntityFeature.SET_TILT_POSITION
    )
    _attr_tilt_start_angle = -90
    _attr_tilt_end_angle = 90
```

## What changes in Home Assistant

- A cover that supports `SET_TILT_POSITION` gets the `open_tilt_position` and `closed_tilt_positions` attributes, which are 100 and `[0]` unless the integration says otherwise. The `tilt_start_angle` and `tilt_end_angle` attributes are added when the integration sets both angles.
- `toggle_tilt` opens the slats when they are at a closed position and closes them otherwise. It used to open them only at 0.
- A scene that stores a tilt position still moves the slats to that position. A scene that only says open or closed still opens or closes the tilt. A cover that can only set its tilt position is moved to the open position or the first closed position, where it used 100 and 0.

## Adopting the properties

When your integration starts to set the properties, `toggle_tilt`, scenes, and later the frontend and voice assistants open the slats at the new open position instead of 100. That changes what your users see, so mark the pull request as a [backward-incompatible change](/releases/guides/backward-incompatible-changes/): check **Breaking change** and fill in the **Breaking change** section of the pull request description. That section is what goes into the release notes. In the same pull request, make `open_cover_tilt` move the slats to `open_tilt_position`, and `close_cover_tilt` follow the rules in the [cover entity documentation](/core/entities/cover/#tilt-position).

## Check your integration for the new names

If your cover entity already has a property or an attribute named `open_tilt_position`, `closed_tilt_positions`, `tilt_start_angle`, or `tilt_end_angle` for something else, Home Assistant now reads it as the new property. A value it doesn't expect raises a `ValueError`, and a cover that supports `SET_TILT_POSITION` is not added. Rename it, or make it return what the new property expects. The Hunter Douglas PowerView integration renamed its own `open_tilt_position` for this reason.

If your entity overrides `capability_attributes`, include `super().capability_attributes`, or the new attributes are left out.

More details are in the [cover entity documentation](/core/entities/cover/#tilt-position).

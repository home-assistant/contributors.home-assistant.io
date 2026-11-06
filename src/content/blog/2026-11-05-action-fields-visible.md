---
title: "Show action fields based on other fields"
description: As of Home Assistant Core 2026.12, fields and sections in services.yaml can show only while other fields of the action have certain values.
date: 2026-11-05
authors:
  - Paul Bottein
areas:
  - core
---

As of Home Assistant Core 2026.12, fields and sections in `services.yaml` take the same `visible` condition as [config flows, options flows, and blueprints](/blog/2026/10/21/form-fields-visible). A field then only shows in the action editor while other fields of the action have certain values.

```yaml
set_sleep_timer:
  target:
    entity:
      domain: media_player
  fields:
    mode:
      required: true
      default: duration
      selector:
        select:
          options:
            - duration
            - end_of_track
    duration:
      required: true
      visible:
        field: mode
        value: duration
      selector:
        duration:
```

**Duration** only shows while **Mode** is set to `duration`, or left to its default. Put `visible` on a section to hide the whole section. A hidden field is not required, and when it gets hidden while the action is edited, its value is removed from the action data.

Unlike config flows and blueprints, this only changes the action editor: actions written in YAML can still pass a hidden field. Keep validating every call in the schema of your action, and reject combinations that make no sense.

Read [show fields only when they apply](/core/integrations/actions/#show-fields-only-when-they-apply) for the available conditions and what hassfest checks.

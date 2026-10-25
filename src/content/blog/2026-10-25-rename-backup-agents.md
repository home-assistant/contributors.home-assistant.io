---
title: "Backup agents can now be renamed"
description: As of Home Assistant Core 2026.11, an integration can move the backup settings of an agent to a new agent ID with async_rename_agent.
date: 2026-10-25
authors:
  - Josef Zweck
areas:
  - core
---

As of Home Assistant Core 2026.11, an integration can rename a backup agent with `async_rename_agent`.

Use it when your integration changes how it builds the `unique_id` of an agent, which changes the ID of the agent. Users then keep their backup settings for the agent, and don't have to set it up again.

```python
from homeassistant.components.backup import async_get_manager

async_get_manager(hass).async_rename_agent(
    f"{DOMAIN}.{old_agent_unique_id}", f"{DOMAIN}.{new_agent_unique_id}"
)
```

Add `backup` to `after_dependencies` in your `manifest.json`. Read more in [rename an agent](/core/integrations/backup/#rename-an-agent).

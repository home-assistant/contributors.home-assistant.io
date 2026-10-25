---
title: Backup
description: Add a backup agent that stores Home Assistant backups somewhere, or prepare your integration for a backup.
sidebarGroup: Integration features
order: 9
---

An integration can take part in backups in two ways, both in a `backup.py` platform file:

- **A backup agent** stores backups somewhere: a network share, a cloud storage service, or anything else. Users pick the agents in the backup settings.
- **Pre and post hooks** pause or prepare your integration before a backup, and resume after it.

## Add a backup agent

A backup agent extends `BackupAgent` from `homeassistant.components.backup`, and implements five methods:

```python
from collections.abc import AsyncIterator, Callable, Coroutine
from typing import Any

from homeassistant.components.backup import (
    AgentBackup,
    BackupAgent,
    BackupAgentError,
    BackupNotFound,
    OnProgressCallback,
)


class ExampleBackupAgent(BackupAgent):
    """Store backups at Example."""

    domain = DOMAIN

    def __init__(self, entry: ExampleConfigEntry) -> None:
        """Initialize the agent."""
        super().__init__()
        self._client = entry.runtime_data
        self.name = entry.title
        self.unique_id = entry.entry_id

    async def async_upload_backup(
        self,
        *,
        open_stream: Callable[[], Coroutine[Any, Any, AsyncIterator[bytes]]],
        backup: AgentBackup,
        on_progress: OnProgressCallback,
        **kwargs: Any,
    ) -> None:
        """Upload a backup."""

    async def async_download_backup(
        self, backup_id: str, **kwargs: Any
    ) -> AsyncIterator[bytes]:
        """Download a backup."""

    async def async_delete_backup(self, backup_id: str, **kwargs: Any) -> None:
        """Delete a backup."""

    async def async_list_backups(self, **kwargs: Any) -> list[AgentBackup]:
        """List the backups."""

    async def async_get_backup(
        self, backup_id: str, **kwargs: Any
    ) -> AgentBackup:
        """Return one backup."""
```

- `domain`, `name`, and `unique_id` identify the agent. Keep `unique_id` stable.
- `async_upload_backup` gets a function that opens a stream of the backup, and the metadata of the backup in `backup`.
- `async_download_backup`, `async_delete_backup`, and `async_get_backup` raise `BackupNotFound` when the backup does not exist.
- On any other error, raise `BackupAgentError`, or an exception that extends it. Other exceptions are not expected to leave the agent.

### Report upload progress

Call `on_progress` while you upload, for example after each chunk, with the total number of bytes uploaded so far. Home Assistant uses it to show the progress of the upload in the UI.

```python
on_progress(bytes_uploaded=bytes_sent)
```

### Tell Home Assistant about your agents

Home Assistant gets your agents from two functions in `backup.py`:

```python
from homeassistant.core import HomeAssistant, callback


async def async_get_backup_agents(hass: HomeAssistant) -> list[BackupAgent]:
    """Return the backup agents."""
    return [
        ExampleBackupAgent(entry)
        for entry in hass.config_entries.async_loaded_entries(DOMAIN)
    ]


@callback
def async_register_backup_agents_listener(
    hass: HomeAssistant,
    *,
    listener: Callable[[], None],
    **kwargs: Any,
) -> Callable[[], None]:
    """Register a listener for when agents are added or removed."""
    hass.data.setdefault(DATA_BACKUP_AGENT_LISTENERS, []).append(listener)

    @callback
    def remove_listener() -> None:
        """Remove the listener."""
        hass.data[DATA_BACKUP_AGENT_LISTENERS].remove(listener)

    return remove_listener
```

Call the listeners whenever your agents change, so Home Assistant asks for them again. For agents that follow config entries, call them when an entry is loaded or unloaded, in `async_setup_entry`:

```python
def _notify_backup_listeners() -> None:
    for listener in hass.data.get(DATA_BACKUP_AGENT_LISTENERS, []):
        listener()

entry.async_on_unload(entry.async_on_state_change(_notify_backup_listeners))
```

`DATA_BACKUP_AGENT_LISTENERS` is a key you define yourself, in `const.py`.

### Rename an agent

The ID of an agent is `<domain>.<unique_id>`, built from the `unique_id` of the agent. It doesn't have to match anything on the config entry. If a new version of your integration sets `unique_id` differently, users lose their backup settings for the agent. Call `async_rename_agent` once to move them to the new ID, for example in a config entry migration:

```python
from homeassistant.components.backup import async_get_manager


async def async_migrate_entry(hass: HomeAssistant, entry: ExampleConfigEntry) -> None:
    """Migrate old entry."""
    if entry.version == 1 and entry.minor_version == 1:
        # The agent used the config entry ID, now it uses the account ID
        async_get_manager(hass).async_rename_agent(
            f"{DOMAIN}.{entry.entry_id}", f"{DOMAIN}.{entry.data[CONF_ACCOUNT_ID]}"
        )
        hass.config_entries.async_update_entry(entry, minor_version=2)
```

- It moves the settings of the agent, whether automatic backups use it, and the failed uploads to it. The backups the agent stores are not touched.
- Add `backup` to `after_dependencies` in `manifest.json`, so the backup integration is set up before your migration runs.
- Only call it when the ID changes.
- It raises `ValueError` when the old ID has settings and the new ID already exists. This usually means another agent already uses the new ID, which the user has to fix. Let the migration fail.

## Prepare for a backup

Some integrations need to pause or write their data before a backup, so it can be restored properly. Add these two functions to `backup.py`, or run `python3 -m script.scaffold backup`:

```python
from homeassistant.core import HomeAssistant


async def async_pre_backup(hass: HomeAssistant) -> None:
    """Prepare for a backup."""


async def async_post_backup(hass: HomeAssistant) -> None:
    """Resume after a backup."""
```

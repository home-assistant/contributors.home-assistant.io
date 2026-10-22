---
title: Repairs
description: Tell users about problems they need to act on, and help them fix those problems with a repair flow.
sidebarGroup: Integration features
order: 6
---

A [repair](/glossary/repair/) issue tells users about something that needs their attention, like a firmware that is too old, an API that is shutting down, or YAML configuration that is no longer supported. Issues show up under **Settings** > **System** > **Repairs**. Some only explain what to do, others can be fixed right there, with a repair flow.

Repairs are also how a [deprecation](/core/development/deprecating/) that affects users is announced, which is one of their most common uses. Deprecations of core APIs are reported to developers in the log instead.

## Create an issue

```python
from homeassistant.helpers import issue_registry as ir

ir.async_create_issue(
    hass,
    DOMAIN,
    "firmware_too_old",
    is_fixable=False,
    severity=ir.IssueSeverity.ERROR,
    translation_key="firmware_too_old",
    translation_placeholders={"version": device.firmware_version},
    learn_more_url="https://www.home-assistant.io/integrations/example",
)
```

| Argument | Default | What it is |
| --- | --- | --- |
| `domain` | | The domain that creates the issue |
| `issue_id` | | An ID for the issue, unique within the domain. Creating an issue with an existing ID updates it. |
| `is_fixable` | | Whether users can fix the issue with a repair flow |
| `severity` | | How bad it is. See below. |
| `translation_key` | | The key of the title and description in `strings.json` |
| `translation_placeholders` | `None` | Values for the placeholders in the text |
| `config_entry_id` | `None` | The config entry the issue belongs to. The issue is hidden while that entry is disabled, and deleted when the entry is removed. See [issues that belong to a config entry](#issues-that-belong-to-a-config-entry). |
| `breaks_in_ha_version` | `None` | The version in which something breaks, like `"2027.4.0"` |
| `learn_more_url` | `None` | Where users find more information |
| `is_persistent` | `False` | Whether the issue survives a restart. See [persistence](#persistence). |
| `issue_domain` | `None` | Set when you create an issue on behalf of another integration |
| `data` | `None` | Data for your repair flow. Not shown to users. |

| Severity | Use it when |
| --- | --- |
| `IssueSeverity.CRITICAL` | Reserved for true panic |
| `IssueSeverity.ERROR` | Something is broken now, and needs attention right away |
| `IssueSeverity.WARNING` | Something will break in the future, like an API shutting down |

The text goes in `strings.json`, under `issues`:

```json
{
  "issues": {
    "firmware_too_old": {
      "title": "The firmware of your Example device is too old",
      "description": "Update the firmware from {version} in the Example app."
    }
  }
}
```

A fixable issue has a `fix_flow` instead of a `description`, with the texts of the steps of its [repair flow](#fix-an-issue-with-a-repair-flow), the same way as a config flow:

```json
{
  "issues": {
    "settings_outdated": {
      "title": "Your Example settings need to be updated",
      "fix_flow": {
        "step": {
          "confirm": {
            "title": "Update the Example settings",
            "description": "Select **Submit** to update your settings."
          }
        }
      }
    }
  }
}
```

## Delete an issue

When the problem is gone, delete the issue:

```python
ir.async_delete_issue(hass, DOMAIN, "firmware_too_old")
```

A typical pattern: check for the problem in `async_setup_entry`, and create or delete the issue based on the result.

## Issues that belong to a config entry

When an issue is about one config entry, like outdated firmware on a device or an expired API key, set `config_entry_id` to the ID of that entry. The issue then belongs to the entry: it is hidden while the entry is disabled, and deleted when the entry is removed. You do not need to delete it yourself in `async_remove_entry`.

```python
ir.async_create_issue(
    hass,
    DOMAIN,
    f"firmware_too_old_{entry.entry_id}",
    config_entry_id=entry.entry_id,
    is_fixable=False,
    severity=ir.IssueSeverity.WARNING,
    translation_key="firmware_too_old",
    translation_placeholders={"version": device.firmware_version},
)
```

A few things to keep in mind:

- Issues are still identified by their domain and `issue_id`, so the `issue_id` must stay unique within your domain. When several config entries can raise the same kind of issue, put the entry ID in the `issue_id`.
- The config entry must exist. Passing an unknown ID raises `HomeAssistantError`.
- Creating an issue that already exists replaces its `config_entry_id`, also when you leave `config_entry_id` out.
- Issues that belong to a config entry that no longer exists are deleted when Home Assistant starts.

Leave `config_entry_id` out for issues that are not about a single config entry, like YAML configuration that is no longer supported.

## Fix an issue with a repair flow

For an issue with `is_fixable=True`, users get a **Fix** button. It starts a repair flow: a [data entry flow](/core/integrations/flow-steps/), like a config flow. When the flow finishes with `async_create_entry`, the issue is removed.

If the fix is only a confirmation, you do not need any code: without a `repairs.py`, Home Assistant uses `ConfirmRepairFlow`, which asks the user to confirm and then removes the issue. The text of that confirmation is the `confirm` step in the `fix_flow` of the issue.

For anything else, create `repairs.py` with `async_create_fix_flow`, which returns the flow for an issue:

```python
import probatio

from homeassistant.components.repairs import RepairsFlow, RepairsFlowResult
from homeassistant.core import HomeAssistant


class MigrateSettingsFlow(RepairsFlow):
    """Move the settings to the new format."""

    async def async_step_init(
        self, user_input: dict[str, str] | None = None
    ) -> RepairsFlowResult:
        """Start the fix."""
        return await self.async_step_confirm()

    async def async_step_confirm(
        self, user_input: dict[str, str] | None = None
    ) -> RepairsFlowResult:
        """Ask the user to confirm, then fix it."""
        if user_input is not None:
            await async_migrate_settings(self.hass, self.data["entry_id"])
            return self.async_create_entry(data={})

        return self.async_show_form(
            step_id="confirm", data_schema=probatio.Schema({})
        )


async def async_create_fix_flow(
    hass: HomeAssistant,
    issue_id: str,
    data: dict[str, str | int | float | None] | None,
) -> RepairsFlow:
    """Create the flow that fixes an issue."""
    return MigrateSettingsFlow()
```

Home Assistant sets `issue_id` and `data` on the flow from the issue. Do not pass them to the flow yourself: they would be overwritten.

### Continue in a config or options flow

Sometimes the fix is to reconfigure something, like the config entry or a subentry. A repair flow can hand over to that flow with `next_flow`:

```python
from homeassistant.components.repairs import FlowType
from homeassistant.config_entries import SOURCE_RECONFIGURE

if user_input is not None:
    result = await self.hass.config_entries.flow.async_init(
        DOMAIN,
        context={
            "source": SOURCE_RECONFIGURE,
            "entry_id": self.data["entry_id"],
        },
    )

    return self.async_abort(
        reason="reconfigure",
        next_flow=(FlowType.CONFIG_FLOW, result["flow_id"]),
    )
```

Aborting does not remove the issue. Delete it yourself once the fix is done, for example in the reconfigure step, right before `async_update_reload_and_abort`, or in `async_setup_entry`.

If the migration of a config entry failed and the user can fix the cause, call `hass.config_entries.async_retry_migration(entry_id)` from the repair flow once it is fixed. See [migrate a config entry](/core/integrations/config-entries/#migrate-a-config-entry).

## Persistence

An issue stays until the integration that created it deletes it, the user fixes it, or the [config entry it belongs to](#issues-that-belong-to-a-config-entry) is removed. What happens after a restart depends on `is_persistent`:

- **Not persistent** (the default): the issue is not shown after a restart, until your integration creates it again. Use this for problems you can check for, like an old firmware. Your integration checks again on the next start anyway.
- **Persistent**: the issue is shown again after a restart. Use this for problems you can only see when they happen, like a failed update.

Users can also ignore an issue. It stays ignored, also across restarts, until it is deleted and created again.

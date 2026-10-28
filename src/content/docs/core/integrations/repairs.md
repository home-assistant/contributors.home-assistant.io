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

Only delete an issue when the problem is really gone. Deleting an issue and creating it again shows it to users as a new issue, and it forgets that they ignored it. When you check a whole set of issues at once, like one per device, use a [refresh](#refresh-a-set-of-issues) instead of deleting them all first.

You do not need to delete issues in `async_unload_entry` or `async_remove_entry`. Set [`config_entry_id`](#issues-that-belong-to-a-config-entry) instead, and Home Assistant takes care of them. Deleting issues on unload even works against users: a reload unloads the entry too, so every issue they ignored comes back.

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

- Issues are still identified by their domain and `issue_id`, so the `issue_id` must stay unique within your domain. When several config entries can raise the same kind of issue, put the entry ID in the `issue_id`. Otherwise all entries share one issue, it belongs to whichever entry created it last, and removing that entry deletes it for all of them.
- The config entry must exist. Passing an unknown ID raises `HomeAssistantError`. In `async_remove_entry`, the entry is already gone.
- Creating an issue that already exists replaces its `config_entry_id`, also when you leave `config_entry_id` out. Pass it every time you create the issue.
- Issues that belong to a config entry that no longer exists are deleted when Home Assistant starts.
- While the entry is disabled, the issue is hidden from **Repairs** and from the `issues()` template function, but not deleted. When the user enables the entry again, the issue is back, ignored or not.
- Do not set `config_entry_id` on an issue about a config entry that is about to remove itself, like the entry of an integration that is migrated to another one. The notice about the migration would be deleted together with the entry.
- An issue created before your integration set `config_entry_id` belongs to no entry until it is created again. Most issues are created again on the next start. A [persistent](#persistence) issue that is never created again may still need to be deleted in `async_remove_entry` for a while.

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

## Refresh a set of issues

Often, your integration checks a whole set of issues at once: one per device, per vehicle, or per item in the configuration. After the check, the issues of problems that are still there must stay, the issues of new problems must be created, and the issues of problems that are gone must be deleted. That includes issues from before a restart, of devices that no longer exist.

It's tempting to delete all the issues first, and then create the ones that are still valid. Don't: every problem that is still there gets a brand new issue. Users see issues disappear and come back, and every issue they ignored shows up again. Keeping track of which issues you created yourself takes a lot of code, and it still misses the issues from before a restart.

An issue refresh does it for you. You begin a refresh for a set of issues, create the issues that are still valid, and finish the refresh. Finishing deletes the issues of the set that were not created again. The ones that were created again were never deleted, so they stay ignored, and users see no change.

Before:

```python
issue_registry = ir.async_get(hass)
for domain, issue_id in list(issue_registry.issues):
    if domain == DOMAIN and issue_id.startswith("firmware_too_old_"):
        ir.async_delete_issue(hass, DOMAIN, issue_id)

for device in coordinator.data.devices.values():
    if device.firmware_version < MINIMUM_FIRMWARE:
        ir.async_create_issue(
            hass,
            DOMAIN,
            f"firmware_too_old_{device.id}",
            config_entry_id=entry.entry_id,
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="firmware_too_old",
            translation_placeholders={"version": device.firmware_version},
        )
```

After:

```python
with ir.async_refresh_issues(
    hass,
    DOMAIN,
    issue_id_pattern="firmware_too_old_",
    config_entry_id=entry.entry_id,
):
    for device in coordinator.data.devices.values():
        if device.firmware_version < MINIMUM_FIRMWARE:
            ir.async_create_issue(
                hass,
                DOMAIN,
                f"firmware_too_old_{device.id}",
                config_entry_id=entry.entry_id,
                is_fixable=False,
                severity=ir.IssueSeverity.WARNING,
                translation_key="firmware_too_old",
                translation_placeholders={"version": device.firmware_version},
            )
```

### Choose the issues to refresh

`ir.async_refresh_issues` returns an `IssuesRefresh`. It takes the domain of the issues, and narrows down the set with these arguments:

| Argument | What it selects |
| --- | --- |
| `issue_id_pattern` | Issues whose ID matches the regular expression, from the start of the ID. Pass a string or a compiled `re.Pattern`. |
| `issue_ids` | Exactly these issues. IDs of issues that do not exist are skipped. |
| `config_entry_id` | Only issues that [belong to](#issues-that-belong-to-a-config-entry) this config entry. Combines with the other two. |

Pass `issue_id_pattern` or `issue_ids`, not both: that raises `ValueError`. Pass neither to refresh every issue of the domain.

The pattern is matched with `re.match`, from the start of the issue ID. A plain prefix like `firmware_too_old_` is therefore a valid pattern. End it with a separator, like the `_` in `battery_low_`, so it does not also match `battery_lowest_abc123`. Pass a compiled pattern when you use it more than once:

```python
import re

VEHICLE_ISSUE_ID_PATTERN = re.compile(
    f"({'|'.join(map(re.escape, VEHICLE_ISSUE_TYPES))})_"
)

with ir.async_refresh_issues(
    hass,
    DOMAIN,
    issue_id_pattern=VEHICLE_ISSUE_ID_PATTERN,
    config_entry_id=entry.entry_id,
):
    ...
```

When your integration can be set up more than once, pass `config_entry_id`, so the refresh of one entry does not delete the issues of another. That only covers issues that belong to the entry: an issue that was created before you set `config_entry_id` is not part of the set until it is created again with it.

The set is decided when the refresh begins. It includes issues from before a restart that were not created again yet, so a refresh in `async_setup_entry` also cleans up after devices that are gone. An issue that you create during the refresh, and that was not in the set, is created as usual.

### Create the issues anywhere

You do not create issues through the refresh. Any call to `ir.async_create_issue` for an issue of the set keeps it. That means the issues do not have to be created in the `with` block itself: helpers and callbacks that check the issues can create them, as long as that happens before the refresh finishes. The `with` block can await, too.

Put the refresh around the code that checks the issues, and nothing more. When a platform checks issues while it creates its entities, begin the refresh in the `async_setup_entry` of that platform:

```python
async def async_setup_entry(
    hass: HomeAssistant,
    entry: ExampleConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the cameras."""
    with ir.async_refresh_issues(
        hass,
        DOMAIN,
        issue_id_pattern="rtsp_disabled_",
        config_entry_id=entry.entry_id,
    ):
        entities = _async_camera_entities(hass, entry)
    async_add_entities(entities)
```

Do not wrap `async_forward_entry_setups` in a refresh. When a platform fails to set up, or raises `PlatformNotReady` and is retried later, `async_forward_entry_setups` does not raise. The refresh then finishes before the platform checked its issues, and deletes them, also the ones users ignored.

This only works when your issue IDs are stable: the same problem must get the same ID after a reload or a restart. Build them from things that do not change, like the ID of a device. Do not use a counter, or Python's `hash()`, which gives a different result every time Home Assistant starts.

### Keep issues you could not check

Sometimes you cannot tell whether an issue is still valid. The device did not answer, or the data you need is not there yet. Deleting the issue would be wrong, and so would creating it again with stale information. Call `IssuesRefresh.async_keep` to leave those issues as they are:

```python
with ir.async_refresh_issues(
    hass,
    DOMAIN,
    issue_id_pattern="firmware_too_old_",
    config_entry_id=entry.entry_id,
) as refresh:
    for device in devices:
        issue_id = f"firmware_too_old_{device.id}"
        try:
            version = await device.async_get_firmware_version()
        except DeviceUnavailable:
            refresh.async_keep([issue_id])
            continue
        if version < MINIMUM_FIRMWARE:
            ir.async_create_issue(
                hass,
                DOMAIN,
                issue_id,
                config_entry_id=entry.entry_id,
                is_fixable=False,
                severity=ir.IssueSeverity.WARNING,
                translation_key="firmware_too_old",
                translation_placeholders={"version": version},
            )
```

`async_keep` takes a list of issue IDs. It does not create or change the issues. Issues outside the set of the refresh are ignored.

Often, the code that checks an issue does not have the refresh object, for example a helper that also runs outside a refresh when a new device shows up. Call `ir.async_keep_issue` there instead:

```python
@callback
def _async_check_stream_issue(
    hass: HomeAssistant, entry: ExampleConfigEntry, camera: Camera
) -> None:
    issue_id = f"rtsp_disabled_{camera.id}"
    if camera.streams is None:
        # The streams could not be read, so the issue can't be checked
        ir.async_keep_issue(hass, DOMAIN, issue_id)
    elif camera.streams.active:
        ir.async_delete_issue(hass, DOMAIN, issue_id)
    else:
        ir.async_create_issue(
            hass,
            DOMAIN,
            issue_id,
            config_entry_id=entry.entry_id,
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="rtsp_disabled",
        )
```

`ir.async_keep_issue` keeps the issue in every active refresh that includes it, just like creating it again unchanged. When no active refresh includes the issue, it does nothing.

It also helps when the issue is checked too late for the refresh. Say an entity creates or deletes its issue when it first runs, which may be after a reload has finished its refresh. Keep the issue where the entity is set up, which happens during the refresh, and the entity decides about it later.

### Finish or cancel

A refresh ends in one of two ways:

- `IssuesRefresh.async_finish()` deletes the issues of the set that were not created or kept since the refresh began.
- `IssuesRefresh.async_cancel()` deletes only the issues whose delete was [deferred to the refresh](#delete-an-issue-during-a-refresh). Other issues are left as they are, until the next refresh that finishes. Use it when the check did not complete, so you cannot tell which issues are stale.

Once a refresh has ended, calling `async_finish()` or `async_cancel()` again does nothing.

The `with` block finishes the refresh when the block completes, and cancels it when an exception is raised in it. Because a cancelled refresh still applies deferred deletes, a reload can run in a `with` block too.

You can also call the methods yourself, when the refresh does not fit in one block. In `async_setup_entry`, register `async_cancel` with `entry.async_on_unload`, so that a failed setup cancels the refresh:

```python
refresh = ir.async_refresh_issues(
    hass,
    DOMAIN,
    issue_id_pattern="gateway_not_found_",
    config_entry_id=entry.entry_id,
)
entry.async_on_unload(refresh.async_cancel)

for site in sites:
    await _async_setup_site(hass, entry, site)

refresh.async_finish()
```

A refresh that never ends never deletes anything.

### Delete an issue during a refresh

Take a reload, which removes the old entities and adds new ones. An old entity deletes its issue when it is removed. That is right when the entity is removed for good, but during a reload, the new entity may create the same issue again. Pass `defer_to_refresh=True` to leave the decision to the refresh:

```python
async def async_will_remove_from_hass(self) -> None:
    """Run when the entity is removed."""
    ir.async_delete_issue(
        self.hass, DOMAIN, self.repair_issue_id, defer_to_refresh=True
    )
```

Then run the reload in a refresh of those issues:

```python
with ir.async_refresh_issues(
    hass,
    DOMAIN,
    issue_ids=[entity.repair_issue_id for entity in old_entities],
):
    for entity in old_entities:
        await entity.async_remove()
    await component.async_add_entities(new_entities)
```

With `defer_to_refresh=True`, an issue in the set of an active refresh is left for that refresh to delete. It survives if it is created or kept again while the refresh runs, before or after the deferred delete, so it does not matter whether the old entity is removed or the new one is added first. Otherwise, the refresh deletes it when it ends, also when it is cancelled, so a failed reload does not leave the issues of removed entities behind.

When no active refresh includes the issue, it is deleted immediately, as if you had not passed `defer_to_refresh`. A delete without `defer_to_refresh` always deletes immediately, also during a refresh.

### Overlapping refreshes

Two refreshes can include the same issue, for example when a reload starts while a setup is still running. The newest active refresh that includes the issue decides about it, also about a deferred delete:

- An older refresh does not delete an issue while a newer one includes it, and does not delete an issue that a newer one kept.
- When the newer refresh ends without deleting the issue, for example because it is cancelled, the older one decides again. It deletes the issue only if the issue was not created or kept since the older refresh began.
- A deferred delete that arrives after the newer refresh has ended waits for the older one.
- `IssuesRefresh.async_keep` keeps the issue for that refresh and older ones, not for a newer one. `ir.async_keep_issue` keeps it in all of them.

### Refresh from another thread

A refresh only works in the event loop. Beginning, keeping, finishing, and cancelling it, and `ir.async_keep_issue`, raise an error when they are called from another thread, like the other `async_` functions of the issue registry. `ir.delete_issue`, the thread safe version of `ir.async_delete_issue`, has no `defer_to_refresh`. When the check runs in a worker thread, like a database query, work out the issues in the thread, and apply them all at once in the event loop:

```python
from homeassistant.core import callback
from homeassistant.util.async_ import run_callback_threadsafe


def update_issues(hass: HomeAssistant) -> None:
    """Check for problems, runs in a worker thread."""
    problems = find_problems()

    @callback
    def apply_issues() -> None:
        """Create the issues and delete the stale ones."""
        with ir.async_refresh_issues(
            hass, DOMAIN, issue_id_pattern="units_changed_"
        ):
            for issue_id, placeholders in problems.items():
                ir.async_create_issue(
                    hass,
                    DOMAIN,
                    issue_id,
                    is_fixable=False,
                    severity=ir.IssueSeverity.WARNING,
                    translation_key="units_changed",
                    translation_placeholders=placeholders,
                )

    run_callback_threadsafe(hass.loop, apply_issues).result()
```

Doing it all in one callback is simpler than calling `ir.create_issue` from the thread for every issue, with the refresh begun and finished in separate calls to the event loop. It is also safer: an issue only counts for a refresh when it is created after the refresh began, and nothing else runs in the event loop while the callback runs.

## Persistence

An issue stays until the integration that created it deletes it, the user fixes it, or the [config entry it belongs to](#issues-that-belong-to-a-config-entry) is removed. What happens after a restart depends on `is_persistent`:

- **Not persistent** (the default): the issue is not shown after a restart, until your integration creates it again. Use this for problems you can check for, like an old firmware. Your integration checks again on the next start anyway.
- **Persistent**: the issue is shown again after a restart. Use this for problems you can only see when they happen, like a failed update.

Home Assistant remembers every issue across a restart, persistent or not, together with whether the user ignored it. When your integration creates an issue that is not persistent again after a restart, it is still ignored. An issue that is never created again stays in the issue registry, out of sight, until it is deleted. A [refresh](#refresh-a-set-of-issues) cleans those up too.

Users can also ignore an issue. It stays ignored, also across restarts, until it is deleted and created again. That is why you should only delete an issue when the problem is gone.

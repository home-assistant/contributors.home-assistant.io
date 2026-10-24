---
title: Repair issues can belong to a config entry, and be refreshed
description: Link a repair issue to its config entry, and Home Assistant deletes it when the entry is removed. Refresh a set of issues, and only the stale ones are deleted.
date: 2026-10-23
authors:
  - Erik Montnémery
areas:
  - core
---

Two additions to the issue registry make it easier to keep repair issues correct, without annoying users. Both land in Home Assistant Core 2026.11, and are documented in [repairs](/core/integrations/repairs/).

## Issues that belong to a config entry

You can now link a repair issue to the config entry it belongs to, by passing the new `config_entry_id` argument to `async_create_issue` or `create_issue`. Home Assistant deletes the issue when the config entry is removed, just like it does with the devices and entities of the entry.

```python
from homeassistant.helpers import issue_registry as ir

ir.async_create_issue(
    hass,
    DOMAIN,
    f"outdated_firmware_{entry.entry_id}",
    config_entry_id=entry.entry_id,
    is_fixable=False,
    severity=ir.IssueSeverity.WARNING,
    translation_key="outdated_firmware",
)
```

Set `config_entry_id` on issues that are about a single config entry. If your integration has code that deletes those issues when the entry is removed, you can drop it once the issues are created with `config_entry_id`. An issue created before that belongs to no entry until it is created again. Most issues are created again on the next start, but a [persistent](/core/integrations/repairs/#persistence) issue that is never created again may still need to be deleted in `async_remove_entry` for a while.

A few things to keep in mind:

- Issues are still identified by their domain and `issue_id`, so the `issue_id` must stay unique within your domain. When several config entries can raise the same kind of issue, put the entry ID in the `issue_id`.
- The config entry must exist. Passing an unknown ID raises `HomeAssistantError`.
- Creating an issue that already exists replaces its `config_entry_id`, also when you leave `config_entry_id` out.
- Issues that belong to a config entry that no longer exists are deleted when Home Assistant starts.
- While the config entry is disabled, its issues are hidden from **Repairs** and from the `issues()` template function.

This is implemented in core [PR #186197](https://github.com/home-assistant/core/pull/186197) and [PR #186369](https://github.com/home-assistant/core/pull/186369). For the details, see [issues that belong to a config entry](/core/integrations/repairs/#issues-that-belong-to-a-config-entry).

## Refresh a set of issues

A common pattern is to delete all issues of a kind, and then create the ones that are still valid. It is simple, but every issue that is still valid is deleted and created again: users see it disappear and come back, and an issue they ignored shows up again. The same happens to issues that an integration deletes when its config entry unloads, because a reload unloads the entry too. Set their `config_entry_id` instead.

The new `ir.async_begin_issues_refresh` deletes only the stale issues:

```python
with ir.async_begin_issues_refresh(
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

When the issue refresh finishes, it deletes the issues of its set that were not created or kept since it began. Issues that were created again are left alone, so they stay ignored. Any call to `ir.async_create_issue` counts, so helpers and callbacks can create the issues while the refresh runs. Put the refresh around the code that checks the issues, and don't wrap `async_forward_entry_setups`: it does not raise when a platform fails or is retried later, so the refresh would delete issues that were never checked. The set also includes issues from before a restart, so a refresh cleans up after devices that are gone.

The set is selected with one of:

- `issue_id_pattern`, a regular expression matched from the start of the issue ID, like `firmware_too_old_` or `(firmware_too_old|battery_low)_`. A plain prefix is a valid pattern.
- `issue_ids`, a list of issue IDs.
- Neither, to select every issue of the domain.

`config_entry_id` narrows the set down to the issues that belong to that config entry.

Also new:

- `ir.async_keep_issue(hass, domain, issue_id)` and `IssuesRefresh.async_keep` keep issues that you could not check, like those of a device that did not answer.
- `ir.async_delete_issue` takes a `defer_to_refresh` argument. An issue in the set of an active refresh is then left for that refresh to delete, so it survives if it is created or kept again while the refresh runs. This is meant for entities that are removed during a reload, which may create the issue again.

`ir.async_begin_issues_refresh` returns an `IssuesRefresh`. Used in a `with` block, it finishes the refresh when the block completes, and cancels it when an exception is raised. A cancelled refresh only applies deferred deletes. You can also call `IssuesRefresh.async_finish()` and `IssuesRefresh.async_cancel()` yourself.

The refresh API only works in the event loop. It is implemented in core [PR #187990](https://github.com/home-assistant/core/pull/187990). For the details, including overlapping refreshes and checking for issues in a worker thread, see [refresh a set of issues](/core/integrations/repairs/#refresh-a-set-of-issues).

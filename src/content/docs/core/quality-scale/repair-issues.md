---
title: Raise repair issues when the user needs to act
description: "Gold rule repair-issues: the integration raises repair issues for problems users can fix."
sidebarLabel: repair-issues
sidebarGroup: Gold
order: 20
---

This is a Gold rule. In `quality_scale.yaml`, it is called `repair-issues`.

When something is wrong that the user can fix, the integration raises a [repair issue](/glossary/repair/). It shows up under **Settings** > **System** > **Repairs**, with an explanation of the problem and what to do about it. When the integration can fix the problem itself after the user confirms, it adds a repair flow that guides the user through it.

Repair issues must be actionable. Do not raise one just to say that something is wrong, when the user cannot do anything about it.

## Why it matters

Logs are where problems go to be ignored. A repair issue is where Home Assistant tells the user, in plain language and in their own language, that something needs their attention, and what to do. It turns "my integration stopped working" into "update the firmware of your device to version 2.0".

An issue the user cannot act on is noise. It teaches users to ignore the repairs, so they miss the ones that matter.

## Example

On setup, the integration checks the version of a local service. When it is too old, it raises a repair issue, and stops:

```python
async def async_setup_entry(
    hass: HomeAssistant, entry: MyConfigEntry
) -> None:
    """Set up My integration from a config entry."""
    client = MyClient(entry.data[CONF_HOST])
    version = await client.get_version()
    issue_id = f"outdated_version_{entry.entry_id}"

    if version < MINIMUM_VERSION:
        ir.async_create_issue(
            hass,
            DOMAIN,
            issue_id,
            config_entry_id=entry.entry_id,
            is_fixable=False,
            severity=ir.IssueSeverity.ERROR,
            translation_key="outdated_version",
            translation_placeholders={"minimum": str(MINIMUM_VERSION)},
        )
        raise ConfigEntryError(
            translation_domain=DOMAIN,
            translation_key="outdated_version",
        )

    ir.async_delete_issue(hass, DOMAIN, issue_id)
    ...
```

`ir` is `homeassistant.helpers.issue_registry`. The text of the issue lives in the `issues` section of `strings.json`, next to the message of the exception:

```json
{
  "exceptions": {
    "outdated_version": {
      "message": "My service is out of date."
    }
  },
  "issues": {
    "outdated_version": {
      "title": "My service is out of date",
      "description": "Update My service to version {minimum} or newer."
    }
  }
}
```

Delete the issue once the problem is solved, like the example does on a successful setup. Do not delete it when the entry unloads: that throws away the choice of a user who ignored the issue, every time the entry reloads.

The issue is about one config entry, so its `issue_id` contains the entry ID, or the entries of an integration that is set up more than once overwrite each other's issue. `config_entry_id` links the issue to the entry, so Home Assistant hides it while the entry is disabled and deletes it when the entry is removed: see [issues that belong to a config entry](/core/integrations/repairs/#issues-that-belong-to-a-config-entry).

## How it is checked

- The tests fail when an issue is raised whose translation is missing in `strings.json`.
- Whether the integration raises issues where users need to act, and only there, is checked in review.

## Exceptions

If the integration has no situations where a repair issue is needed, this rule does not apply.

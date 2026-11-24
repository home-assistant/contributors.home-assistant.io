---
title: Reviewing pull requests
description: A practical guide to reviewing pull requests on Home Assistant Core. What to check first, what to look for per type of change, and how to give feedback.
sidebarGroup: Pull requests
order: 5
---

Anyone can review a pull request, and every review helps. You do not need to be a maintainer: testing a change with your own device, spotting a missing test, or asking a good question all move a pull request forward. Reviewing is also the fastest way to learn how core works, and the pull request template asks every contributor to review two others.

This guide is based on what reviewers in core actually comment on most. Use it as a checklist, not as a script.

## Where to find pull requests

- [Pull requests without a review](https://github.com/home-assistant/core/pulls?q=is%3Aopen+is%3Apr+-author%3A%40me+-draft%3Atrue+-label%3Awaiting-for-upstream+sort%3Acreated-desc+review%3Anone+-status%3Afailure), with passing checks.
- The `small-pr` label, for quick ones.
- Pull requests for integrations you use, so you can test them for real.

## 1. Gate checks

Check these before you read any code. If one fails, comment and stop: reviewing further wastes your time.

- **The CLA is signed.** The pull request has the `cla-signed` label, not `cla-needed`.
- **CI passes.** If it fails because of the change, ask the author to fix it, and convert the pull request to a draft.
- **It does one thing.** One bug fix, one feature, one integration, or one refactor. If it mixes things, ask to split it.
- **One type of change is checked**, and it matches what the code does.
- **It does not depend on another open pull request.**
- **The description explains why.** A bug fix links its issue. A new integration explains the product or service.
- **The template is filled in**, without empty backward-incompatible change sections or a bare `fixes #`.

### Signals that a pull request may not finish

- A large new integration from someone without merged pull requests is the most likely to be abandoned. Wait until CI passes and the first bot feedback is handled before you invest a deep review.
- Signs of unreviewed AI output: fixes for problems that do not exist, defensive code for conditions that cannot happen, test fixtures changed without a change in behavior, or a polished description on top of code that shows a basic misunderstanding. The [AI policy](/core/development/submitting/#using-ai) applies.

## 2. By type of change

### New integrations

The Bronze tier of the [integration quality scale](/core/quality-scale/) is the baseline.

- **Scope**: one platform in `PLATFORMS`. No diagnostics, reconfigure flow, or options flow (unless really needed) in the first pull request.
- **Manifest**: `iot_class` matches how the integration really communicates.
- **Library**: open source, with a license on PyPI that matches its LICENSE file, and compatible with Apache 2.0. MIT, BSD, Apache 2.0, LGPL, MPL 2.0, ISC, and the Unlicense are fine. GPL and AGPL are not, and neither is a dependency of the library under those licenses. Be careful with a library that was inactive for years and recently changed maintainers.
- **`quality_scale.yaml`**: every Bronze rule is `done`, or `exempt` with a valid reason. Spot check that `done` is true.
- **Config flow**: tests the connection before it creates the entry, shows a clear error when that fails, and sets a unique ID so the same device cannot be added twice.
- **Discovery**: Zeroconf, DHCP, and SSDP patterns only match the intended devices. A pattern that is too broad claims devices it should not. Every discovery method in `manifest.json` has its `async_step_*` in the config flow. A step started by the user should win over a discovery flow for the same device: `async_set_unique_id_or_abort` does this by itself, or pass `raise_on_progress=False` to `async_set_unique_id` there. An integration with Zeroconf can add DHCP as a fallback, for networks where mDNS does not work well. For devices that change their IP address or host name, `registered_devices` in the DHCP matchers lets devices that are already set up be discovered again.
- **Strings**: everything the user sees is in `strings.json`, in sentence case, using the common strings where they fit. Strings render as Markdown, so code-like values, like entity IDs, action names, and file names, go in backticks. Brand and protocol names do not, and keep their official spelling, like Z-Wave.

### New features

- One coherent addition that follows the existing style of the integration, and keeps its quality scale tier.
- Backward-incompatible changes are described for users. Whether something breaks for users is a human judgment, and one AI reviewers often get wrong.
- If the data stored in a config entry changes, the config flow `VERSION` is bumped, `async_migrate_entry` migrates old entries, and tests cover the migration. A bumped version without migration code is just as wrong.
- `async_unload_entry` cleans up everything the setup created.
- Error handling does not read `entry.runtime_data` when setup failed: it may not be set yet.
- New entities have complete device info: manufacturer, model, serial number, and firmware version, where the device provides them.

### Bug fixes

- There is an issue that confirms the bug.
- The fix is minimal and fixes the cause, not the symptom. Wrapping everything in `try` and `except` is not a fix.
- Preferably, there is a test that fails without the fix.
- No unrelated changes, like snapshot updates or refactored tests.

### Dependency updates

These rarely get many comments, but they carry the biggest security risk.

- Only the version in `manifest.json`, the regenerated requirement files, and the code changes the new version needs. Check that `quality_scale` and `loggers` did not disappear from the manifest.
- The description links to the changelog or a diff. Read the upstream diff: watch for new network calls, `subprocess` or `os.system`, new file access, and access to environment variables.
- New transitive dependencies are called out. They are the most common way into a supply chain attack.
- The license did not change, the PyPI maintainer did not change, and the source repository did not move or get archived.

### Code quality

- The code is better, not just different, and the behavior does not change.
- Test changes match the code changes, and go no further.

## 3. Tests

- Tests live in `tests/components/<domain>/`, use type hints, and go through the public interfaces of Home Assistant. See [writing tests](/core/development/tests/).
- They mock the library, not Home Assistant, with shared fixtures in `conftest.py`.
- Platforms use `snapshot_platform`. Time uses the `freezer` fixture. Nothing patches `sys.modules`.
- Config flow tests cover every step and every error, and continue after an error until the entry is created. Read them early: they often reveal problems in the rest of the code.
- Errors are tested: the device offline, bad responses, expired credentials.

## 4. Entities

Entity questions take most of the attention of reviewers.

**Entity category.** Ask what the user does with the entity:

- Something for the dashboard, the main function of the device: no category.
- A setting that changes how the device behaves, like a mode or a threshold: `EntityCategory.CONFIG`.
- Information for debugging, like firmware version, signal strength, or an IP address, and buttons with the `identify` device class: `EntityCategory.DIAGNOSTIC`. If it is only useful for debugging, it is also disabled by default with `entity_registry_enabled_default=False`.

Don't over classify. Entities with a category are hidden from default dashboards and from voice assistants.

**Unknown versus unavailable.** These are different things to the user:

- `native_value` returns `None`: the device is reachable, but the value is unknown right now.
- `available` is `False`: the device or service cannot be reached.

Watch for `bool(value)` or `int(value)` on a value that can be `None`. `bool(None)` turns a missing value into "off", and `bool("0")` is `True`. Convert explicitly, like `value == "1"`.

**More to check:**

- The unique ID is stable: a MAC address normalized with `format_mac()`, a serial number, or an ID from the device. Never an IP address or a host name.
- New entities use an entity description.
- New data is a separate entity, not an extra state attribute, unless it only makes sense together with the main entity.
- The device class and state class are set where one fits, and left out where none does.
- Coordinator based platforms set `PARALLEL_UPDATES = 0`.
- After a command, the entity either waits for the device to confirm the new state or updates it optimistically, and the choice fits the device. See [after a command](/core/entities/state-updates/#after-a-command).

## 5. Code

- **Coordinators**: polling goes through a `DataUpdateCoordinator`, typed like `DataUpdateCoordinator[ExampleData]`, at a reasonable interval. One time work, like logging in, is in `_async_setup`. `_async_update_data` only fetches data.
- **Authentication errors** raise `ConfigEntryAuthFailed`, which starts reauthentication, not `UpdateFailed`, which just retries forever. Reauthentication only works if the config flow has `async_step_reauth`.
- **Actions** raise `HomeAssistantError` when they fail, so the user sees the error. They do not swallow exceptions, and do not log the error a second time.
- **Exceptions** are specific, and `try` blocks are small. No `except Exception:`.
- **`assert`** is only used in tests, and inside `TYPE_CHECKING` blocks.
- **Cleanup**: listeners, timers, and connections are closed on unload, and connections when Home Assistant stops.
- **Style**: constants in `const.py`, early returns, direct dictionary access when the key is guaranteed, no checks that the action schema already does, no commented out code. See [code style](/core/development/style/).

## 6. Git hygiene

- Commits that were already pushed are not amended, squashed, or rebased once the pull request is open. Merges from `dev` are fine. See [keeping your branch up to date](/core/development/catching-up/).
- If the pull request suddenly contains unrelated commits from `dev`, the history is broken. Ask the author for a clean branch and a fresh pull request.

## A good order

1. Gate checks. Stop if the CLA is missing, CI fails, or the signals are bad.
2. Scope: does it do one thing?
3. Manifest and quality scale.
4. Config flow tests.
5. Entities.
6. The other tests.
7. The code.
8. `strings.json`.
9. Approve, request changes, or comment.

## Giving feedback

Be specific: say what needs to change, and why. Link to the documentation when you can. If a pull request needs a major rework, say that clearly, instead of leaving fifty comments that together mean "start over".

Be kind. The person on the other side is often a volunteer, maybe on their first pull request. Explain, ask questions, and say thank you.

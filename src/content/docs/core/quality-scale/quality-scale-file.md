---
title: The quality scale file
description: The format of quality_scale.yaml, and the hassfest, pylint, and review checks that keep an integration honest about its rules.
sidebarLabel: Quality scale file
order: -2
---

Every integration with a tier keeps a `quality_scale.yaml` file next to its `manifest.json`. The file lists every rule of the scale, with its status. It is the progress report of the integration: what is done, what is still to do, and which rules do not apply and why.

## The format

The file has one key, `rules`, with every rule of the scale under it. A rule is either a plain status, or a mapping with a `status` and a `comment`:

```yaml
rules:
  # Bronze
  action-setup:
    status: exempt
    comment: This integration does not provide actions.
  appropriate-polling: done
  brands: done
  config-flow: done
  test-before-setup:
    status: todo
    comment: Setup does not catch authentication errors yet.
```

There are three statuses:

- `done`: the integration follows the rule.
- `todo`: it does not, yet. A comment is optional, and a good place to explain what is missing.
- `exempt`: the rule does not apply. A `comment` is required, and it must say why.

Use the rule names exactly as they appear on the rule pages, with dashes, like `config-flow-test-coverage`. The file must list _every_ rule of the scale, also the rules of tiers above the current tier. Hassfest rejects a file with a missing or unknown rule.

The easiest way to start is the template that the scaffold script creates for a new integration: every rule, set to `todo`, grouped by tier. You can find it in core at `script/scaffold/templates/integration/integration/quality_scale.yaml`, or run `python3 -m script.scaffold integration` to create a new integration with it.

### Exemptions

An exemption is a claim, like `done`. Each rule page has an "Exceptions" section that lists when a rule does not apply. Stick to those. If you think a rule does not apply to your integration for another reason, explain it in the comment and in your pull request, and expect the reviewer to ask about it.

Good comments are specific: "The device has no authentication" is better than "Not applicable".

## What hassfest checks

[Hassfest](/core/development/checks/) runs in CI on every pull request, and you can run it locally with `python3 -m script.hassfest`. For the quality scale, it checks:

- That an integration in core has a `quality_scale.yaml`. New integrations must reach Bronze, so hassfest fails when the file is missing. Older integrations without one are listed in `script/hassfest/quality_scale.py`, and that list only gets shorter.
- That the file matches the format above, with every rule and a valid status.
- That every rule of the tier in `manifest.json`, and of the tiers below it, is `done` or `exempt`. When one is not, hassfest lists the missing rules.
- That Silver and higher integrations have at least one integration owner in `manifest.json`.
- That virtual integrations, and internal integrations listed as having no scale, do not have the file.

On top of that, hassfest verifies some rules in the code when they are marked `done`:

| Rule | What hassfest looks for |
| ---- | ----------------------- |
| [config-flow](/core/quality-scale/config-flow/) | `config_flow: true` in the manifest, and a `config_flow.py` |
| [discovery](/core/quality-scale/discovery/) | A discovery key in the manifest, or a discovery step in the config flow |
| [reconfiguration-flow](/core/quality-scale/reconfiguration-flow/) | An `async_step_reconfigure` in the config flow |
| [runtime-data](/core/quality-scale/runtime-data/) | `async_setup_entry` assigns `entry.runtime_data`. When `strict-typing` is also `done`, the entry functions also use a typed config entry, like `MyConfigEntry` |
| [strict-typing](/core/quality-scale/strict-typing/) | The integration is in `.strict-typing`, and its requirements are typed |
| [test-before-setup](/core/quality-scale/test-before-setup/) | A module of the integration raises `ConfigEntryNotReady`, `ConfigEntryAuthFailed`, or `ConfigEntryError`, or `async_setup_entry` awaits `async_config_entry_first_refresh` or `async_ensure_token_valid`, which raise them for you |
| [unique-config-entry](/core/quality-scale/unique-config-entry/) | `single_config_entry: true` in the manifest, or a config flow that calls `_async_abort_entries_match`, `async_set_unique_id_or_abort`, or both `async_set_unique_id` and `_abort_if_unique_id_configured` |

When such a check fails, the error names the rule in brackets, like `[runtime-data]`, and links to its documentation.

## What pylint checks

Core has its own pylint plugin, in `pylint/plugins/` of the [core repository](https://github.com/home-assistant/core). Some of its checks only run for integrations that mark a rule as `done`. This keeps a claim honest after it was made, also when other people change the code later:

| Rule | Check |
| ---- | ----- |
| [config-entry-unloading](/core/quality-scale/config-entry-unloading/) | `home-assistant-missing-config-entry-unloading` |
| [diagnostics](/core/quality-scale/diagnostics/) | `home-assistant-missing-diagnostics` |
| [entity-unique-id](/core/quality-scale/entity-unique-id/) | `home-assistant-missing-entity-unique-id`, `home-assistant-entity-unique-id-static` |
| [exception-translations](/core/quality-scale/exception-translations/) | `home-assistant-exception-not-translated` |
| [has-entity-name](/core/quality-scale/has-entity-name/) | `home-assistant-missing-has-entity-name` |
| [parallel-updates](/core/quality-scale/parallel-updates/) | `home-assistant-missing-parallel-updates` |
| [reauthentication-flow](/core/quality-scale/reauthentication-flow/) | `home-assistant-missing-reauthentication-flow` |
| [test-before-configure](/core/quality-scale/test-before-configure/) | `home-assistant-missing-test-before-configure` |

Other checks of the plugin run for every integration, and many of them enforce a rule too, like `home-assistant-use-runtime-data` or `home-assistant-service-registered-in-setup-entry`. The rule pages list them under "How it is checked". The [pylint plugin README](https://github.com/home-assistant/core/blob/dev/pylint/plugins/README.md) describes every check.

## What review checks

Most rules cannot be checked by a tool. Is the polling interval appropriate? Does the documentation explain the use cases? A person decides that.

- An automated reviewer runs on pull requests that touch an integration with a `quality_scale.yaml`. It checks the change against the rules the integration marks as `done` or `exempt`, and leaves a review comment on the line that breaks a rule. Treat it like any other review comment: it can be wrong, but it usually has a point.
- Reviewers check the rules that tools cannot. When you ask for a new tier, they go through every rule. See [Raise the tier of an integration](/core/quality-scale/raise-tier/).

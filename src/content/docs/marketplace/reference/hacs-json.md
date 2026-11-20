---
title: hacs.json
description: Every key of the hacs.json file in the root of your repository, what HACS documents for it, and what the Marketplace does with it.
order: 1
---

`hacs.json` describes your repository to the Marketplace and to HACS. It sits in the root of your repository, and every repository needs one: the Marketplace reads it for every version it installs, and can not install or update a repository without it.

```json title="hacs.json"
{
  "name": "My awesome card",
  "filename": "my-awesome-card.js",
  "homeassistant": "2026.11.0"
}
```

## Keys

| Key | Type | What it does |
| --- | --- | --- |
| `name` | string | The name users see. Required by HACS and by the catalog. Without it, the Marketplace shows the `name` from the manifest of an integration, or a name made from your repository name. |
| `content_in_root` | boolean | Your content is in the root of the repository, instead of in `custom_components/<domain>/` or `themes/`. For a dashboard plugin, the file is then only looked for in the root, not in a release or in `dist`. |
| `filename` | string | The name of the file to install, for a dashboard plugin or a template. With `zip_release`, the name of the ZIP asset. Required for templates. |
| `zip_release` | boolean | Install from a ZIP file attached to each release, named by `filename`. HACS supports it for integrations only. The Marketplace also supports it for dashboard plugins, starting with Home Assistant 2026.12, and refuses it for templates. |
| `persistent_directory` | string | A folder inside an integration that is kept across updates, as a path relative to the integration folder. Integrations only. |
| `homeassistant` | string | The minimum Home Assistant version for this release, like `"2026.11.0"`. Add `b0`, like `"2026.11.0b0"`, to allow the betas of that release. Only checked for repositories with releases. |
| `hide_default_branch` | boolean | HACS does not offer the default branch as a version to install. |
| `hacs` | string | The minimum HACS version. The Marketplace reads it, but does not compare it. |
| `country` | string or list | Two-letter country codes ([ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)), for a repository that only works in some countries. The catalog asks for it in that case. The Marketplace does not use it. |

The Marketplace leaves out a key with a value of the wrong type, and logs a warning. Other keys are ignored.

## Versions

Version numbers in `homeassistant` and `hacs` are compared with [AwesomeVersion](https://github.com/ludeeus/awesomeversion), the same library Home Assistant uses. The [AwesomeVersion demo](https://awesomeversion.ludeeus.dev/) shows how two versions compare.

## Sources

- What the Marketplace reads: `REPOSITORY_MANIFEST_VALUES` in [`utils/validate.py`](https://github.com/home-assistant/core/blob/dev/homeassistant/components/marketplace/utils/validate.py) of the `marketplace` integration in core.
- What HACS documents: [the hacs.json section](https://hacs.xyz/docs/publish/start#hacsjson) of the HACS publishing documentation.

---
title: Repository structure
description: Where the files of each type go in your repository, what the Marketplace installs from it, and where that ends up in the user's configuration.
order: 2
---

Every type needs a public GitHub repository with a `hacs.json` and a README in the root. Beyond that, each type has its own layout. A repository holds one item of one type.

## Every repository

| What | Why |
| --- | --- |
| Public repository on GitHub | The Marketplace and HACS only read public GitHub repositories. |
| `hacs.json` in the root | The Marketplace can not install or update a repository without it. See [hacs.json](/marketplace/reference/hacs-json/). |
| `README.md` | What users read before they install. The Marketplace shows it on the page of your repository, without the parts you [leave out](#leave-part-of-your-readme-out-of-the-marketplace). |
| A description on GitHub | Shown in the list of the Marketplace. Required for the catalog. |
| Topics on GitHub | Help users find your repository. Required for the catalog. |
| Issues turned on | Where users report problems. Required for the catalog. |
| GitHub releases | Recommended for every type, required for templates and for the catalog. See [releases and updates](/marketplace/guides/releases/). |

## Integrations

```text
custom_components/awesome/__init__.py
custom_components/awesome/manifest.json
custom_components/awesome/sensor.py
custom_components/awesome/brand/icon.png
hacs.json
README.md
```

- One integration per repository, in `custom_components/<domain>/`. The Marketplace takes the first folder in `custom_components/`.
- Everything the integration needs is inside that folder.
- `manifest.json` has a `domain` with only lowercase letters, numbers, underscores, and hyphens, and a `version`. HACS also requires `documentation`, `issue_tracker`, `codeowners`, and `name`.
- With `content_in_root`, the files of the integration are in the root of the repository instead.
- Installed to `custom_components/<domain>/`.

See [custom integrations](/marketplace/guides/integrations/).

## Dashboard

```text
dist/awesome-card.js
hacs.json
README.md
```

- A JavaScript file named after the repository: `<name>.js`, `<name>.umd.js`, or `<name>-bundle.js`. For `<name>.js`, the name is also tried without `lovelace-` in it. Any other name goes in `filename` in `hacs.json`.
- The file is attached to your latest release, or is in the root, or in `dist`. Or it is in the root of a [ZIP file](/marketplace/guides/releases/#ship-a-zip-file) attached to each release, which needs Home Assistant 2026.12 or later.
- Files the module needs, like images, go in `dist` with it, or are attached to the release.
- Installed to `www/community/<repository name>/`, and added as a dashboard resource.

See [dashboard cards and plugins](/marketplace/guides/dashboard/).

## Themes

```text
themes/awesome.yaml
hacs.json
README.md
```

- A YAML file in `themes/`. HACS manages one theme file per repository.
- With `content_in_root`, the file is in the root of the repository instead.
- Valid YAML, without tags like `!include` or `!secret`.
- Installed to `themes/<name of the theme file>/`.

See [themes](/marketplace/guides/themes/).

## Templates

```text
awesome.jinja
hacs.json
README.md
```

- One `.jinja` file in the root, named in `filename` in `hacs.json`. Not in a subfolder.
- UTF-8, and smaller than 5 MiB.
- No `zip_release`.
- Installed to `custom_templates/`.

See [template macros](/marketplace/guides/templates/).

## Types the Marketplace does not install

HACS also handles AppDaemon apps (`apps/`) and Python scripts (`python_scripts/`), and the catalog has lists for them. The Marketplace does not install either. Starting with 2026.11, Home Assistant also blocks the HACS custom integration, because the Marketplace replaces it. So on 2026.11 and later, neither installs them.

The Marketplace also refuses repositories with [apps](/glossary/app/) for Home Assistant OS. Those are added as an app repository under **Settings** > **Apps** instead: see [create and share a repository](/apps/guides/repository/).

## Leave part of your README out of the Marketplace

Your README is read in two places: on GitHub, where people find your repository, and in the Marketplace, on the page of your repository. Installation instructions, a [My link](/glossary/my-link/) badge, or an install badge help on GitHub, but the page in the Marketplace already has an install button, so there they are in the way. Put the parts that are only for GitHub between two HTML comments, and the Marketplace leaves them out:

```markdown title="README.md"
# Awesome card

<!-- ha-marketplace:exclude-start -->
## Installation

Add this repository in the Marketplace, or install it through HACS.
<!-- ha-marketplace:exclude-end -->

## Configuration
```

GitHub does not show HTML comments, so there the README reads as before.

- A section runs from the start marker to the next end marker. Without an end marker, it runs to the end of the README.
- The spaces inside the markers are optional.
- Markers inside a code block or inline code are text, not markers, so a README can show them as an example.

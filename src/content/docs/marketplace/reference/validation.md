---
title: Validation checks
description: The HACS action that checks your repository on every push, and the checks the Marketplace runs before it calls an install done.
order: 3
---

Two kinds of checks look at your work. The HACS action runs in your own repository, and is what the catalog review runs too. The Marketplace runs its own checks when a user installs, and refuses an install that fails one. Both are below.

## The HACS action

[hacs/action](https://github.com/hacs/action) runs the same validation as HACS, as a GitHub Action. Add it to your repository, in `.github/workflows/validate.yaml`:

```yaml title=".github/workflows/validate.yaml"
name: Validate

on:
  push:
  pull_request:
  schedule:
    - cron: "0 0 * * *"
  workflow_dispatch:

permissions: {}

jobs:
  validate-hacs:
    runs-on: "ubuntu-latest"
    steps:
      - name: HACS validation
        uses: "hacs/action@main"
        with:
          category: "integration"
```

Set `category` to the type of your repository: `integration`, `plugin` for a dashboard plugin, `theme`, or `template`. The action also accepts `appdaemon` and `python_script`, types the Marketplace does not install.

This runs on every push and pull request, every night, and when you start it by hand from the **Actions** tab. To pin a version instead of `main`, use a tag after the `@`, and let Dependabot keep it up to date.

### Inputs

| Input | |
| --- | --- |
| `category` | Required. The type of the repository. |
| `ignore` | Checks to skip, separated by spaces. Only for your own runs: the catalog does not accept ignored checks. |
| `repository` | The full name of the repository to check, if not this one. |
| `comment` | Post the result as a comment on the pull request. `true` by default. |
| `github_token` | The token to use. The token of the workflow by default. |

### Checks you can skip

| Check | Checks that |
| --- | --- |
| `archived` | The repository is not archived. |
| `brands` | An integration has brand images: a `brand` folder with an `icon.png`, or images in the [brands repository](https://github.com/home-assistant/brands). |
| `description` | The repository has a description. |
| `hacsjson` | `hacs.json` exists. |
| `images` | The README has images. |
| `information` | The repository has an information file, like a README. |
| `integration_categories` | The `categories` in the manifest of an integration are valid: known [integration categories](/core/integrations/categories/), one to three, without duplicates. A manifest without `categories` only gets a warning. |
| `issues` | Issues are turned on. |
| `topics` | The repository has topics. |

The [catalog review](/marketplace/guides/catalog/#what-the-review-checks) runs more checks than these.

## hassfest

For integrations, also run [hassfest](https://github.com/home-assistant/actions#hassfest), the same validation that integrations in core get. The catalog requires it.

```yaml title=".github/workflows/hassfest.yaml"
name: Validate with hassfest

on:
  push:
  pull_request:
  schedule:
    - cron: "0 0 * * *"

jobs:
  validate:
    runs-on: "ubuntu-latest"
    steps:
      - uses: "actions/checkout@v4"
      - uses: "home-assistant/actions/hassfest@master"
```

## What the Marketplace checks

The Marketplace checks before an install, and again after it wrote the files. When a check after writing fails, the files are put back the way they were before the install.

| Check | Types | What fails |
| --- | --- | --- |
| `hacs.json` in the root | All | A repository without it can not be installed or updated. |
| Not archived, not removed | All | An archived repository can not be installed, and neither can most repositories the catalog removed. |
| Files in the right place | All | No files where the [repository structure](/marketplace/reference/repository-structure/) says they go. |
| Minimum Home Assistant version | All with releases | The release needs a newer Home Assistant than the user has. The user is offered older versions instead. |
| Domain | Integration | A `domain` in `manifest.json` with other characters than lowercase letters, numbers, underscores, and hyphens. |
| Owner of the domain | Integration | Another installed repository has the same domain. |
| Replaces a built-in integration | Integration | The domain is one of core, and the user did not confirm. |
| Loadable manifest | Integration | After writing: the `manifest.json` has another domain, or no `version` the loader accepts. |
| Owner of the folder | Dashboard, theme | Another installed repository uses the same folder. |
| Module present | Dashboard | After writing: the JavaScript file is missing. |
| Theme YAML | Theme | After writing: a YAML file with tags, or one that does not pass the validation of themes. |
| Template file | Template | `filename` is not a `.jinja` file in the root, `zip_release` is set, or another repository has a file with that name. After writing: the file is not UTF-8, or larger than 5 MiB. |
| Download size | All | A download, or a ZIP file unpacked, of more than 100 MiB, or more than 50,000 files. |

These checks live in the `marketplace` integration in core: [`homeassistant/components/marketplace/repositories/`](https://github.com/home-assistant/core/tree/dev/homeassistant/components/marketplace/repositories).

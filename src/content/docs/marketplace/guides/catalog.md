---
title: Get into the catalog
description: Add your repository to the catalog that the Marketplace and HACS show to everyone, what the review checks, and how renames and removals work.
sidebarLabel: Get into the catalog
order: 7
source: https://github.com/hacs/documentation/blob/main/source/docs/publish/include.md
lastVerified: 2026-10-12
---

Any user can add your repository from a link. To have it show up for everyone, without a link, it needs to be in the catalog. The catalog is the [hacs/default](https://github.com/hacs/default) repository, run by the HACS team, and the Marketplace reads the same catalog. You get in with a pull request.

Be ready to wait. The HACS documentation is honest about it: new additions take months to be reviewed. You can see where your pull request is in the [backlog](https://github.com/hacs/default/pulls?q=is%3Apr+is%3Aopen+draft%3Afalse+sort%3Acreated-asc). In the meantime, users can add your repository from a link.

## The link to your repository

The link users add your repository from is a [My link](/glossary/my-link/). It opens your repository in the Marketplace of their own Home Assistant. When the Marketplace does not know your repository yet, and the link names its category, it offers to add it as a custom repository first. The category is `integration`, `plugin`, `template`, or `theme`, the same as the file of its type in the catalog.

The [My link creator](https://my.home-assistant.io/create-link/?redirect=marketplace_repository) makes the link from the owner, the name, and the category of your repository. Put the badge in your README:

```markdown
[![Open your Home Assistant instance and open a repository in the Marketplace.](https://my.home-assistant.io/badges/marketplace_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=me&repository=my-card&category=plugin)
```

The `marketplace_repository` link is new in Home Assistant 2026.11. The older `hacs_repository` link takes the same `owner`, `repository`, and `category`. It opens HACS before 2026.11, and the Marketplace after, so it reaches users on both. HACS documents it on its [My Home Assistant](https://hacs.xyz/docs/use/my/) page.

> [!TIP]
> The badge is for GitHub. On the page of your repository in the Marketplace, users already have an install button. Mark the badge, and any installation steps, to [leave them out of the Marketplace](/marketplace/reference/repository-structure/#leave-part-of-your-readme-out-of-the-marketplace).

## Who can submit

Only the owner of the repository, or a major contributor, can submit it.

Integrations that are only for testing an alpha or beta of a core integration, or that replace a core integration, are not accepted. Users can still add them from a link.

## Before you open the pull request

1. Make sure your repository meets the [requirements of its type](/marketplace/reference/repository-structure/), and has a description, topics, issues turned on, and a README.
2. Add the [HACS action](https://github.com/hacs/action) to your repository, and make it pass without ignoring any check. See [validation checks](/marketplace/reference/validation/).
3. For an integration, add the [hassfest action](https://github.com/home-assistant/actions#hassfest), and make it pass too.
4. After both pass, publish a full GitHub release. A tag alone is not enough.

## Open the pull request

1. Fork [hacs/default](https://github.com/hacs/default), and create a new branch from `master`. Do not work on `master` directly.
2. Add your repository, as `owner/repository`, to the file of its type: `integration`, `plugin`, `theme`, or `template`. Each file is a JSON list. Add yours in alphabetical order, not at the end.
3. Open the pull request from your own account, not from an organization, so the HACS team can edit it.
4. Fill in the pull request template completely: the checklist, a link to your latest release, a link to a passing run of the HACS action without `ignore`, and for an integration, a link to a passing run of hassfest.

A pull request with an incomplete template, or with statements that are not true, is closed without notice. So is one where you request reviews from people. A repository with small problems gets its pull request set to draft: fix them, and mark it ready for review again. Major problems close it.

The files also have an `appdaemon`, `python_script`, and `netdaemon` list. HACS still reads those, but the Marketplace does not install those types.

## What the review checks

When your pull request comes up for review, automated checks run. All of them have to pass, unless the HACS team agreed otherwise before you opened it:

| Check | What it checks |
| --- | --- |
| Brands | Integrations only. A `brand` folder with at least an `icon.png`, or images for the domain in the [brands repository](https://github.com/home-assistant/brands). |
| Manifest | Integrations only. A valid `manifest.json`, with `domain`, `documentation`, `issue_tracker`, `codeowners`, `name`, and `version`. |
| HACS validation | The same validation HACS runs on a repository. |
| HACS manifest | A `hacs.json` with at least a `name`. |
| Archived | The repository is not archived. |
| Releases | At least one release. |
| Owner | You own the repository, or are a major contributor. |
| Images | Dashboard plugins and themes only. Images in the README. |
| Repository | A description, issues turned on, and topics. |
| Lint | The files you changed are valid JSON, and sorted. |

After your pull request is merged, your repository is included in the next scheduled scan.

## Rename or move your repository

When you rename your repository, or transfer it to another account, you do not need to do anything. The HACS team updates the catalog.

## Take it out

When you archive your repository on GitHub, the HACS team takes it out of the catalog. Users who installed it keep it, but get no more updates, and a repair tells them why.

To have it taken out for another reason, open an issue in [hacs/integration](https://github.com/hacs/integration/issues/new?template=removal.yml) with the **Request for repository removal** template. Do that before you delete a repository: if you delete one that is in the catalog, you will not be able to add any repositories to the catalog in the future.

Repositories are also taken out when they are abandoned, break Home Assistant, steal credentials, or are deleted. One that is harmful is marked critical: the Marketplace then uninstalls it from every Home Assistant that has it, right away.

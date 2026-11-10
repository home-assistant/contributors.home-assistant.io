---
title: Releases and updates
description: How users get your new versions through the Marketplace, how to publish pre-releases, and how to keep a release from reaching a Home Assistant that is too old for it.
sidebarLabel: Releases and updates
order: 6
---

Users of the Marketplace get your updates under **Settings** > **Updates**, next to the updates of Home Assistant itself. Each installed repository has an update entity, with your release notes. This page explains where those versions come from, so you control what users get.

This applies to integrations, dashboard plugins, themes, and templates. Blueprints have no releases: see [change a blueprint without breaking it](/marketplace/guides/blueprints/#change-it-without-breaking-it).

## Publish GitHub releases

Your version is the tag of your latest GitHub release. A tag alone is not enough: it has to be a published release.

Without any release, users get the latest commit of your default branch, and the version they see is a commit hash. That works, but users can not tell a fix from a rewrite. HACS requires releases for templates, and for every repository that wants into the catalog.

For an integration, use the same version in `manifest.json` as in the tag. The Marketplace refuses to install an integration without a `version` in its manifest.

## Write release notes

The update entity shows the notes of your releases: the body of the GitHub release. That is where users decide whether to update now or later. Say what changed, and put anything the user has to do first, like a changed option or a removed entity, at the top.

## How a release reaches users

1. You publish a release on GitHub.
2. The catalog picks it up. The HACS data for the catalog is generated every 4 hours.
3. The Marketplace reads the catalog every 6 hours, and the update entity shows the new version.

So a release can take several hours to show up. Users who added your repository from a link get updates through the GitHub API instead, every 48 hours, and only with a GitHub connection.

## Pre-releases

Mark a release as a pre-release on GitHub to test it with users who want to. Users only get it when they turn on the **Pre-release** switch of your repository, and only while it is newer than your latest regular release.

## Require a Home Assistant version

When a release needs a newer Home Assistant, set `homeassistant` in `hacs.json` in that release:

```json title="hacs.json"
{
  "name": "My integration",
  "homeassistant": "2026.11.0"
}
```

The Marketplace does not offer that release to users on an older Home Assistant. When they install, it shows them earlier versions that work. To allow the betas of a release too, add `b0`, like `"2026.11.0b0"`. This only works for repositories with releases.

## Ship a ZIP file

An integration or a dashboard card can ship as a ZIP file attached to each release, instead of the files in the repository. Set `zip_release` to `true`, and `filename` to the name of the asset:

```json title="hacs.json"
{
  "name": "My integration",
  "zip_release": true,
  "filename": "my_integration.zip"
}
```

The Marketplace downloads that asset and extracts it into the folder of the integration or card. Use this when you build or generate files in your release workflow.

For a dashboard card, the JavaScript file has to be in the root of the ZIP file. Name it like the ZIP file, so `my-card.zip` holds `my-card.js`, or after your repository, like a [card without a ZIP file](/marketplace/guides/dashboard/#name-your-file-after-your-repository). Without one, the install fails and the installed version stays.

Dashboard cards from a ZIP file need Home Assistant 2026.12 or later. Earlier versions refuse to install them. Set `"homeassistant": "2026.12.0"` in `hacs.json`, so the Marketplace does not offer the release on an earlier version, and shows users the versions that work instead. See [require a Home Assistant version](#require-a-home-assistant-version).

HACS supports ZIP files for integrations only. The Marketplace refuses them for templates.

## Older versions

Users can install another version than the latest, from the menu of your repository in the Marketplace. They pick from your releases, so keep the old ones.

## Remove a release safely

If you delete a release or its tag, users who installed it keep their files. When the Marketplace can not find a version any more on GitHub, it falls back to the version it would install by default.

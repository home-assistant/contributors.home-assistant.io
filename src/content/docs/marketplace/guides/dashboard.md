---
title: Publish a dashboard card or plugin
description: Package a custom card, card feature, badge, or other JavaScript module so the Marketplace can install it and load it on every dashboard.
sidebarLabel: Dashboard cards and plugins
order: 2
---

Cards, card features, badges, view layouts, and dashboard strategies are JavaScript modules that Home Assistant loads into the frontend. How to build them is in [Custom cards and more](/frontend/custom-ui/), in the Frontend area. This page covers how to package one, so the Marketplace can install it.

The catalog, `hacs.json`, and the HACS action call this type `plugin`. The Marketplace shows it as **Dashboard**. It is the same thing.

## What the Marketplace does with it

When a user installs your repository, the Marketplace:

1. Downloads your JavaScript file, and any other files next to it, to `www/community/<repository name>/` in the configuration folder.
2. Adds the file as a [dashboard resource](/frontend/custom-ui/resources/) of type `module`, at `/local/community/<repository name>/<file name>`, with the version in the URL, like `?v=<id>-1.2.0`. The version changes on every update, so browsers load the new file instead of a cached one.
3. Leaves the rest to the user, who reloads the browser to load your module.

When the user manages resources in YAML, the Marketplace can not add the resource. The install dialog shows the user what to add. When your module is already loaded with `extra_module_url` in the `frontend` configuration, the Marketplace adds no resource, so it is not loaded twice.

On uninstall, the Marketplace removes the files and the resource.

## Name your file after your repository

The Marketplace looks for one file, and finds it by its name. Without a `filename` in `hacs.json`, it tries these names, where `<name>` is the name of your repository:

1. `<name>.js`, with a `lovelace-` prefix removed. The repository `lovelace-awesome-card` gives `awesome-card.js`.
2. `<name>.js`
3. `<name>.umd.js`
4. `<name>-bundle.js`

It looks for them in the assets of your latest GitHub release first. Without a release that has one of them, it looks in the root of your repository, and then in the `dist` folder. With `content_in_root` set to `true` in `hacs.json`, it only looks in the root.

If your card needs other files, like images or translations, put them in `dist` together with the card, or attach them all to the release.

A file with any other name needs `filename` in `hacs.json`:

```json
{
  "name": "Awesome card",
  "filename": "awesome-card-bundle.js"
}
```

The [repository structure](/marketplace/reference/repository-structure/#dashboard) has the examples.

## Build it before you release

Users get exactly the file you publish: the Marketplace does not build anything. Commit the built file to `dist`, or better, build it in a GitHub Action when you publish a release, and attach it to the release as an asset. Then your repository holds only the source, and every release carries its own build.

A single bundled file is the easiest to install. Bundle your dependencies, like Lit, into it: the frontend does not share its own copy, as [which tools to use](/frontend/custom-ui/#which-tools-to-use) explains.

## Two cards can not share a folder

The folder is named after the repository, without its owner. When a user has a card from `someone/awesome-card` installed, the Marketplace refuses to install `someone-else/awesome-card` next to it.

## Show what it looks like

Users pick a card by how it looks. Put screenshots in your README, which the Marketplace shows on the page of your repository. The catalog checks that the README of a dashboard repository has images.

To let people try your card before they install it, put a [live demo](/frontend/custom-ui/demo/) of it on your own site, and link to it from your README.

## Check it in your repository

Run the [HACS action](https://github.com/hacs/action) with `category: "plugin"` on every push and pull request. See [validation checks](/marketplace/reference/validation/).

## Bring it to the frontend

Once your card has matured and has a user base, reach out to the maintainers, for example in the **#frontend** channel on [Discord](https://www.home-assistant.io/join-chat/), to see whether it should ship built in. A new card in the frontend is a design decision as much as code: see [changes that need design input](/frontend/development/review-and-release/#changes-that-need-design-input).

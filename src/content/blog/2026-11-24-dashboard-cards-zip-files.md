---
title: "Dashboard cards can ship as a ZIP file"
description: Starting with Home Assistant 2026.12, the Marketplace installs a dashboard card from one ZIP file. How to ship one, and why to keep a fallback for now.
date: 2026-11-24
authors:
  - Wendelin Peleska
areas:
  - marketplace
  - frontend
---

Bigger cards rarely fit in one JavaScript file anymore. They split their code into chunks that load when they are needed, and bring translations or images along. As release assets, all of these have to be flat files next to each other, and users download every one of them.

Starting with Home Assistant 2026.12, the Marketplace can install your whole card from one ZIP file instead.

## How it works

Attach a ZIP file to your release, named like your JavaScript file, with `.zip` instead of `.js`. For `awesome-card.js`, that is `awesome-card.zip`. Put the JavaScript file in its root, or in a single folder at its root, like `dist`. Nothing changes in `hacs.json`.

```text title="awesome-card.zip"
awesome-card.js
chunks/
  editor-a1b2c3.js
  translations/
    en-d4e5f6.js
```

The Marketplace extracts it into the folder of your card, folders included, and adds the JavaScript file as the dashboard resource, like it always does. [Ship it as a ZIP file](/marketplace/guides/dashboard/#ship-it-as-a-zip-file) has the details.

Already attaching a ZIP file named like your card to your releases? Then your users get it starting with 2026.12, without you changing anything.

## Keep a single-file build for now

Earlier versions of Home Assistant don't know about the ZIP file, and only look for the JavaScript file. So for now, we recommend you attach both to every release:

- `awesome-card.zip`: your card with its chunks, which 2026.12 and later installs.
- `awesome-card.js`: a single-file build, which earlier versions install.

Both install as `awesome-card.js`, so the dashboard resource is the same either way. The single-file build is also the fallback when the Marketplace can't use your ZIP file, for example because it is damaged.

In about six months, when most users are on 2026.12 or later, you can drop the single-file build. Then set `"homeassistant": "2026.12.0"` in `hacs.json`, so earlier versions aren't offered a release they can't install. See [require a Home Assistant version](/marketplace/guides/releases/#require-a-home-assistant-version).

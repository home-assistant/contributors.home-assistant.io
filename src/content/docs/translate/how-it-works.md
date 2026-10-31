---
title: How translation works
description: Where the strings come from, where they get translated, and how they end up in Home Assistant.
order: 2
sidebarLabel: How it works
---

Every piece of text in Home Assistant starts in English, in the source code. From there, it travels through Lokalise to translators, and back into Home Assistant when it is built.

## Where the strings come from

Developers write the English text next to the code that uses it:

- **Frontend** text, like menus and dialogs, lives in the [frontend repository](https://github.com/home-assistant/frontend).
- **Backend** text belongs to integrations. Each integration has a `strings.json` file with its setup steps, entity names, states, and error messages.
- **Companion apps** have their own strings, in the iOS and Android repositories.

When a change with new or updated English text is merged into the frontend or [core repository](https://github.com/home-assistant/core), the new strings are uploaded to Lokalise automatically. The iOS app uploads its strings once a day.

## Where translation happens

Each of those sources has its own Lokalise project. That is why there are [four projects to join](/translate/first-contribution/#1-pick-a-project): frontend, backend, iOS, and Android. Within a project, every language is translated by the community. Anyone who joins can translate strings and improve existing translations. There is no separate approval step: the translation saved in Lokalise is the one that ships.

## How translations get back

For Home Assistant itself, translations are not stored in the source code. They are downloaded from Lokalise when the code is built. Only translations that Lokalise marks as unverified are left out. The frontend and the backend are built separately, so they get their translations at different moments:

- **Backend**: every build of Home Assistant Core, nightly, beta, or release, downloads the latest backend translations. That build contains everything translated up to that moment.
- **Frontend**: the frontend downloads its translations when it is built, every night and for every frontend release. Nightly builds of Home Assistant use the latest nightly frontend. A beta or release of Home Assistant includes a specific frontend release, with the translations from the moment that frontend release was built.

The Android app also downloads translations when it is built. The iOS app is the exception: a daily job pulls the translations from Lokalise and opens a pull request with them in the [iOS repository](https://github.com/home-assistant/iOS).

This also means that a fix is never far away. Correct a translation today, and it is in the next backend build, or the next frontend release.

## What is not translated here

- **Documentation**: the documentation on [home-assistant.io](https://www.home-assistant.io/) is English only.
- **Voice commands**: the sentences Assist understands are maintained on GitHub, not in Lokalise. See [Voice](/translate/voice/).

---
title: Your first translation
description: Join a translation project, find your language, and translate your first strings. It takes about fifteen minutes.
order: 1
sidebarLabel: Your first contribution
---

This guide gets you from zero to your first translated strings. You do it all in your browser.

## 1. Pick a project

Home Assistant's interface text is split over four Lokalise projects. Each link below opens the project and lets you join it:

- [Frontend](https://app.lokalise.com/public/3420425759f6d6d241f598.13594006/): the Home Assistant interface itself. Start here if you are not sure.
- [Backend](https://app.lokalise.com/public/130246255a974bd3b5e8a1.51616605/): text that comes from integrations, like setup steps, entity names, and error messages.
- [iOS](https://app.lokalise.com/public/834452985a05254348aee2.46389241/): the companion app for iPhone, iPad, Mac, and Apple Watch.
- [Android](https://app.lokalise.com/public/145814835dd655bc5ab0d0.36753359/): the companion app for Android phones, tablets, and Wear OS.

## 2. Create an account and join

Lokalise asks you to create a free account. After that, join the project and pick your language. You can join more projects and languages later. New to the editor? Lokalise explains it in [translate and collaborate](https://docs.lokalise.com/en/collections/2909016-translate-and-collaborate).

## 3. Find something to translate

Open your language and filter on untranslated strings. If your language is already complete, that is great news, and there is still plenty to do: read through existing translations and improve the ones that feel off. Fresh eyes catch a lot.

Translate a handful of strings to start. Short ones are a good warm up.

> [!TIP]
> Not sure what a string means? Look at its key. A key like `component::wled::config::step::user::description` tells you it is the description of the first setup step of the WLED integration. Still unsure? Leave a comment on the string instead of guessing.

## 4. Watch out for placeholders

Some strings contain parts between curly brackets, like `{count}`, or between square brackets. Do not translate those names: Home Assistant fills them in while it runs. The exception is a plural or a choice, like `{count, plural, one {# device} other {# devices}}`: keep its keywords, and translate the text inside the inner brackets. [Placeholders and references](/translate/guides/placeholders/) explains how they work.

## 5. See your work in Home Assistant

Translations are pulled from Lokalise when Home Assistant is built. There is no separate approval step and no pull request: what you save in Lokalise is what a build picks up. When you see it depends on the project:

- **Backend**: every build of Home Assistant Core downloads these, so your strings are in the next nightly build, the next beta, and the next release.
- **Frontend**: the frontend is built and released on its own, and downloads translations at that moment. A nightly frontend build is made every day, and the nightly builds of Home Assistant use it. A beta or release of Home Assistant ships a specific frontend release, so your strings reach it with the first frontend release that is built after you saved them.

[How translations work](/translate/how-it-works/#how-translations-get-back) has the details.

The companion apps work a little differently. Android pulls translations at build time too, while the iOS app gets them through a daily pull request in its repository.

## What is next

- Read the [translation rules](/translate/reference/rules/). They are short.
- Check if there are [guidelines for your language](/translate/reference/languages/), like whether to address people formally or informally.
- Join another project. The backend project has a lot of strings and often needs help.

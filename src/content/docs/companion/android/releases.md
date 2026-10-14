---
title: Android releases
description: How a change to the Android app travels from a merged pull request to internal testers, the beta, and production, and how to build a signed release yourself.
sidebarLabel: Releases
sidebarGroup: Ship
order: 3
source: https://github.com/home-assistant/android/tree/main/.github/workflows
lastVerified: 2026-10-14
---

Every merged pull request ships to internal testers right away. Every week, the latest build goes to the open beta. When a beta is stable, a maintainer promotes it to production. This page describes that path, and how to build a signed release on your own machine.

## From merge to production

### Internal testing

When a pull request is merged into `main`, CI builds the release versions and publishes them to the internal testing track on the Play Store. Internal testers get every change immediately. The app does a lot, so they can't test every feature on every build.

This is also the only way to test Android Automotive in a real car: debug builds don't show up in a vehicle.

APKs of every commit on `main` are also attached to the [On Push workflow runs](https://github.com/home-assistant/android/actions/workflows/onPush.yml).

### Weekly beta

Every Sunday at 04:00 UTC (Saturday evening in the Americas), CI tags a new version, creates a GitHub pre-release with the APKs, and promotes the latest `main` build to the open beta. Before that cutoff, the in-app changelog in `ChangelogContent.kt` should list the new features and backward-incompatible changes of the week.

Anyone can [join the beta on Google Play](https://play.google.com/apps/testing/io.homeassistant.companion.android). Beta users find the problems that tests and internal testers can't.

Google reviews every build that goes to the open beta. How long that takes varies, and it can be more than a week. When the next weekly beta comes in while the previous one is still in review, the previous one is dropped. This doesn't block anything, but it is worth knowing when you wonder why a beta is late.

### Promoting to production

A maintainer promotes the beta to production when it is stable, and it reaches everyone who installs the app from [Google Play](https://play.google.com/store/apps/details?id=io.homeassistant.companion.android).

Before promoting:

- Wait a few days after the beta release, so beta users can find regressions.
- Check that the in-app changelog in `app/src/main/kotlin/io/homeassistant/companion/android/changelog/ChangelogContent.kt` covers what ships.
- Check Sentry for an unusual number of issues in the beta.
- Check the [Google Play Console](https://play.google.com/console) for crashes, ANRs, and other anomalies.
- Prepare a pull request in the [companion documentation](https://github.com/home-assistant/companion.home-assistant) that removes the beta labels of the features in this release.

To promote:

1. Edit the latest beta release on [GitHub](https://github.com/home-assistant/android/releases). Keep the generated list of commits, and add a **Highlights of this release** section on top that matches `ChangelogContent.kt`. See [2026.6.1](https://github.com/home-assistant/android/releases/tag/2026.6.1) for an example.
2. Clear the **pre-release** checkbox, and set it as the **latest** release.

That starts `release.yml`, which uses Fastlane to promote the beta track to production for the phone, Wear OS, and Automotive apps. Google reviews the release first, which usually takes a few days. Nothing needs to happen during that review.

### Other stores

The Play Store only covers the `full` flavor. After a release:

- Send the `minimal` Automotive app to the Harman Ignite store.
- Submit the release for review in the [Amazon developer console](https://developer.amazon.com/apps-and-games/console/apps/list.html). The APK and changelog were already uploaded when the beta was built, by the `prep_amazon` Fastlane lane in `onPush.yml`.
- Release the `minimal` app on the Meta Quest store.
- F-Droid builds the release on its own, a few days later. See [F-Droid](/companion/android/ci/#f-droid).

### Once it is live

- Merge the documentation pull request that removes the beta labels.
- If the release fixes security issues since the last production release, add a **Disclosed security advisories** section to the GitHub release notes, after the highlights, with a link to each advisory.
- For a release with a major change or a great new feature, ask the community manager to help promote it, like with a blog post or on social media.

## Build a signed release yourself

You only need this if you publish your own build. A release build must be signed.

> [!WARNING]
> Keep your keystore and its passwords safe, and never commit them.

1. Create a keystore in Android Studio with **Build** > **Generate Signed App Bundle or APK**, or use an existing one. Remember the passwords and the key alias.
2. Name it `release_keystore.keystore` and put it in each app module you build: `app/`, `wear/`, or `automotive/`. Or set `KEYSTORE_PATH` to its location.
3. Set the signing variables:
   - `KEYSTORE_PASSWORD`
   - `KEYSTORE_ALIAS`
   - `KEYSTORE_ALIAS_PASSWORD`
   - `KEYSTORE_PATH`, if the keystore is somewhere else

   The signing configuration that reads them lives in `build-logic/convention/src/main/kotlin/AndroidApplicationConventionPlugin.kt`.
4. Build APKs or app bundles, for all apps or for one module:

```bash
# APKs
./gradlew assembleRelease
./gradlew :app:assembleRelease

# App bundles
./gradlew bundleRelease
./gradlew :wear:bundleRelease
```

You can also build from Android Studio, with **Build** > **Generate Signed App Bundle or APK**.

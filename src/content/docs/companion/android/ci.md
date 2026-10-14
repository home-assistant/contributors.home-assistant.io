---
title: Android continuous integration
description: The GitHub Actions workflows of the Android app. What runs on your pull request, after a merge, and on a schedule.
sidebarLabel: Continuous integration
sidebarGroup: Ship
order: 2
---

The Android app uses GitHub Actions for everything: checking pull requests, building releases, and shipping them to the stores with [Fastlane](https://fastlane.tools/). Shared steps live as local actions in `.github/actions`.

The app uses [calendar versioning](https://calver.org/), like Home Assistant Core: `YYYY.MM.patch`.

## The workflows

| Workflow | Runs | Does |
| --- | --- | --- |
| `pr.yml` | On every pull request | Lint, build, test, and attach APKs |
| `pr-emulator-wtf.yml` | After `pr.yml` finishes | Run the `:app` instrumentation tests on Emulator.wtf |
| `onPush.yml` | On every push to `main` | Build release versions and publish them to the internal track of the Play Store |
| `weekly.yml` | Sundays at 04:00 UTC | Tag a new version and run `onPush.yml` with the `beta` flag, which creates a GitHub pre-release and promotes the build to the beta track |
| `e2e.yml` | Daily at 05:00 UTC | Run the [end-to-end test](/companion/android/e2e-testing/) against a real Home Assistant. When it fails, it starts `e2e-triage`, an agentic workflow that looks into the failure and reports it in an issue |
| `monthly.yml` | The first day of each month | Create the first version tag of the month, `YYYY.MM.0` |
| `release.yml` | When a pre-release becomes a release, or manually | Promote the beta to production on the Play Store |
| `updateScreenshot.yml` | Manually, by a maintainer | Regenerate [screenshot](/companion/android/screenshot-testing/) references |
| `renovate-lockfiles.yml` | On every push to a `renovate/` branch | Update the [lockfiles](/companion/android/dependencies/) of Renovate pull requests and push them |

## On your pull request

`pr.yml` checks your change:

- KTLint, Detekt, Android Lint, and Yamllint. See [code style and linting](/companion/android/code-style/).
- That the lockfiles match the version catalog.
- That the licenses of all dependencies are compatible with the Apache 2.0 license of the project, with `.github/scripts/check_licenses.py`.
- The unit tests and the screenshot tests.
- That every app builds, in debug and release.
- That no existing database schema in `common/schemas` was changed, and that the build doesn't produce schema changes you forgot to commit. To change the database, increase its version instead.
- If your pull request changes the Lokalise setup in `.github/actions/download-translations`, that the translations still download.
- It uploads the APKs as an artifact, so anyone can [test your change](/companion/android/get-started/#test-a-pull-request-build).

Debug builds on CI use the mock Firebase file in `.github/mock-google-services.json`.

When a check fails, fix it and push a new commit: that starts the workflow again. When you push several commits quickly, only the latest one is built. Earlier runs are cancelled.

If you are a new contributor, a maintainer has to approve each CI run on your pull request first. Running CI costs a lot of resources, so don't open a pull request, not even a draft, before your work is ready for someone to look at. Pushing to your fork as often as you like is fine.

### Instrumentation tests

The instrumentation tests of `:app` run on [Emulator.wtf](https://emulator.wtf), against every API level from `androidSdk-min` to `androidSdk-target`, in seconds.

That takes two workflows. `pr.yml` builds the test APKs and the device list. Then `pr-emulator-wtf.yml`, triggered when `pr.yml` completes, runs them and reports back on the pull request. The split is what makes this work for forks: a workflow started by a fork has no access to secrets, so it can't reach Emulator.wtf. The second workflow runs in the context of the main repository, and only runs the APKs the first one built, never code from the fork.

The instrumentation tests of `:wear`, `:automotive`, `:common`, and `:microwakeword` run on the regular Android emulator on GitHub Actions. Emulator.wtf only offers phone, tablet, and monitor devices, so this is the only option for Wear OS and Automotive. Only one emulator fits on a runner, so every API level and device profile is its own job, and each job is much slower than the whole Emulator.wtf run. That is why these targets cover only a few API levels.

## After a merge

Every push to `main` goes through `onPush.yml`. It downloads the latest translations from Lokalise, generates release notes from the merged pull requests, builds the release versions of all apps, attaches the APKs to the workflow run, and publishes to the internal testing track of the Play Store. The signing keys and other files needed for publishing come from repository secrets, and are only added during the run.

All store deployments go through [Fastlane](https://fastlane.tools/). Its configuration, including the lanes the workflows call, lives in the `fastlane` folder.

Run with the `beta` flag, which `weekly.yml` does every Sunday, it also creates a GitHub pre-release with the APKs, prepares the Amazon listing, and promotes the build to the beta track.

So every merged pull request reaches internal testers. See [releases](/companion/android/releases/) for the rest of the way to production.

## Changing a workflow

- Put steps that more than one workflow needs in a local action in `.github/actions`, instead of copying them.
- Choose triggers carefully. Every run costs resources, so a workflow should only run when its result matters.
- Never put secrets in a workflow file. Pass them in from the repository secrets at run time, like the existing workflows do.

## F-Droid

[F-Droid](https://f-droid.org/packages/io.homeassistant.companion.android.minimal/) builds the `minimal` app itself from each GitHub release, following its [metadata](https://gitlab.com/fdroid/fdroiddata/-/blob/master/metadata/io.homeassistant.companion.android.minimal.yml). Each release has three files for that:

- `version_code.txt`: the version code of the build.
- `strings.zip`: the translations from Lokalise at build time.
- `locales_config.xml`: the [locale configuration](https://developer.android.com/guide/topics/resources/app-languages#use-localeconfig) generated from those translations.

When a release shows up on F-Droid is up to F-Droid.

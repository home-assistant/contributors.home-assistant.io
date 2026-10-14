---
title: Android end-to-end tests
description: The nightly Maestro test that runs the Android app against a real Home Assistant on every API level, and how to debug a failure.
sidebarLabel: End-to-end tests
sidebarGroup: Test
order: 4
---

All other tests fake the server. The end-to-end (E2E) test doesn't: it runs the real app against a real Home Assistant, the way a user does. That catches what nothing else can, like a change in Core or the frontend that breaks onboarding, or a web view problem on one specific Android version.

## When it runs

The `e2e.yml` workflow runs:

- Every night at 05:00 UTC on `main`, against the `dev` image of Home Assistant, the latest development build.
- Manually, on any branch, through **Run workflow**. The optional `home-assistant-version` input picks the image tag to test against.

It is not part of the pull request checks. It starts an emulator for every supported API level, which is too expensive for every pull request.

## What it does

1. Builds the `fullDebug` APK, with [StrictMode](/companion/android/debugging/#strictmode) off.
2. Installs the [Maestro](https://maestro.dev/) CLI, and checks the download against its published checksum.
3. Starts Home Assistant from the configuration in `.github/e2e/homeassistant`, and checks that `mobile_app` is loaded.
4. Starts one emulator per API level on Emulator.wtf, from API 29 to `androidSdk-target`, and installs the app.
5. Runs the Maestro flow on all emulators in parallel.
6. Uploads the files you need to debug, whatever the result.

The device list starts at API 29, even though the app supports older versions. On older images, the web view renders the frontend, but its content never shows up in what Maestro can see, so every check on it fails. The [instrumentation tests](/companion/android/instrumentation-testing/) on pull requests still cover the full range, down to the minimum API level of the app.

The Home Assistant container runs on the GitHub runner, and the emulators on Emulator.wtf. A tunnel connects them, and inside the emulators `homeassistant.internal` resolves to the instance.

## The flow

The flows live in the `.maestro` folder at the root of the repository. Today there is one, [`.maestro/onboarding.yaml`](https://github.com/home-assistant/android/blob/main/.maestro/onboarding.yaml), and every step of the test is written there. It covers the most critical path of the app:

- **Login**: the real login page, with real credentials, through the whole authorization flow.
- **Registration**: the app registers itself with `mobile_app`, which everything else depends on.
- **The frontend renders**: reaching the overview dashboard proves the web view works on that API level.
- **The external bus works both ways**: the frontend only shows the **Companion app** entry in its settings after the app announced itself over the [external bus](/frontend/reference/external-bus/), and selecting it makes the frontend ask the app to open its native settings.

The flow takes the instance to test against from three parameters: `HOME_ASSISTANT_URL`, `HOME_ASSISTANT_USERNAME`, and `HOME_ASSISTANT_PASSWORD`.

When you change the flow:

- It drives the debug app, `io.homeassistant.companion.android.debug`. Don't change the `appId`.
- It runs on every API level, so anything version specific must be conditional, like the existing steps for permission dialogs.
- Steps match on text on screen. If you rename a label in the app, update the flow in the same pull request.

The [Maestro documentation](https://docs.maestro.dev/api-reference/commands) lists all commands.

## Run it locally

Install the [Maestro CLI](https://docs.maestro.dev/getting-started/installing-maestro), start an emulator or connect a device, and run:

```bash
./gradlew :app:installFullDebug
maestro test \
  -e HOME_ASSISTANT_URL=http://homeassistant.local:8123 \
  -e HOME_ASSISTANT_USERNAME=<username> \
  -e HOME_ASSISTANT_PASSWORD=<password> \
  .maestro/onboarding.yaml
```

The flow clears the app state first, so it always starts from a fresh onboarding. Use a throwaway instance: every run registers a new device on it.

## Debug a failure

Every run uploads an `e2e-artifacts` artifact:

| File | Content |
| --- | --- |
| `maestro-results/` | The command trace per shard, `maestro.log`, and screenshots of failures |
| `logcat-*.txt` | The full logcat, one file per emulator |
| `homeassistant.log` | The Home Assistant log |
| `homeassistant-config.json` | The `/api/config` response, with the version and loaded components |
| `homeassistant-container.json` | The container details, including the exact image |

Read them in that order, and stop at the first one that explains the failure. Most failures show in the failing Maestro command and its screenshot: that tells a broken screen apart from an element Maestro just couldn't see. Starting with the Home Assistant log usually wastes time.

Only look upstream once the app and the flow are ruled out. The `dev` image changes every night, so compare with the last run that passed: the two `homeassistant-config.json` files give the Home Assistant versions on both sides of the break. Then look at what landed in [Core](https://github.com/home-assistant/core) or the [frontend](https://github.com/home-assistant/frontend) in between.

## Automated triage

A failing nightly run starts an `e2e-triage` workflow. An AI agent downloads the artifacts of the failed run and of the last good one, and follows the procedure in the `.agents/skills/ha-android-e2e-debugging` skill. It only diagnoses: it never changes files or opens pull requests. It reports in a single `e2e-failure` issue in the Android repository, including upstream findings for a maintainer to take to Core or the frontend. The next passing run closes the issue.

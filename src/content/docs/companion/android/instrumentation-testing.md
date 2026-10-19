---
title: Android instrumentation tests
description: Test the Android app on a real Android runtime, on emulators for every supported API level.
sidebarLabel: Instrumentation tests
sidebarGroup: Test
order: 3
---

Unit tests run on your JVM. Users run the app on Android, which has [its own runtime](https://source.android.com/docs/core/runtime) and supports only part of the [Java language features and APIs](https://developer.android.com/studio/write/java8-support) on older versions. Instrumentation tests close that gap: they run on an emulator, on the same runtime users have.

Write unit tests first. Reach for an instrumentation test when the behavior depends on the real Android system.

## Why they matter

Some bugs only show at runtime on a specific Android version. The [Jackson](https://github.com/FasterXML/jackson) library is a real example: from version 2.14 it needs API 26, and nothing fails until the app runs on an older device. Only an instrumentation test, or a crash report from a user, catches that. See [this pull request](https://github.com/home-assistant/android/pull/5108) for how it played out.

## What they cover

- **Screens**, with [Espresso](https://developer.android.com/training/testing/espresso) and Compose UI tests, checking how a screen behaves when the user interacts with it.
- **Code without UI**, like [foreground services](https://developer.android.com/develop/background-work/services/fgs), where you check the data and the interaction with the system.

Most of these tests should not depend on a Home Assistant server. Replace the server with fakes, or with mocks from [MockK](https://mockk.io/). Fakes are the better choice: they give you more control over the behavior. Testing against a real server is what the [end-to-end tests](/companion/android/e2e-testing/) are for.

## Where they run

On every pull request, the instrumentation tests of `:app` run on [Emulator.wtf](https://emulator.wtf), against every API level from `androidSdk-min` to `androidSdk-target`. The whole run takes seconds. See [continuous integration](/companion/android/ci/#instrumentation-tests) for how that works with forks.

The tests of `:wear`, `:automotive`, `:common`, and `:microwakeword` run on the regular Android emulator on GitHub Actions, because Emulator.wtf doesn't offer those targets. That is slower, so they cover fewer API levels.

## Flaky emulators

Android emulators sometimes fail for no reason at all. The fix is to run the job again. Only maintainers can re-run a job, so ask in the pull request if you think it was a fluke.

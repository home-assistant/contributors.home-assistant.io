---
title: Android debug tools
description: The developer playground, the Compose catalog, StrictMode, and LeakCanary in debug builds of the Android app.
sidebarLabel: Debug tools
sidebarGroup: Write code
order: 5
---

Debug builds of the Android app come with a few tools that make development faster and catch problems early. None of them are in release builds.

## The developer playground

The app depends on a server and a web view, so trying something often means going through onboarding and a few screens first. The developer playground skips that. It is an [app shortcut](https://developer.android.com/develop/ui/views/launch/shortcuts/creating-shortcuts#static) in debug builds: long-press the app icon and select **DevPlayground**. In Android Studio, the `dev playground` run configuration opens it directly. Its code is in the `app/src/debug` source set, so it never ends up in a release.

From the playground you can, among other things, crash the app or trigger a fail fast on purpose, start the NFC tag emulator, and open the [Compose catalog](/companion/android/compose/#the-compose-catalog) of all `HA*` components.

Use the playground however you like. Only commit changes that help other developers too, like the crash button that tests crash reporting, or the catalog that shows all components and themes. Committed playground code follows the [code style](/companion/android/code-style/) and [best practices](/companion/android/best-practices/) like any other code. Translations are not needed there.

## StrictMode

[StrictMode](https://developer.android.com/reference/android/os/StrictMode) is on in debug builds, on devices with Android 12 or newer. It catches disk and network access on the main thread, and behavior that newer Android versions deprecate, which makes moving to a new Android API level easier.

A violation of either policy, the [VM policy](https://developer.android.com/reference/android/os/StrictMode.VmPolicy.Builder) or the [thread policy](https://developer.android.com/reference/android/os/StrictMode.ThreadPolicy.Builder), goes to `FailFast`, so a debug build crashes on it. Known violations from code the project doesn't control, like the WebView or vendor frameworks, are ignored through the rules in `app/src/main/kotlin/io/homeassistant/companion/android/util/IgnoreViolationRules.kt`.

If StrictMode blocks you, turn it off for a build:

```bash
./gradlew :app:assembleFullDebug -PnoStrictMode
```

Or uncomment `noStrictMode=true` in `gradle.properties`. If you had to turn it off, open an issue or mention it on [Discord](https://www.home-assistant.io/join-chat/), so the underlying problem gets fixed.

## LeakCanary

[LeakCanary](https://square.github.io/leakcanary/) is included in debug builds and reports memory leaks while you work, so you can fix them early. If it reports one, open an issue. If the leak comes from a library and can't be fixed now, document it.

To build without it, for example for performance testing:

```bash
./gradlew :app:assembleFullDebug -PnoLeakCanary
```

Or set `noLeakCanary=true` in `gradle.properties`, in the project or in your Gradle user home.

> [!WARNING]
> Without LeakCanary, the resolved dependencies change, and Gradle complains about the lockfile. Update the lockfiles locally as described in [dependencies](/companion/android/dependencies/#lockfiles), but don't commit those changes. The lockfile check on pull requests regenerates the lockfiles with LeakCanary included, and fails when they differ from what you committed.

## FailFast

`FailFast` crashes debug builds when it catches an error that release builds would quietly survive. The log shows a big `CRITICAL FAILURE: FAIL-FAST` banner with the stack trace. See [fail fast](/companion/android/best-practices/#fail-fast).

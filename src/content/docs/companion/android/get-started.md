---
title: Get started with Android
description: Install Android Studio, fork and clone the repository, build the app, and run it on an emulator or your phone.
sidebarLabel: Get started
sidebarGroup: Set up
order: 1
source: https://github.com/home-assistant/android/blob/main/.github/workflows/pr.yml
lastVerified: 2026-10-14
---

Android Studio is the only tool you need. It brings the Android SDK, an emulator, and a JDK. This page takes you from nothing to the app running on an emulator.

## 1. Install Android Studio

Install the latest stable version of [Android Studio](https://developer.android.com/studio).

The project also needs the NDK and CMake, for the native wake word code. Android Studio normally installs them during the first Gradle sync. If that fails, install them yourself:

1. Open **Settings** > **Languages & Frameworks** > **Android SDK** > **SDK Tools**.
2. Select **NDK (Side by side)** and **CMake**.
3. Install the versions listed under `androidNdk` and `cmake` in `gradle/libs.versions.toml`.

## 2. Fork, clone, and branch

1. Fork [home-assistant/android](https://github.com/home-assistant/android) on GitHub. New to forks? GitHub explains [how to fork a repository](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo).
2. Clone your fork, and go into the folder it creates:

   ```bash
   git clone https://github.com/<your-github-username>/android.git
   cd android
   ```

   Or in Android Studio, use **File** > **New** > **Project from Version Control**. Run the commands below in the folder of the project.

3. Create a branch for your change, with a name that says what you work on:

   ```bash
   git checkout -b fix-sensor-crash
   ```

## 3. Add a Firebase configuration

The `full` flavor uses Firebase for push notifications, and the build expects a `google-services.json` file in each app module. Unless you work on push notifications, use the mock file from the repository. Run these in the `android` folder:

```bash
cp .github/mock-google-services.json app/google-services.json
cp .github/mock-google-services.json automotive/google-services.json
cp .github/mock-google-services.json wear/google-services.json
```

With the mock file, notifications still work over the WebSocket connection, just not through Firebase. If you need real push notifications, see [push notifications](/companion/android/push-notifications/).

## 4. Build and run

In Android Studio:

1. Open the project and let Gradle sync.
2. Select the `app` run configuration and an emulator or connected device.
3. Select **Run**.

From the terminal, set `JAVA_HOME` to a JDK 21 (the version CI uses) and run:

```bash
./gradlew assembleDebug
```

On Windows, use `gradlew.bat assembleDebug`. This builds the debug variants of both [flavors](/companion/android/flavors-and-targets/). To install the `full` debug app on a running emulator or device:

```bash
./gradlew :app:installFullDebug
```

The debug build has its own application ID, `io.homeassistant.companion.android.debug`, so it installs next to the app from the Play Store. Its icon has a red background, so you can tell the two apart.

Need a signed release build? See [build a signed release yourself](/companion/android/releases/#build-a-signed-release-yourself).

Once the app runs, connect it to a Home Assistant instance. Use a test instance if you can: every time you onboard, the app registers a new device on that server.

## Handy commands

These are the commands you will use most. They are the same ones CI runs:

```bash
# Format the code, run before every commit
./gradlew :build-logic:convention:ktlintFormat ktlintFormat

# Unit tests, or :common:test for one module
./gradlew test

# Static analysis
./gradlew detektMain :build-logic:convention:detektMain --continue
./gradlew lint --continue

# Screenshot tests, per module
./gradlew :app:validateFullDebugScreenshotTest
./gradlew :wear:validateDebugScreenshotTest
./gradlew :common:validateDebugScreenshotTest

# After changing a dependency
./gradlew alldependencies --write-locks
```

## Test a pull request build

You don't need to build anything to try someone else's change. CI builds APKs for every pull request:

1. Open the pull request on GitHub and go to the **Checks** tab.
2. Select the **Pull Request** workflow and scroll down to **Artifacts**.
3. Download the **APKs** artifact. You must be signed in to GitHub for this.
4. Unzip it. It holds the debug APKs of the phone, Wear OS, and Android Automotive apps. For the phone, pick the `full` or `minimal` APK.
5. Install it from a file manager on your phone, or with `adb install path/to/app.apk`.

The artifact only shows up once the build job has finished. That job waits for the lockfile and KTLint checks, so if one of those fails, there are no APKs.

The debug APK installs next to your regular app, with a red icon, so you can test without losing your setup.

## AI tools

The repository has instructions for AI coding tools in `AGENTS.md`, and skills in `.agents/skills/`, like `ha-android-architecture`, `ha-android-testing`, and `ha-android-review`. The pull request template asks whether you used AI, and how. [Contribute with AI tools](/start/ai-tools/) lists every skill, and explains what the [AI policy](/start/ai-policy/) asks of you.

## What is next

- Read the [architecture](/companion/android/architecture/) to find your way around the code.
- Look at the [developer playground](/companion/android/debugging/#the-developer-playground), a debug-only screen for trying things quickly.
- Stuck? Ask in the [Android project thread](discord:android-project) on Discord.

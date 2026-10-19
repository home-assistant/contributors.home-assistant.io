---
title: Android dependencies
description: The version catalog, dependency lockfiles, and Renovate in the Android app.
sidebarLabel: Dependencies
sidebarGroup: Write code
order: 4
source: https://github.com/home-assistant/android/blob/main/.github/workflows/renovate-lockfiles.yml
lastVerified: 2026-10-14
---

The Android app keeps tight control over its dependencies. Every library is declared in one place, every resolved version is locked, and a bot keeps them up to date.

## The version catalog

All dependencies are declared in the [version catalog](https://docs.gradle.org/current/userguide/version_catalogs.html), `gradle/libs.versions.toml`. This is the only way to add a dependency: a dependency declared outside the catalog won't be accepted. With one place for all versions, every module uses the same version of a shared library, and an update happens once for the whole project. A module refers to it through the `libs` accessor:

```kotlin
dependencies {
    implementation(libs.kotlinx.coroutines.android)
}
```

## Lockfiles

The project uses Gradle [dependency locking](https://docs.gradle.org/current/userguide/dependency_locking.html). Each module has a `gradle.lockfile` with the exact version of every direct and transitive dependency, so builds are the same on every machine, and a transitive dependency can't change under you without anyone noticing.

After you add or change anything in the catalog, update the lockfiles and commit them:

```bash
./gradlew alldependencies --write-locks
```

CI fails when the catalog changed but the lockfiles didn't.

## Renovate

[Renovate](https://docs.renovatebot.com/) opens pull requests to update dependencies, configured in `renovate.json5`. It waits three days after a release before it proposes it, so early problems get found by others first. Related libraries, like the AndroidX or Kotlin ones, are grouped in one pull request.

Renovate itself doesn't touch the lockfiles. The `Auto-update Renovate lockfiles` workflow (`.github/workflows/renovate-lockfiles.yml`) runs on every Renovate branch, updates the lockfiles, and pushes them to the same branch.

## Stable versions only

The project avoids alpha, beta, and release candidate versions of libraries. Exceptions are agreed on in a pull request, when a feature is only available in a pre-release. They come with a cost: the API can change with every update, and someone has to deal with that.

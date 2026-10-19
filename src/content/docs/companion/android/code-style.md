---
title: Android code style and linting
description: KTLint, Detekt, the Android linter, and Yamllint in the Android app. How to run them, suppress an issue, and work with the baselines.
sidebarLabel: Code style and linting
sidebarGroup: Write code
order: 3
---

The Android app enforces its code style with tools, so reviews can be about logic instead of formatting. CI runs every one of them on your pull request, and reports findings as comments in the diff.

## The tools

| Tool | Checks | Configured in |
| --- | --- | --- |
| [KTLint](https://pinterest.github.io/ktlint) | Kotlin formatting | `.editorconfig` |
| [Detekt](https://detekt.dev/) | Maintainability and correctness | `.detekt/detekt.yml` |
| Android Lint | Android API usage and project rules | `build-logic/convention/src/main/kotlin/AndroidCommonConventionPlugin.kt` |
| [Yamllint](https://github.com/adrienverge/yamllint) | YAML files | `.yamllint` |

Passing all of them does not mean the code is good. It means a reviewer can focus on what matters.

## Run them

```bash
# Format Kotlin, run before every commit
./gradlew :build-logic:convention:ktlintFormat ktlintFormat

# Check formatting without changing files
./gradlew ktlintCheck :build-logic:convention:ktlintCheck --continue

# Detekt, with type resolution, as CI runs it
./gradlew detektMain :build-logic:convention:detektMain --continue

# Android Lint
./gradlew lint --continue

# YAML
yamllint --strict --format github .
```

`--continue` reports issues in every module instead of stopping at the first failure. `build-logic` is an included build, so its tasks need to be called explicitly. For one module, use the module path, like `./gradlew :app:detektMain`.

To run the KTLint check before every commit, install the git hook once:

```bash
./gradlew addKtlintCheckGitPreCommitHook
```

Yamllint does not fix anything; fix what it reports yourself.

## Android Lint settings

Android Lint is strict: warnings are errors, and the build fails on any issue that is not in the baseline. A few rules are tuned on purpose:

- `LogNotTimber` is an error, so all logging goes through Timber.
- `MissingTranslation` is off, because translations only arrive in release builds from Lokalise.
- Dependency version checks are off, because Renovate takes care of updates.

## Suppressing an issue

Fix issues instead of suppressing them whenever you can. When you can't:

- For one place, use `@Suppress("rule-id")` on the smallest construct possible.
- For Android Lint, an issue can also go in the module's `lint-baseline.xml`, as described in [baselines](#baselines).
- To change a rule for the whole project, open a dedicated pull request that explains why. For Android Lint, change the `lint` block in `AndroidCommonConventionPlugin.kt`. For KTLint, change `.editorconfig` and add a comment above the rule with the reason, with a link to a GitHub issue if it needs more explanation. If the change touches code, use two commits: one for the rule, one for the code it changes.

## Baselines

Modules have baseline files with issues that existed before a tool was enabled:

- `lint-baseline.xml` for Android Lint.
- `detekt-baseline-*.xml` for Detekt. Android modules have one per variant, like `detekt-baseline-release.xml`; JVM modules have `detekt-baseline-main.xml`.

New issues fail CI. Baselined ones don't.

> [!TIP]
> Fixing an issue from a baseline and removing it from the file is a great first contribution.

When an update of the Android Gradle Plugin or Detekt changes the rules, regenerate the baselines and look at what changed:

```bash
./gradlew updateLintBaseline
./gradlew detektBaselineMain :build-logic:convention:detektBaselineMain \
  --continue
```

Then go through the new entries. Fix what you can in the same pull request, and open an issue for what has to wait.

## Custom lint rules

The `:lint` module has the project's own lint rules. They check things like a missing `@Serializable` annotation for Kotlinx.serialization, mutable properties on Room entities, and the use of `evaluateJavascript`. If you keep seeing the same mistake in reviews, propose a rule.

## SARIF reports in CI

The linters write SARIF reports, which GitHub shows as annotations on your pull request. Every module writes its own report, and GitHub only accepts one per run, so CI merges them with `.github/scripts/merge_sarif.py`. You don't need this locally, but you can run it after the linters: `python3 .github/scripts/merge_sarif.py` writes `merged_results.sarif` in the folder you run it from.

## Conventions

The tools don't catch everything. These conventions apply too.

### English

All code and comments are in English. Typos happen, and many contributors are not native speakers. Reviewers may suggest fixes; a spell checker in your IDE helps.

### No magic numbers or strings

Replace unexplained values with named constants, and explain the value where it is defined:

```kotlin
// Explanation, or a link, about why the threshold is 42
const val SUPER_IMPORTANT_THRESHOLD = 42

if (value == SUPER_IMPORTANT_THRESHOLD) {
    // Do something
}
```

Constants follow the [Kotlin naming conventions](https://kotlinlang.org/docs/coding-conventions.html#property-names).

### Where constants go

1. A constant used outside its file must be easy to identify when imported, by its own name or the name of its parent.
2. Most constants go in the file of the class they belong to, as `private const val` at the top of the file, outside the class.
3. Use a `companion object` only when a constant must be reachable from outside, or when several classes in one file need a constant with the same name, like `DEFAULT_TIMEOUT`.
4. When a file has too many constants, or they are shared across modules, move them to a `*Constants.kt` file and group them in an `object`.

If a test needs a private constant, mark it `@VisibleForTesting` instead of making it public.

These rules are fairly new, so you will find constants in the code that don't follow them yet. Feel free to fix them when you come across them.

### TODOs need an issue

TODOs get forgotten. Avoid them. When you and a reviewer agree something must be done later, add a TODO with a full link to a GitHub issue:

```kotlin
// TODO Missing feature https://github.com/home-assistant/android/issues/404
```

Always use full links, never a bare `#404`: a number is ambiguous outside GitHub. When you link to code, use a permalink (press <kbd>y</kbd> on GitHub), so the link survives later changes.

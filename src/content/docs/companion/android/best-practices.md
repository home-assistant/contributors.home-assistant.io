---
title: Android best practices
description: The coding rules that come up in every Android review. Strong types, time, concurrency, dependency injection, logging, and failing fast.
sidebarLabel: Best practices
sidebarGroup: Write code
order: 2
---

These are the practices reviewers look for in the Android app. Most come down to one idea: let the compiler and the tools catch mistakes, so people don't have to.

## General principles

- **SOLID, KISS, and DRY.** The usual ones.
- **Follow the community.** For anything this page doesn't cover, the [Now in Android](https://github.com/android/nowinandroid) app shows the practices the project follows.
- **Keep it direct.** Don't add an abstraction for a single implementation or a future that may never come. Use the library or API directly, and abstract when a second real use shows up, or to hide an implementation outside its module (a public interface in `:common` with an `internal` implementation bound through Hilt).
- **Don't store what you can derive** from existing state.
- **Root cause before fix.** A bug fix states the actual cause and how to reproduce it. No speculative workarounds that patch symptoms.
- **Small classes, small functions.** A function that is hard to name does too much.
- **Composition over inheritance.** Build behavior from small, reusable parts instead of deep class hierarchies.
- **Comments that last.** Document public functions, comment where it helps, and keep comments up to date with the code. Ask yourself if you will understand it in six months.

## Use strong types for logic

Strings are for display and for raw values from outside. Don't use them to control behavior: a typo compiles fine and breaks at runtime. Use a sealed class or interface instead, or an `enum` if you must.

```kotlin
private const val DESTINATION_KEY = "destination"

@Parcelize
sealed interface Destination : Parcelable {
    data object General : Destination
    data class Notifications(val title: String) : Destination
    data object Privacy : Destination
}

fun newInstance(destination: Destination): Intent =
    Intent().apply { putExtra(DESTINATION_KEY, destination) }
```

Sealed types beat enums: each case can carry its own data, like the `title` above. And when you handle them with `when`, leave out the `else` branch:

```kotlin
fun onIntent(intent: Intent) {
    val destination = IntentCompat.getParcelableExtra(
        intent,
        DESTINATION_KEY,
        Destination::class.java,
    )
    when (destination) {
        Destination.General -> showGeneral()
        is Destination.Notifications -> showNotifications(destination.title)
        Destination.Privacy -> showPrivacy()
        null -> showDefault()
    }
}
```

Then adding a case breaks the build everywhere it is not handled yet, which is exactly what you want. Your IDE also finds every place that uses a specific destination, which a string never gives you. The [Kotlin documentation on sealed classes](https://kotlinlang.org/docs/sealed-classes.html) has the details.

If you must use a string, make it a `const val` (see [no magic numbers or strings](/companion/android/code-style/#no-magic-numbers-or-strings)), or wrap it in an [inline value class](https://kotlinlang.org/docs/inline-classes.html).

## Use real types for time

Never use bare numbers for time or durations. Units get mixed up. Use `Instant`, `Duration`, and friends, and convert values from APIs that return milliseconds as early as you can:

```kotlin
// Bad: seconds or milliseconds?
const val THRESHOLD = 600000

// Good
val THRESHOLD = 10.minutes
```

Never call `System.currentTimeMillis()`. Inject a `kotlin.time.Clock` through Hilt, so tests can control time. If you really need a primitive, put the unit in the name: `THRESHOLD_MS`.

## Immutability

Prefer immutable data classes, and produce changes with `copy()` or functions that return a new instance. Default to `private` or `internal` visibility.

## Concurrency

- Tie coroutines to a lifecycle, like `viewModelScope` or `lifecycleScope`, so they don't leak.
- Anything touched from more than one coroutine must be thread-safe. If it isn't, make it safe or don't share it.
- Race conditions are very hard to debug. Design for them up front.

## Dependency injection

Everything that can be injected is provided through [Hilt](https://developer.android.com/training/dependency-injection/hilt-android). Never create injected classes by hand.

When you need two bindings of the same type, use a custom qualifier annotation, not `@Named("...")`. A custom annotation is type-checked, easy to find, and safe to rename. The `NoNamedAnnotation` lint rule fails the build on `@Named`:

```kotlin
@Qualifier
@Retention(AnnotationRetention.RUNTIME)
annotation class NamedKeyChain

@Inject
@NamedKeyChain
lateinit var keyChainRepository: KeyChainRepository
```

[Pull request #5667](https://github.com/home-assistant/android/pull/5667) shows a real migration from `@Named("keyChainRepository")` to `@NamedKeyChain`.

## Logging

Use [Timber](https://github.com/JakeWharton/timber), never `android.util.Log`. The linter fails the build on `Log` calls. Log what helps someone debug a problem, not everything, with messages that say what failed and for what. Never log tokens, passwords, or other sensitive data. For user data that helps in debug builds, wrap it in `sensitive()`, which shows it in debug builds and hides it in release builds.

## Fail fast

The later you find a bug, the harder it is to fix. Catch errors at build time when you can: sealed types with exhaustive `when`, and a [lint rule](/companion/android/code-style/#custom-lint-rules) when the compiler can't enforce something. When the same remark keeps coming back in reviews, turn it into tooling instead of relying on memory: a custom lint rule, a KTLint override, a `FailFast` check, or a test listener.

Don't swallow exceptions. At the very least, log them. Better: use `FailFast`. It logs the error, crashes debug builds so you notice, and falls back to a safe value in release builds:

```kotlin
import io.homeassistant.companion.android.common.util.FailFast

val value = FailFast.failOnCatch(
    message = { "Couldn't read value, state: ${api.state()}" },
    fallback = "fallback",
) {
    api.value()
}
```

When `FailFast` triggers, Logcat shows a large `CRITICAL FAILURE: FAIL-FAST` banner from `CrashFailFastHandler`, followed by your message and the stack trace, so it is hard to miss.

## Ship big changes in small steps

Small pull requests get reviewed faster. Break a big change into steps that each keep the app working. If a rework can't ship in one small pull request, put the new path behind a flag in the `WIPFeature` object, usually enabled only in debug builds through `BuildConfig.DEBUG`. Merge the steps while users stay on the old path, and remove the flag once the feature is done. See [submit a pull request](/companion/android/submitting/) for the rest.

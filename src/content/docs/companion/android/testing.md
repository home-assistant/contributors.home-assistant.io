---
title: Testing the Android app
description: How to write tests for the Android app, and how to write unit tests with JUnit, MockK, Robolectric, and Turbine.
sidebarLabel: Testing and unit tests
sidebarGroup: Test
order: 1
---

Tests exist because people make mistakes. A test that catches a bug before it ships saves users from frustration and you from a debugging session. Every pull request that changes behavior comes with tests.

## Kinds of tests

| Kind | Runs on | Use it for | Page |
| --- | --- | --- | --- |
| Unit | The JVM, with Robolectric when needed | Logic: ViewModels, managers, repositories | This page |
| Screenshot | The JVM | How Compose UI looks | [Screenshot tests](/companion/android/screenshot-testing/) |
| Instrumentation | An emulator | Behavior on a real Android runtime | [Instrumentation tests](/companion/android/instrumentation-testing/) |
| End-to-end | Emulators, against a real Home Assistant | The critical path, from login to the dashboard | [End-to-end tests](/companion/android/e2e-testing/) |

Start with unit tests. They are fast, and most code should be testable that way. Move up the list only when you have to.

## Naming tests

Name tests as sentences, following [GIVEN, WHEN, THEN](https://en.wikipedia.org/wiki/Given-When-Then). You see what broke without reading the test:

```kotlin
@Test
fun `Given user authenticated when opening app then show dashboard`() {
    // Test implementation
}
```

- **Given** is the starting situation, the setup.
- **When** is the action or event you test.
- **Then** is the outcome you expect.

## What to test

- **Test behavior through the public API**, not implementation details. Tests that follow the public interface survive refactors.
- **Don't widen visibility for a test.** Test through the public entry point. When there is no other way, use [`@VisibleForTesting`](https://developer.android.com/reference/kotlin/androidx/annotation/VisibleForTesting), for example for a constructor that takes a `CoroutineScope` or a `Clock`. Lint flags any use of such a member outside tests, and CI fails on lint warnings.
- **Test your code, not libraries.** If you find yourself testing a library, contribute the test to that library. When you do want to pin a library's behavior, say why in the test.
- **Write tests as you build.** Tests are a tool while you develop, not a chore for afterwards. They let you check your code without running the whole app, and writing them early keeps the code testable.
- **Don't test for the sake of it.** Skip trivial code. A test should help you now or the next person later.
- **Keep tests independent.** A test must not rely on another test, or on the order they run in.
- **One behavior per test.** Merge near-identical tests into a parameterized one with `@ParameterizedTest`.
- **Keep a feature's tests in one class**, mirroring the source structure under `src/test/kotlin/`.
- **Never `Thread.sleep`.** Use `runTest`, which fakes time.

## Unit tests

```bash
./gradlew test
./gradlew :common:test
```

### Frameworks

- **[JUnit Jupiter](https://junit.org/)** for unit tests. JUnit 4 only where Robolectric needs it; both run on the JUnit Platform.
- **[MockK](https://mockk.io/)** for mocks. Prefer real objects or fakes when you can.
- **[Turbine](https://github.com/cashapp/turbine)** for every Flow test.
- **[Robolectric](https://robolectric.org/)** for code that needs Android APIs you can't mock or fake well. Prefer it over instrumentation tests.

A test looks like this:

```kotlin
@Test
fun `Given a valid user ID when fetching details then return user`() {
    // Given
    val expectedUser = User(id = "12345", name = "John Doe")
    every { userRepository.getUser("12345") } returns expectedUser

    // When
    val result = userService.getUserDetails("12345")

    // Then
    assertEquals(expectedUser, result)
}
```

### Robolectric

Every Robolectric test class needs both of these annotations. Without them, Robolectric starts the real application, which turns on StrictMode and FailFast and can crash the test JVM:

```kotlin
@RunWith(RobolectricTestRunner::class)
@Config(application = HiltTestApplication::class)
class MyTest {
    // Tests
}
```

Robolectric only works with JUnit 4 (see [this Robolectric issue](https://github.com/robolectric/robolectric/issues/3477)), so the project keeps JUnit 4 for those tests. If your code depends on the real state of the Android system, write an [instrumentation test](/companion/android/instrumentation-testing/) instead.

### Flows

Use Turbine to test Flows. Assert with `awaitItem`, `awaitComplete`, and `expectNoEvents`. Use `turbineScope` and `testIn` when you collect several flows at once. A flow made with `shareIn` never completes: end with `expectNoEvents()` and `cancelAndConsumeRemainingEvents()` instead of `awaitComplete()`.

Never synchronize on emissions with latches, sleeps, or `verify(timeout = ...)`.

### Coroutines and the main dispatcher

Code that runs in `viewModelScope` uses the main dispatcher, which doesn't exist on the JVM. Replace it with a test dispatcher, using the helper that matches your framework:

```kotlin
// JUnit Jupiter
@ExtendWith(MainDispatcherJUnit5Extension::class)
class MyViewModelTest

// JUnit 4 and Robolectric
@get:Rule
val mainDispatcherRule = MainDispatcherJUnit4Rule()
```

Only add it to tests that actually touch the main dispatcher. Both use a `StandardTestDispatcher`; advance it with `runTest` and `advanceUntilIdle`. Don't switch to `UnconfinedTestDispatcher` to make a test pass. That hides an ordering the test should check.

### Shared test helpers

The `:testing-unit` module holds helpers used by tests in several modules. Look there before you write a new one. Among others, it has the main dispatcher helpers above, a `FakeClock`, and `TestSharedFlow`. Keep `:testing-unit` independent from `:common`, to avoid circular dependencies.

Rules that must apply to every test in a module, like resetting process-wide state, are JUnit Platform listeners registered through `ServiceLoader`. Robolectric runs tests in its own class loader, so such rules also need a Robolectric plugin. The existing `TestStateResetPlatformListener` and `TestStateResetRobolectricPlugin` show how.

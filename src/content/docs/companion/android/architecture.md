---
title: Android architecture
description: The principles behind the Android app, the modules, the tech stack, and how the phone, car, and watch apps fit together.
sidebarLabel: Architecture
sidebarGroup: Architecture
order: 1
---

The app follows Google's [recommended app architecture](https://developer.android.com/topic/architecture) and takes inspiration from [Now in Android](https://github.com/android/nowinandroid). The project has a long history, so you will find code that does not follow these rules yet. This page describes where the project is going. When in doubt, follow this page, not the code next to yours.

## A web view with native features

Home Assistant has always been a strong progressive web app, and the Android app builds on that. Its main screen is a [WebView](https://developer.android.com/reference/android/webkit/WebView) that shows the Home Assistant frontend. The app and the frontend talk to each other through a JavaScript bridge: the frontend asks the app for an access token through [external authentication](/frontend/reference/external-auth/), and they exchange messages over [the external bus](/frontend/reference/external-bus/). See [the frontend screen](/companion/android/frontend-screen/) for how that works.

Everything else is native: onboarding, settings, sensors, notifications, widgets, tiles, Assist, and the car and watch apps.

## Principles

- **Kotlin only.** The whole codebase is Kotlin, and it stays that way.
- **Compose for all new UI.** No new XML layouts, data binding, or view binding. New widgets use Jetpack Glance. New screens use the `HATheme` theme. The older `HomeAssistantAppTheme` is Material 2 and deprecated. See [Compose and the design system](/companion/android/compose/).
- **Coroutines and Flow for all concurrency.**
- **Hilt for dependency injection.** Never create injected classes by hand.
- **Keep code flavor agnostic.** Put code in the `main` source set so both [flavors](/companion/android/flavors-and-targets/) get it. Only code that needs Google Play Services goes in `full`.
- **Keep up with Android.** The target SDK follows the latest Android releases, and new Android versions get tested as they come out.
- **Gate features on the server version** when they need something from Home Assistant that older versions don't have, for example `server.version?.isAtLeast(2025, 6, 0)`.

## Modules

The modules are listed on the [Android overview](/companion/android/#the-repository). A few things worth knowing:

- Shared Gradle configuration lives in convention plugins in `build-logic`, an included build. If you need the same setting in several modules, it belongs there.
- `:common` holds everything the phone, car, and watch apps share, including all user facing strings in `common/src/main/res/values/strings.xml`. Only edit the English file: translations come from Lokalise. See [Translations](/translate/).
- `:automotive` has no sources of its own. It compiles the sources of `:app` with a different manifest and a higher minimum SDK.

Inside a module, code is packaged by feature: `sensors/`, `notifications/`, `settings/`, `onboarding/`, `widgets/`, `frontend/`, and so on.

## The tech stack

| Concern | What the app uses |
| --- | --- |
| UI | [Jetpack Compose](https://developer.android.com/compose), [Glance](https://developer.android.com/develop/ui/compose/glance) for widgets |
| Navigation | Navigation Compose with type-safe routes |
| Dependency injection | [Hilt](https://developer.android.com/training/dependency-injection/hilt-android) |
| Concurrency | [Kotlin coroutines](https://kotlinlang.org/docs/coroutines-overview.html) and Flow |
| WebSocket API | [OkHttp](https://square.github.io/okhttp/) |
| REST API | [Retrofit](https://square.github.io/retrofit/) |
| Serialization | Kotlinx.serialization |
| Database | [Room](https://developer.android.com/training/data-storage/room), for user data |
| App settings | SharedPreferences, behind a `LocalStorage` abstraction |
| Logging | [Timber](https://github.com/JakeWharton/timber) |

## Talking to Home Assistant

The app uses three channels:

- **The webhook** of the [`mobile_app` integration](/companion/mobile-app-api/), for sensor updates, location, and registration updates.
- **The WebSocket API**, kept open for real-time features like Assist, entity state in widgets, and notifications without Firebase.
- **The REST API**, for the rest.

Sensors are collected in the background and sent to Home Assistant by foreground services and workers.

## Wear OS

The Wear OS app is a separate app in `:wear`. It cannot onboard on its own: it gets the server URL and credentials from the phone app through the [Wearable Data Layer](https://developer.android.com/training/wearables/data/data-layer). That requires Google Play Services, so it only works with the `full` flavor of the phone app. After setup, the watch talks to Home Assistant directly, over the WebSocket API and its own webhook.

## Android Automotive and Android Auto

Android Auto runs from the phone app: it projects car screens from `:app` onto the car display. Android Automotive is a separate build, `:automotive`, that runs on the car itself. Both use the same sources.

## Deep links

The app handles `homeassistant://` links to open specific parts of the app. They are documented for users in the [URL handler documentation](https://companion.home-assistant.io/docs/integrations/url-handler/).

## Next

- [UI architecture](/companion/android/ui-architecture/): how a single screen is structured.
- [Best practices](/companion/android/best-practices/): the coding rules that come up in every review.

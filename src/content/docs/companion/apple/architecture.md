---
title: Apple architecture
description: How the Home Assistant Apple app is organized. The source folders, the shared code, the Current environment, and the rules every change follows.
sidebarLabel: Architecture
order: 2
---

The Apple app started as a web view with a few native extras, and grew into a hybrid codebase with native onboarding, sensors, widgets, App Intents, an Apple Watch app, CarPlay, and Live Activities. One repository builds all of it, for iOS, iPadOS, watchOS, and macOS through Mac Catalyst.

## The stack

- **Swift**, with SwiftUI for new UI. UIKit is still used for older screens and where Apple frameworks need it.
- **Xcode** with `HomeAssistant.xcodeproj`. Dependencies are Swift packages.
- **[Fastlane](https://fastlane.tools/)** for linting, testing, versioning, and distribution.
- **[WKWebView](https://developer.apple.com/documentation/webkit/wkwebview)** for the frontend, with a JavaScript message bus between the app and the frontend.
- **[WidgetKit](https://developer.apple.com/documentation/widgetkit)** and **[App Intents](https://developer.apple.com/documentation/appintents)** for widgets, controls, and Shortcuts.

Libraries you will run into most:

- [HAKit](https://github.com/home-assistant/HAKit): the Home Assistant API client, for the WebSocket and REST APIs.
- [GRDB.swift](https://github.com/groue/GRDB.swift): SQLite storage.
- [Alamofire](https://github.com/Alamofire/Alamofire): HTTP.
- [PromiseKit](https://github.com/mxcl/PromiseKit): promises in older code. New code uses async and await.
- [SFSafeSymbols](https://github.com/SFSafeSymbols/SFSafeSymbols): type-safe SF Symbols.
- [KeychainAccess](https://github.com/kishikawakatsumi/KeychainAccess): keychain storage.
- [XCGLogger](https://github.com/DaveWoodCom/XCGLogger): logging, through `Current.Log`.
- [ObjectMapper](https://github.com/tristanhimmelman/ObjectMapper): JSON mapping in older models.

## The source folders

| Folder | What is in it |
| --- | --- |
| `Sources/App` | The iPhone and iPad app: onboarding, settings, the web view, cameras, notifications, kiosk mode |
| `Sources/Shared` | Code every target shares: API and networking, the database, models, sensors, location, Assist, notifications, widgets support |
| `Sources/Extensions` | App extensions: widgets, App Intents, intents, share, notification service and content, push provider, and Matter |
| `Sources/Watch`, `Sources/WatchApp` | The Apple Watch app and its communication with the phone |
| `Sources/CarPlay` | CarPlay templates and actions |
| `Sources/MacBridge` | Mac specific code for the Catalyst build |
| `Sources/Thread` | Thread credential management and sharing |
| `Sources/Improv` | Setting up devices over Bluetooth with Improv |
| `Sources/PushServer` | The push relay server, a standalone Swift package |
| `Sources/SharedPush` | Parsing of push notification payloads. The push server keeps its own copy |
| `Sources/SharedTesting` | Helpers for tests |
| `Tests` | Unit, UI, snapshot, and widget tests |
| `Configuration` | Xcode build settings |
| `fastlane` | The Fastlane lanes |

The repository also has smaller modules in `Sources/`, like `HADesignSystem` and `HAModels`.

## Where code goes

A feature often appears in more places than the app. An entity action can show up in the app, a widget, the watch, a Shortcut, and CarPlay. Before you start, decide where the code belongs:

1. Logic that more than one target needs goes in `Sources/Shared`.
2. Code for one surface goes in that target, like `Sources/Extensions/Widgets` or `Sources/CarPlay`.
3. Most features start in `Sources/App`. Look there first to see how things are done.
4. Look at `Tests/App` and `Tests/Shared` for examples before you write new code.

Extensions run with tight limits and can't use every API the app can. Shared code must stay safe to use in an extension.

## The Current environment

The most important pattern in the codebase is the global `Current`, an `AppEnvironment` that holds every dependency: the date, the servers, the logger, the database, and much more. It follows the "World" pattern from Point-Free's [How to control the world](https://www.pointfree.co/blog/posts/21-how-to-control-the-world).

Production code reads from it:

```swift
let now = Current.date()
let server = Current.servers.all.first
Current.Log.info("Something happened")
```

Tests replace what they need:

```swift
Current.date = { Date(timeIntervalSince1970: 1_000_000) }
Current.servers = FakeServerManager()
```

Never assign to `Current` outside tests. A custom SwiftLint rule fails CI when you do.

## Rules for every change

These come from the project's own guidelines, and reviewers apply them to every pull request:

- **One type per file**, named after the type. Small private helpers nested inside the type are the only exception.
- **Every SwiftUI view has a `#Preview`.**
- **One title per screen.** A screen whose `List` starts with `AppleLikeListTopRowHeader` already shows its title in that header, so it doesn't also set `.navigationTitle`. Otherwise two titles stack up as the user scrolls.
- **A confirmation sits on its trigger.** Put `.confirmationDialog` on the `Button` that opens it, not on a parent `List`, `Section`, or other container. That keeps the dialog tied to its own control, so it can't fire from an unrelated one.
- **Beta-only features use `Current.isTestFlight`**, and nothing else: no build settings, `#if` branches, or hidden settings. Every pull request that puts a feature behind that gate comes with a second, draft pull request that removes the gate, branched off the first one and linked to it. Taking the feature out of beta is then one merge.
- **Sensors are opt in.** Nothing reports until the user turns the sensor on, and an app update never starts reporting something new. A sensor that can't be read right now is still listed, with the state `unavailable`. If it needs a permission, switching it on is what asks for it. Enabling is per server: a server you add starts with nothing enabled.

## Talking to Home Assistant

The app talks to Home Assistant in two ways, like the Android app:

- **The mobile app API.** During onboarding, `HomeAssistantAPI` (in `Sources/Shared/API/HAAPI.swift`) registers the app with the `mobile_app` integration. After that, sensors, location updates, and other device data go to the server over the webhook it gets back, through `WebhookManager`. The app registers with encryption support, and `WebhookPayloadCrypto` encrypts the payloads. The sensors live in `Sources/Shared/API/Webhook/Sensors`. See the [mobile app API](/companion/mobile-app-api/) for the server side of all of this.
- **The WebSocket and REST APIs**, through [HAKit](https://github.com/home-assistant/HAKit), for things like entity states and actions. Use it for new server calls, with `async` and `await`.

## Talking to the frontend

The web view loads the Home Assistant frontend and passes it an access token through external authentication, so the user doesn't log in twice. The app and the frontend exchange messages over the external bus, for example to open the native settings or scan a QR code. The frontend side is documented in [external authentication](/frontend/reference/external-auth/) and [the external bus](/frontend/reference/external-bus/).

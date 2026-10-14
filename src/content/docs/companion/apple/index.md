---
title: Apple
description: The Home Assistant app for iPhone, iPad, Mac, Apple Watch, and CarPlay. What is in the repository, and where to start.
order: 3
---

The Apple app brings Home Assistant to iPhone, iPad, Mac, Apple Watch, and CarPlay. Like the Android app, its center is a web view with the Home Assistant frontend. Around it, a lot is native: onboarding, settings, sensors, location, notifications and Live Activities, widgets and controls, App Intents and Shortcuts, the watch app and its complications, and CarPlay.

All of it lives in one repository, [home-assistant/iOS](https://github.com/home-assistant/iOS), written in Swift. The Mac app is built with Mac Catalyst from the same code.

## The repository

Everything lives in [home-assistant/iOS](https://github.com/home-assistant/iOS). It is one Xcode project, `HomeAssistant.xcodeproj`, with the source in a few main folders:

| Folder | What it is |
| --- | --- |
| `Sources/App` | The iPhone and iPad app |
| `Sources/Shared` | Code every target shares: the API, the database, sensors, notifications |
| `Sources/Extensions` | Widgets, App Intents, notifications, share, and Matter extensions |
| `Sources/Watch`, `Sources/WatchApp` | The Apple Watch app |
| `Sources/CarPlay` | CarPlay |
| `Sources/MacBridge` | Mac specific code for the Catalyst build |
| `Sources/PushServer` | The push relay server, a separate Swift package |
| `Tests` | Unit, UI, snapshot, and widget tests |

The full list is in [architecture](/companion/apple/architecture/#the-source-folders).

## Set up

- [Get started](/companion/apple/get-started/): install Xcode and the tools, set up signing, and run the app.

## Architecture

- [Architecture](/companion/apple/architecture/): how the code is organized, the `Current` environment that holds it together, and how the app talks to Home Assistant.
- [Targets](/companion/apple/targets/): the app, the extensions, the watch, CarPlay, and the Mac, and what a change can affect.

## Write code

- [Code style](/companion/apple/code-style/): SwiftFormat, SwiftLint, and the conventions of the project.

## Test

- [Testing](/companion/apple/testing/): unit, snapshot, UI, and end-to-end tests, and the patch coverage gate.

## Ship

- [Submit a pull request](/companion/apple/submitting/): the checklist, the template, and the review.
- [Continuous integration](/companion/apple/ci/): what runs on your pull request, and what happens after a merge.
- [Releases](/companion/apple/releases/): from a merged pull request to App Store Connect, and Mac releases on GitHub.

## Translate

The text of the app is translated on Lokalise, in its own iOS project. You don't need a Mac or Xcode for that. See [your first translation](/translate/first-contribution/).

## Who to talk to

- The **#apple-apps** channel on the [Home Assistant Discord](https://www.home-assistant.io/join-chat). Pick the developer role under **Channels & Roles** first.
- [Issues](https://github.com/home-assistant/iOS/issues) in the iOS repository, for bugs and feature requests.
- Want to test new features early? Join the [TestFlight beta](https://www.home-assistant.io/ios/beta/).
- For how the app works for users, see the [companion app documentation](https://companion.home-assistant.io/).

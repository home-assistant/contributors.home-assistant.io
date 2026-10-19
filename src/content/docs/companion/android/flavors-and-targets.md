---
title: Android flavors and targets
description: The full and minimal flavors, and the phone, Android Automotive, Wear OS, and TV builds of the Android app.
sidebarLabel: Flavors and targets
sidebarGroup: Architecture
order: 4
---

The Android app is built for several devices, and in two flavors. A change to shared code can end up in all of them, so it helps to know what each one is.

## Flavors

The `:app` and `:automotive` modules come in two flavors. The `:wear` module has no flavors.

| | `full` | `minimal` |
| --- | --- | --- |
| Google Play Services | Yes | No |
| Application ID | `io.homeassistant.companion.android` | `io.homeassistant.companion.android.minimal` |
| Location tracking for [presence detection](https://www.home-assistant.io/getting-started/presence-detection/) | Yes | No |
| Push notifications | Through Firebase, and over the WebSocket | Over the WebSocket only, see [local push](https://companion.home-assistant.io/docs/notifications/notification-local) |
| Wear OS app | Yes | No |
| Crash reporting | Yes | No |
| Distributed through | Google Play | F-Droid, the APK on GitHub, Meta Quest, and Android Automotive builds for car makers |

Debug builds add `.debug` to the application ID, so they install next to the release app.

The `minimal` flavor exists for people who prefer, or need, an app without Google Play Services, like owners of devices that don't have them.

Keep as much code as possible in the `main` source set, so users of both flavors get the feature. When there is a choice, the project prefers open source solutions. Only code that needs Google Play Services goes in the `full` source set, with a `minimal` counterpart. If an open source alternative to a Play Services feature becomes viable, it can move to `minimal` too.

## Targets

| Target | Module | Minimum SDK |
| --- | --- | --- |
| Phone and tablet | `:app` | `androidSdk-min` |
| Android Automotive | `:automotive` | `androidSdk-automotive-min` |
| Wear OS | `:wear` | `androidSdk-wear-min` |

The versions are in `gradle/libs.versions.toml`.

### Phone and tablet

The main app, used by most people. Android Auto is part of it: the phone projects the car screens to the car display.

### Android Automotive

The app that runs on the car itself. It compiles the sources of `:app` with its own manifest. The automotive APIs only exist from API 29, so its minimum SDK is higher.

### Wear OS

A separate app, but not standalone: it needs the phone app to onboard and to get the server credentials. After that, it talks to Home Assistant directly.

### Android TV

The phone app installs on Android TV, but there is no dedicated module, and navigation with a remote is not great. A better TV experience would need its own module and navigation support.

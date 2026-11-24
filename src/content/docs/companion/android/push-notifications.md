---
title: Push notifications on Android
description: Set up your own Firebase project and push service, for when you work on notifications delivered through Firebase Cloud Messaging.
sidebarLabel: Push notifications
sidebarGroup: Set up
order: 2
---

The `full` flavor receives notifications through Firebase Cloud Messaging (FCM). Home Assistant sends a notification to a push service of the project, which hands it to FCM, which delivers it to the phone. The [mobile app API](/companion/mobile-app-api/notifications/) describes that contract.

You only need your own setup if you work on that path. For everything else, the mock Firebase file from [get started](/companion/android/get-started/#3-add-a-firebase-configuration) is enough, and notifications still reach the app over the WebSocket connection. That is also how the `minimal` flavor gets its notifications.

> [!TIP]
> Setting up FCM takes some effort. If you can test your change with WebSocket notifications, do that.

## Set up your own FCM project

1. Create a project in the [Firebase console](https://console.firebase.google.com).
2. Add an Android app to the project for each of these application IDs:
   - `io.homeassistant.companion.android`
   - `io.homeassistant.companion.android.debug`
   - `io.homeassistant.companion.android.minimal`
   - `io.homeassistant.companion.android.minimal.debug`
3. Create the default Cloud Firestore database in your Firebase project. The push service keeps its rate limits there, unless you configure it to use Valkey instead.
4. Deploy the push service from [home-assistant/mobile-apps-fcm-push](https://github.com/home-assistant/mobile-apps-fcm-push) to your Firebase project.
5. Point the app at your service. Add the URL of the deployed `androidV1` function to `gradle.properties` in your Gradle user home (`~/.gradle/gradle.properties`), not the one in the repository:

   ```properties
   homeAssistantAndroidPushUrl=https://push.example.com/api/sendPush/android/v1
   ```

   Optionally, also point the rate limit check at your service:

   ```properties
   homeAssistantAndroidRateLimitUrl=https://push.example.com/api/checkRateLimits
   ```

   Without these overrides, the app uses the project's own push service, set in the `gradle.properties` of the repository.

6. Download `google-services.json` from your Firebase project and put it in `app/`, `automotive/`, and `wear/`.

The `google-services.json` file must contain clients for all four application IDs. If one is missing, FCM does not work for that build, and only WebSocket notifications arrive.

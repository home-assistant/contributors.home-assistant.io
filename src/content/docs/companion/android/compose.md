---
title: Compose and the design system
description: Build Android UI with Jetpack Compose, HATheme, and the `HA*` components. Previews, the Compose catalog, widgets, and navigation.
sidebarLabel: Compose and design system
sidebarGroup: Write code
order: 1
---

All new UI in the Android app is [Jetpack Compose](https://developer.android.com/compose). No new XML layouts, data binding, or view binding. New widgets use [Jetpack Glance](https://developer.android.com/develop/ui/compose/glance); the old RemoteViews widgets are not extended anymore.

## The design system

The app has its own design system on top of Material 3, in `:common` under `io.homeassistant.companion.android.common.compose`:

- **`HATheme`** applies the Home Assistant colors in light and dark mode. Apply it once in `setContent`, not inside your screen composable.
- **`HA*` components**, like `HAAccentButton`, `HAFilledButton`, `HATextField`, `HACheckbox`, `HASwitch`, `HALoading`, `HADropdownMenu`, and `HAModalBottomSheet`. They live in the `composable` package next to the theme. Use them instead of Material components.
- **`LocalHAColorScheme.current`** for colors. Never hard-code a color.
- **`HATextStyle`** for typography, and **`HADimens.SPACE*`** for spacing and sizes. No magic numbers in padding.

Raw Material 3 components get the wrong colors in light or dark mode. If the `HA*` wrapper you need doesn't exist yet, create it first, in its own pull request, with screenshot tests and a page in the Compose catalog.

> [!NOTE]
> You will also find `HomeAssistantAppTheme`, a theme based on Material 2. It is deprecated, and only kept until the remaining screens that use it are migrated. Don't use it for new UI, and don't mix Material 2 and Material 3 in one screen.

### The Compose catalog

Debug builds include a catalog of all `HA*` components. Open it from the [developer playground](/companion/android/debugging/#the-developer-playground) with **Start HA Compose Catalog**. Check it before you build something new.

## Writing a screen

Follow the [UI architecture](/companion/android/ui-architecture/): a stateful screen that collects the ViewModel state, and a stateless content composable that renders it. That is [state hoisting](https://developer.android.com/develop/ui/compose/state-hoisting), and it keeps your composables reusable and easy to preview. On top of that:

- **Keep composables small.** Split a large screen into small private composables, and move them to their own file when a file grows.
- **Pass only what a composable needs**, not the whole state.
- **No logic in the UI.** No sorting, filtering, or mapping in a composable. The state carries display-ready data. If you must compute something during composition, `remember` it.
- **Name files after the component**, like `SettingsScreen.kt` or `UserCard.kt`. The stateless layer is `*Screen` or `*Content`. `*View` is legacy.
- **Accessibility**: set a semantic `Role` on custom clickable rows, like `Modifier.clickable(role = Role.Checkbox)`, and give images a content description.
- **Errors and feedback** go in a snackbar, not a toast.
- **Text** comes from `stringResource(R.string.*)`, with the strings in `common/src/main/res/values/strings.xml`.

## Previews

Add a `@Preview` for every major composable, wrapped in `HAThemeForPreview`, which also draws the right background:

```kotlin
@Preview
@Composable
private fun SettingsScreenPreview() {
    HAThemeForPreview {
        SettingsScreenContent(
            uiState = SettingsUiState.Default,
            onToggleSetting = {},
        )
    }
}
```

Previews are the quickest way to iterate: no build, no server, no onboarding. Add several, for each meaningful state, for light and dark mode, and for different screen sizes. Screenshot tests render the same composables, so a good preview is halfway to a [screenshot test](/companion/android/screenshot-testing/).

Once the app runs, Compose live edit and hot reload in Android Studio show many changes without a rebuild. Structural changes still need one.

## Navigation

The app uses Navigation Compose and is moving to one activity with one navigation graph, built from feature subgraphs. New screens go in the graph; old activities are migrated over time.

Use type-safe routes:

```kotlin
@Serializable
data class FeatureRoute(val value: Int)

fun NavGraphBuilder.featureNavGraph(navController: NavController) {
    composable<FeatureRoute> {
        FeatureScreen(
            value = it.toRoute<FeatureRoute>().value,
            onNavigateBack = { navController.popBackStack() },
        )
    }
}
```

Navigation needs tests, including the back stack.

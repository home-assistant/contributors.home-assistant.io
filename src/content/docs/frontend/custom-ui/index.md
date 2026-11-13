---
title: Custom cards and more
description: Build cards, card features, badges, views, dashboard strategies, and panels that people load into their own Home Assistant, without changing the frontend.
order: 30
sidebarLabel: Custom cards and more
---

The built-in cards cover a lot, but not everything. You can add your own building blocks to the interface without touching the [frontend repository](https://github.com/home-assistant/frontend): write a JavaScript file, load it into Home Assistant, and use it like a built-in one. Thousands of community cards are made this way.

## What you can build

| What | Where it shows up | Page |
| --- | --- | --- |
| [Card](/glossary/card/) | On a dashboard, next to the built-in cards | [Custom cards](/frontend/custom-ui/card/) |
| [Card feature](/glossary/card-feature/) | Inside a tile card, or another card that supports features | [Custom card features](/frontend/custom-ui/card-feature/) |
| [Badge](/glossary/badge/) | At the top of a view | [Custom badges](/frontend/custom-ui/badge/) |
| [Strategy](/glossary/strategy/) | Generates a whole dashboard, a view, or a section from code | [Custom strategies](/frontend/custom-ui/strategy/) |
| [View](/glossary/view/) layout | Arranges the cards of a view in your own way | [Custom views](/frontend/custom-ui/view/) |
| [Panel](/glossary/panel/) | A full page of its own, with a link in the sidebar | [Custom panels](/frontend/custom-ui/panel/) |

## How it works

Every one of them is a [custom element](https://developer.mozilla.org/docs/Web/API/Web_components/Using_custom_elements): a JavaScript class registered under a tag name. Home Assistant creates the element, sets properties on it, like `hass` and the configuration, and puts it on the page. What the element renders is up to you.

1. **Write the element** in a JavaScript module, and register it with `customElements.define()`.
2. **Load the module** into Home Assistant as a [dashboard resource](/frontend/custom-ui/resources/). Panels are loaded by their own configuration instead.
3. **Use it** in a dashboard with the `custom:` prefix, like `type: custom:my-card`.

To make it easy to find, you can also register your element so it shows up in the card picker, the feature picker, or the new dashboard dialog, with a visual editor for its options.

## Which tools to use

You can use any library that produces a standard custom element, or none at all. The examples on these pages use plain JavaScript, so you can copy them and see them work without a build step.

For anything bigger, [Lit](https://lit.dev/) is a good choice: it is what the frontend itself uses, so the patterns on the [architecture](/frontend/architecture/) pages carry over. Bundle your own copy of Lit, or any other library, into your module.

The frontend has no public component library for custom cards. Nothing in the frontend repository lists `ha-*` elements as supported, or promises that they stay the same. They are loaded only when the frontend needs them, and they can change in any release. If your card depends on one, it can break without warning.

`ha-card` is the one exception in practice, not on paper. It is the container of the built-in cards, it takes the card theme variables like `--ha-card-background` and `--ha-card-border-radius`, and most custom cards wrap their content in it, as the [custom card example](/frontend/custom-ui/card/) does. Use it so your card fits in, but know it carries the same lack of promise as the rest. For anything else, like a picker or a form field, build or bundle your own. To show a built-in card or one of the standard dialogs inside your card, use the [card helpers](/frontend/custom-ui/card/#card-helpers), which the frontend loads for custom cards on purpose.

## Shared concepts

- **`hass`**: the object with the full state of Home Assistant. Your element gets a new one on every change. The [hass object reference](/frontend/reference/hass-object/) lists what is in it.
- **`setConfig(config)`**: called with the YAML configuration of your card, badge, or feature. Throw an error when the configuration is invalid, and Home Assistant shows it to the user.
- **The `custom:` prefix**: separates your elements from the built-in ones. Your element `my-card` is used as `type: custom:my-card`.

## Design

A custom card looks best when it fits in with the built-in ones. Use the [theme variables](/frontend/architecture/theming/), like `--card-background-color` and `--primary-text-color`, so your card follows the theme and dark mode of the user. The [dashboard](/design/dashboards/) pages of the Design area explain how the built-in cards are designed, and why.

## Share it

To publish what you built, so others can install it from the Marketplace, see [dashboard cards and plugins](/marketplace/guides/dashboard/). To let people try your card on a web page first, see [live demos](/frontend/custom-ui/demo/).

Think your card belongs in the frontend itself? The project recommends that you publish a new card in the [Marketplace](/marketplace/) first. You gain experience, and you can iterate faster. Once it has matured and has a user base, reach out to the maintainers, for example in the **#frontend** channel on [Discord](https://www.home-assistant.io/join-chat/), to see whether it should ship built in.

---
title: Frontend
description: The web interface of Home Assistant. How it is built, how to work on it, and how to extend it with your own cards, panels, and dashboards.
---

The frontend is everything people see and touch in Home Assistant: dashboards, the settings pages, the automation editor, the more-info dialog, and every other screen. The same code runs in a browser, in the [companion apps](/glossary/companion-app/), and on a wall tablet in someone's hallway. It lives in its own repository: [home-assistant/frontend](https://github.com/home-assistant/frontend).

It is a TypeScript application, built from web components with [Lit](https://lit.dev/). It talks to [Home Assistant Core](/glossary/core/) over a WebSocket connection, and keeps itself in sync as things change in the home.

## Who this area is for

- **Frontend contributors** who want to fix a bug, polish a screen, or build a new feature in the frontend itself.
- **Integration developers** whose backend change needs something new in the interface, like a more-info view or a WebSocket command.
- **Third-party developers** who build [custom cards](/glossary/custom-card/), card features, badges, dashboard strategies, or panels that people install on their own.
- **Companion app developers** who embed the frontend in a native app.

You need to know your way around TypeScript or JavaScript, HTML, and CSS. Lit and web components are easy to pick up as you go.

## Fast, and everywhere

The frontend is a progressive web app, designed mobile first. It has to be fast on a budget Android phone with little memory, and it has to keep working on an old tablet that stopped getting updates years ago. To do both, every release ships two builds:

- **Modern**: for browsers released in the last two years. Little transpilation, few polyfills, as fast as it gets.
- **Legacy**: for older browsers, down to the floors pinned in [`.browserslistrc`](https://github.com/home-assistant/frontend/blob/dev/.browserslistrc), like Safari 12 on old iPads and Chrome 59 on old Fire tablets.

Home Assistant serves each browser the build it can run. Keep both in mind when you add a dependency or a new browser API.

## Start here

- [Your first frontend contribution](/frontend/first-contribution/): set up the environment, pick an issue, and open a pull request.
- [Custom cards and more](/frontend/custom-ui/): build your own card for your dashboard. No development environment needed: a JavaScript file in your Home Assistant is enough to start.
- [Open a pull request](/frontend/development/pull-requests/): what your pull request needs before it gets reviewed.
- [Review and release](/frontend/development/review-and-release/): what happens to your pull request, and how it reaches users.

## Guides and reference

- [Development](/frontend/development/): the development environment, running the frontend, the gallery and the demo, coding guidelines, and tests.
- [Architecture](/frontend/architecture/): how the frontend is put together. Lit and the `ha-*` components, the `hass` object and contexts, the data layer, translations, theming, routing, and panels.
- [Custom cards and more](/frontend/custom-ui/): build cards, card features, badges, views, strategies, and panels that people load into their own Home Assistant.
- [Extend the frontend](/frontend/extending/): add a more-info view or a state card for a domain, or a WebSocket command for your integration.
- [Reference](/frontend/reference/): commands, the `hass` object, external authentication, and the external bus used by the companion apps.

## Related areas

- [Design](/design/): the principles and foundations behind the interface. The [components](/design/components/), [dashboard cards](/design/dashboards/), and [more-info views](/design/more-info/) each have a page there, for designers and developers alike, with live examples and the code side of each one.
- [Translations](/translate/): the frontend's English text is translated by the community. [Make your strings translatable](/translate/guides/developers/) explains how to write strings that translators can work with.
- [Core and integrations](/core/): the backend the frontend talks to.
- [Companion apps](/companion/): the Android and iOS apps that wrap the frontend.

## Who to talk to

- The **#frontend** channel on the [Home Assistant Discord](https://www.home-assistant.io/join-chat/) is the place for questions about the frontend. Can't see the channel? Under **Channels & Roles**, choose **I want to contribute dev skills to Home Assistant**.
- Bugs in the interface and pull requests live in the [frontend repository](https://github.com/home-assistant/frontend). Ideas for new features go to [GitHub discussions](https://github.com/orgs/home-assistant/discussions).
- Design and UX questions go to the [UX design discussions](https://github.com/OpenHomeFoundation/ux-design/discussions), or the **#designers** channel on Discord. Product and UX discussions happen in **#product-and-ux**.

When you ask for help, push your work to a branch and share the link. People help you much faster when they can see the code.

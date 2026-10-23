---
title: Development
description: Everything you need to work on the frontend itself. The environment, running it, the gallery and the demo, coding guidelines, tests, and review.
order: 10
---

These pages are for working on the [frontend repository](https://github.com/home-assistant/frontend): fixing bugs, improving screens, and adding features. Building a card or panel that people install on their own does not need any of this. For that, see [Custom cards and more](/frontend/custom-ui/).

## The tools

The frontend is written in TypeScript with [Lit](https://lit.dev/), and bundled with [Rspack](https://rspack.dev/). [pnpm](https://pnpm.io/) manages the dependencies. Tests run with [Vitest](https://vitest.dev/) and [Playwright](https://playwright.dev/). All the commands you need are scripts in `package.json`, so you run them with `pnpm`.

## Pages

- [Set up the environment](/frontend/development/environment/): with the devcontainer, or on your own machine.
- [Run the frontend](/frontend/development/run/): against a development Home Assistant, or against one you already have.
- [The gallery and the demo](/frontend/development/gallery-and-demo/): work on components and dashboards without a Home Assistant at all.
- [Coding guidelines](/frontend/development/guidelines/): how frontend code is written, and what reviewers look for.
- [Linting and tests](/frontend/development/testing/): the checks to run before you open a pull request.
- [Builds](/frontend/development/builds/): make a production build, and try out someone else's pull request on a real Home Assistant.
- [Open a pull request](/frontend/development/pull-requests/): what your pull request needs before it gets reviewed.
- [Review and release](/frontend/development/review-and-release/): what happens to your pull request, and how it reaches users.

All commands and ports in one place: [Commands](/frontend/reference/commands/).

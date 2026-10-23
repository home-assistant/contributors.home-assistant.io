---
title: Your first frontend contribution
description: Set up the frontend, run it against a Home Assistant instance, make a small change, and open your first pull request.
order: 1
sidebarLabel: Your first contribution
---

The quickest way into the frontend is a small, visible fix: a misaligned icon, a label that is cut off, a button that does nothing on mobile. You see the result in your browser the moment you save, and a reviewer can judge it from a screenshot.

## 1. Find something to work on

Browse the [`good first issue` label](https://github.com/home-assistant/frontend/labels/good%20first%20issue) in the frontend repository, or the [open bugs](https://github.com/home-assistant/frontend/issues). A bug you ran into yourself is a great first topic, because you already know how to reproduce it.

Leave a comment that you are working on it, so nobody else picks it up at the same time.

> [!TIP]
> Want to build a new card instead? That does not need any of the steps below. Start with [Custom cards and more](/frontend/custom-ui/), and publish it in the [Marketplace](/marketplace/): that is where the project recommends a new card starts.

## 2. Set up the environment

The easiest setup is Visual Studio Code with the devcontainer of the frontend repository. It installs the right Node.js and pnpm for you.

1. [Fork the frontend repository](https://github.com/home-assistant/frontend/fork) on GitHub.
2. Clone your fork and open it in Visual Studio Code.
3. When Visual Studio Code asks, select **Reopen in Container**. The first start takes a few minutes while the dependencies install.

Prefer to work without a container? [Set up the environment](/frontend/development/environment/) covers both.

## 3. Run it

You need a Home Assistant instance to talk to. Inside the devcontainer you can run one next to the frontend:

1. Open a terminal and start Home Assistant Core. The first run installs the `dev` branch of Core and creates a configuration with demo entities:

   ```shell
   script/core
   ```

2. Open a second terminal and start the frontend development server:

   ```shell
   pnpm dev
   ```

3. Wait for `Build done`, then open `http://localhost:8124` on your computer and create a user.

Already have a Home Assistant at home? You can also point the development frontend at that. [Run the frontend](/frontend/development/run/) explains both ways.

## 4. Make your change

Create a branch, make your change, and save. The development server rebuilds, and a refresh of the browser shows the result.

A few things reviewers look for, even in a small fix:

- All text people see comes from `src/translations/en.json`, never hardcoded in the code.
- Use the existing `ha-*` components and theme variables, not new colors or one-off controls.
- Check your change on a narrow screen, and in the dark theme.

The [coding guidelines](/frontend/development/guidelines/) have the details.

## 5. Check your work

Run the linters and the unit tests before you push:

```shell
pnpm lint
pnpm test
```

A pre-commit hook already formats the files you commit, so most style issues fix themselves.

## 6. Open a pull request

Push your branch to your fork and open a pull request against the `dev` branch. Fill in the pull request template completely: describe the change from the point of view of the people using it, check exactly one **Type of change**, and add before and after screenshots for anything visual. A check fails the pull request when the template is missing or incomplete. [Open a pull request](/frontend/development/pull-requests/) has the details.

Then expect questions. Reviewers may ask you to change things, and that is normal. [Review and release](/frontend/development/review-and-release/) explains what happens next.

## What is next

- Read the [architecture overview](/frontend/architecture/) to see how the pieces fit together.
- Look at the [components](/design/components/) before you build something new. Reusing an existing one is almost always better.
- Help review: test someone else's pull request and leave your findings. It speeds things up for everyone, yours included.

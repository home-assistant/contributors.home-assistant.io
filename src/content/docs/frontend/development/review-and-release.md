---
title: Review and release
description: What happens to a frontend pull request after you open it, and how a merged change reaches the people using Home Assistant.
order: 8
---

Opening a pull request is the start of a conversation, not the end of your work. This page explains what reviewers look at, which checks run, and how your change ends up in a release.

## Before review

A few things happen automatically when you open a pull request against `dev`:

- **The template check.** The pull request must use the [template](https://github.com/home-assistant/frontend/blob/dev/.github/PULL_REQUEST_TEMPLATE.md) and keep its **Proposed change**, **Type of change**, and **Checklist** sections, check exactly one **Type of change**, and describe the change under **Proposed change**. If it does not, the pull request gets the `Needs Template` label and a comment, and the check fails until you fix it. Drafts are skipped, so the check runs when you mark the pull request ready for review.
- **Labels.** A bot labels the pull request by the files it changes, like `Dashboards`, `Automations`, or `Tests: Unit`. A second script adds `Companion App`, `Home Assistant Link`, `Labs`, and `Supervisor` when the change touches those parts of the code, even from outside their folders. Both remove a label again once it no longer matches, also one that was added by hand. The rules are in [`.github/labeler.yml`](https://github.com/home-assistant/frontend/blob/dev/.github/labeler.yml) and [`.github/scripts/label-content.mts`](https://github.com/home-assistant/frontend/blob/dev/.github/scripts/label-content.mts).
- **The CLA.** The first time you contribute, a bot asks you to sign the contributor license agreement.
- **CI.** Linters, type checks, unit tests, a production build, and the end-to-end tests run on every push. They need to pass before your pull request can be merged.

Keep a pull request to one change. If you find yourself checking two **Type of change** boxes, split it. Small pull requests get reviewed faster.

## What reviewers look at

Frontend maintainers review every pull request. Besides "does it work", they check:

- **Behavior in every state.** Loading, error, unavailable, missing entities, and transitions in both directions. Not just the happy path.
- **Existing patterns.** Shared `ha-*` components, existing helpers, and theme variables instead of a parallel implementation.
- **Text.** All user-facing text is translatable, in sentence case, and uses the right terms.
- **Accessibility.** Keyboard navigation, focus, labels, and touch targets.
- **Narrow screens and right-to-left languages.** The frontend runs on phones, and in languages written from right to left.
- **Cleanup.** Event listeners, timers, and subscriptions are removed when a component goes away.

The [coding guidelines](/frontend/development/guidelines/) cover these in more detail.

### Screenshots and the design gallery

For any visible change, add before and after screenshots or a short video to the pull request. Reviewers judge a lot from those.

A change to a component that has a page in the gallery should update that page too. Maintainers can add the `needs design preview` label, which deploys a preview of the gallery for your pull request. The published design guidance lives in the [Design](/design/components/) area of this site: when the component has a page there, update it with a pull request to [this site](https://github.com/home-assistant/contributors.home-assistant.io).

### Changes that need design input

New cards, badges, screens, and interaction patterns are design decisions as much as code. When the direction is not settled, a reviewer adds the `Needs UX` label and asks the design team for input. That can take a while. Discussing a bigger idea in the [UX design discussions](https://github.com/OpenHomeFoundation/ux-design/discussions) before you write the code saves you a rewrite. The [Design](/design/how-we-design/) area explains how that works.

### Changes that need the backend

When your change depends on a pull request in Core, link it in the template. The frontend change waits until the backend change is merged. The labels `wait for backend` and `backend merged` track that.

### Pull requests that go quiet

A pull request without any activity for 90 days gets the `stale` label and a comment. If nothing happens in the 7 days after that, it is closed. Any update removes the label again. Maintainers can exempt a pull request with the `no-stale` label. Issues follow the same timing, except those labeled as a feature request or help wanted.

## AI tools

You can use AI tools to help you write code. You are responsible for the result: you must understand every change you submit and be able to explain it yourself. Pull requests or comments that look like unreviewed AI output are closed. The [Open Home Foundation AI policy](https://github.com/home-assistant/frontend/blob/dev/AI_POLICY.md) has the details.

## Help review

The pull request template asks you to review two other pull requests. It is not a formality. Every review, even "I tested this on my phone and it works", lightens the load on maintainers and shortens the queue your own pull request is in.

## From merge to release

The frontend is released as a Python package, `home-assistant-frontend`, which Home Assistant Core installs as a requirement of its `frontend` integration. Versions are dates, like `20260930.0`.

1. **Merged into `dev`.** Your change is in the next release. Every night a development build is made from `dev`.
2. **Beta.** When the beta of a new Home Assistant release starts, the changes in `dev` go to the `rc` branch, the release candidate. A new frontend version is cut and tagged there, and Core bumps its requirement to it.
3. **Fixes.** Bug fixes needed in the beta, or in a patch release after it, are cherry-picked onto `rc` by maintainers, and released and tagged there as `.1`, `.2`, and so on. Those pull requests get the `cherry-picked` label.
4. **Release.** On release day, `rc` is merged into `master`, and your change ships with the next Home Assistant release.

The [Releases](/releases/) area explains the release cycle of Home Assistant as a whole.

### Documentation and backward-incompatible changes

If your change adds or changes something users configure, update the user documentation on [home-assistant.io](https://github.com/home-assistant/home-assistant.io) and link that pull request in the template. [Writing docs](/writing/) explains how.

If your change breaks something for existing users, like a removed card option, fill in the **Breaking change** section of the template. That text goes into the release notes, so write it for users: what breaks, how to fix it, and why.

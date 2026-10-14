---
title: Submit an Android pull request
description: The checklist, the pull request template, the in-app changelog, and what happens during review in the Android repository.
sidebarLabel: Submit a pull request
sidebarGroup: Ship
order: 1
---

Your change works on your machine. Now it needs a pull request, a review, and a merge. This page covers what reviewers expect, so the review goes smoothly.

## Before you open it

- **Format and test.** Run `./gradlew :build-logic:convention:ktlintFormat ktlintFormat` and `./gradlew test`. See [code style and linting](/companion/android/code-style/) for the other checks.
- **Build everything.** Shared code ends up in the phone, car, and watch apps. Check that `:app`, `:automotive`, and `:wear` still build.
- **Add tests** for the behavior you changed. See [testing](/companion/android/testing/).
- **Follow the guidelines**: [best practices](/companion/android/best-practices/), [UI architecture](/companion/android/ui-architecture/), and [Compose and the design system](/companion/android/compose/).
- **Keep it small.** One idea per pull request. Big reworks go behind a `WIPFeature` flag in small steps, see [ship big changes in small steps](/companion/android/best-practices/#ship-big-changes-in-small-steps).
- **Read the [AI policy](/start/ai-policy/).** You can use AI tools, but you must understand and be able to explain every line you submit. Pull requests from autonomous agents are closed.

## The pull request

Create the pull request from your fork against `main`, as described in the [GitHub documentation](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork). GitHub fills in the template. Don't delete anything from it, unless the template tells you to, like a section that doesn't apply to your change. Fill out:

- **Summary**: what you changed, why, and what it means for users. Link related issues.
- **Checklist**: tests, code style, edge cases, backward compatibility, and the AI policy. Backward-incompatible changes go in the changelog for users, or in the code for developers, depending on who they affect. Also select exactly one of the options that describe how you used AI.
- **Screenshots**: for UI changes outside the frontend, in light and dark mode.
- **Documentation**: if your change adds, changes, or removes something users see, open a pull request in the [user documentation](https://github.com/home-assistant/companion.home-assistant) and link it. Mark the new feature there with `<span class='beta'>BETA</span>`, until it reaches production. If it changes something developers rely on, like how to build, test, or release the app, the template also asks for a pull request that updates the developer documentation.

### The changelog

If your change adds a feature, visibly changes behavior for users, or breaks something they rely on, add it to the in-app changelog in `app/src/main/kotlin/io/homeassistant/companion/android/changelog/ChangelogContent.kt`. Small bug fixes don't need their own entry: the standing "Bug fixes and dependency updates" entry covers them.

`ChangelogContent.kt` holds the entries, grouped in new, improved, and fixed, each with the platforms it applies to. The text of each entry is a string in `common/src/main/res/values/strings_changelog.xml`, so it gets translated. A screenshot test renders the real changelog, so a changelog change also needs updated [screenshot references](/companion/android/screenshot-testing/).

## Draft pull requests

Open a draft when you want early feedback on direction, but the work isn't done. This is also useful when you work on changes to CI itself. Be careful with CI, though: each push runs the full pipeline, which takes a lot of resources. Don't open a pull request, draft or not, before there is something to look at. Push to your fork as often as you like.

If this is your first contribution, a maintainer has to approve each CI run before it starts.

## Review

Anyone can review a pull request, and you are welcome to. Even a ten-minute review helps. Not comfortable reviewing code? Install the APK from the pull request, and report what you find: bugs, crashes, or UI and UX feedback. See [test a pull request build](/companion/android/get-started/#test-a-pull-request-build).

For a merge, a maintainer has to approve. Be patient and kind. Their feedback comes as comments with requested changes, or as questions. Answer questions in your own words, not with AI output.

When you have addressed the feedback and CI is green, ask for another review.

## Keep your branch up to date

If your branch falls behind `main` or has conflicts, you can either merge `main` into your branch and [resolve the conflicts](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/addressing-merge-conflicts/resolving-a-merge-conflict-using-the-command-line), or [rebase](https://docs.github.com/en/get-started/using-git/about-git-rebase) on it:

- **Not reviewed yet**: merge or rebase, your choice.
- **Already reviewed**: merge. A rebase can break existing review comments and lose that feedback.

The repository uses [squash and merge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/about-pull-request-merges#squash-and-merge-your-commits), so your branch history doesn't need to be tidy.

## Merging

Once everything is green and a maintainer approves, they merge it. You don't have to do anything. Your change goes to internal testers right away, and to the beta the next weekend. See [releases](/companion/android/releases/).

## Stale pull requests

A bot marks a pull request as stale after 30 days without activity, and an issue after 90 days. If nothing happens in the next 7 days, it closes them. Anything labeled `under investigation` or `Help wanted` is exempt.

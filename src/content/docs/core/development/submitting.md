---
title: Submitting a pull request
description: What is specific to pull requests for Home Assistant Core, from branches and commit messages to the template, new integrations, and dependency updates.
sidebarGroup: Pull requests
order: 2
---

Changes go into Home Assistant Core through [pull requests](/glossary/pull-request/) on GitHub, against the `dev` branch. How pull requests work in every Home Assistant repository, from keeping them small to waiting for a review, is on [pull requests and reviews](/start/pull-requests/). Read that first. This page adds what is specific to core.

## Before you open it

- Base your branch on the latest `dev`. See [keeping your branch up to date](/core/development/catching-up/).
- Go through the [development checklist](/core/development/checklist/).
- Run the tests and the [linters](/core/development/checks/).
- Actually run Home Assistant with your change, and try it. Code that could never have worked is a waste of everyone's time, including yours.
- For a change in how core works, check the [architecture decisions](https://github.com/home-assistant/architecture/tree/master/adr). If it needs a new decision, start a [discussion](https://github.com/home-assistant/architecture/discussions) before you write the code.

## Commit and push

Work on a branch of its own for every pull request, never on `dev`:

```shell
git fetch upstream
git checkout -b add-battery-sensor upstream/dev
```

When your change is ready, commit and push it to your fork:

```shell
git add .
git commit -m "Add battery sensor to Example"
git push -u origin HEAD
```

The `-u` makes the branch on your fork the default for this branch. Without it, your branch keeps following `upstream/dev`, and a later plain `git push` or `git pull` goes to the wrong place.

A good commit message:

- Says what the change does, not "Update" or "Fix"
- Uses the imperative: "Add battery sensor", not "Adds battery sensor"
- Starts with a capital letter, and does not end with a period
- Has no prefix like `[example]` or `sensor:`

The Git hooks run when you commit, and can change files outside the folder of your integration. Those changes belong in your pull request too.

## Open the pull request

On GitHub, open a pull request from your branch against the `dev` branch of [home-assistant/core](https://github.com/home-assistant/core). Then fill in the template. Do not remove anything from it, including the boxes you do not check.

- **Breaking change**: if your change breaks something for existing users, explain what breaks, how to fix it, and why. This text goes into the release notes, so write it for users, not for developers. Remove the section if nothing breaks.
- **Proposed change**: explain *why*, not only what. Reviewers need the reason to judge the solution.
- **Type of change**: check exactly one box. If more than one fits, your pull request does too much: split it. A bot uses this box to label your pull request.
- **Additional information**: link the issue you fix with `fixes #12345`, and the pull requests for the documentation or frontend.
- **Checklist**: go through it honestly.

On your first pull request, a bot asks you to sign the Contributor License Agreement. Your pull request cannot be merged before that is done. If your GitHub account is new, CI also waits until a maintainer approves the run.

## Once the pull request is open

Do not amend, squash, or rebase commits that you already pushed, once the pull request is open. Reviewers need to follow the history, and see what changed since they last looked. Add new commits instead, and bring in changes from `dev` with a merge. See [keeping your branch up to date](/core/development/catching-up/).

CI must pass before your pull request can be reviewed and merged. Some tests are flaky: when you are sure a failure has nothing to do with your change, wait for a maintainer, instead of pushing again to run CI once more.

[After you open a pull request](/core/development/review-process/) explains what happens next in core.

## New integrations

Before you build a new integration, read [does it belong in core](/core/integrations/create/#does-it-belong-in-core). The project recommends that you publish it in the [Marketplace](/marketplace/) first. Once it has matured and has a user base, reach out to the maintainers, for example in the **#core** channel on [Discord](https://www.home-assistant.io/join-chat/), to see whether it should ship built in.

When it does, [keep the first pull request small](/core/integrations/create/#keep-the-first-pull-request-small): Bronze tier, one platform, nothing extra.

In the description of the pull request:

- Explain what the product or service is.
- Link to the source repository of the library you use.
- Link the pull requests for the documentation on [home-assistant.io](https://www.home-assistant.io/) and for the brand images.

The [tutorial](/core/integrations/tutorial/) walks through a complete new integration, up to this pull request.

## Dependency updates

Update a dependency in a pull request of its own. Only include the code changes the new version needs. New features that use the new version come in a follow up.

In the description, link to what changed upstream: the release notes or changelog, or a diff between the old and the new version. Reviewers read the upstream changes before they merge, both to see if the update is safe for a patch release, and to spot anything suspicious. Run `python3 -m script.gen_requirements_all` to update the requirement files, and include them.

## Using AI

You can use AI tools to help you write code, as long as you stay the human in the loop. Core follows the [AI policy](/start/ai-policy/): you review and understand everything you submit, you can explain every change, and you answer questions from reviewers yourself. Autonomous agents may not contribute. The pull request template asks you to confirm that you understand the code you submit.

Core has an `AGENTS.md` file and skills for AI tools in its repository. See [AI tools in the repository](/core/development/environment/#ai-tools-in-the-repository).

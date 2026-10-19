---
title: Use GitHub, without being a developer
description: What a repository, issue, fork, branch, commit, and pull request are, and how to make a small change to Home Assistant entirely in your browser.
sidebarLabel: Use GitHub
order: 2
---

Most of Home Assistant lives on [GitHub](https://github.com/home-assistant): the code, the documentation, the bug reports, and the conversations about changes. GitHub was made by developers, for developers, and it shows. The words are odd, the screens are busy, and the first time can feel like walking into someone else's kitchen.

You don't need to be a developer to use it, though. Fixing a sentence in the documentation, reporting a bug, or proposing a change to a translation file all happen in your browser, with no software to install. This page explains the words you'll run into, and walks you through one small change from start to finish.

## Create an account

You need a free GitHub account to report a bug, comment, or propose a change. Reading is possible without one.

1. Go to [github.com/signup](https://github.com/signup).
2. Follow the steps. GitHub asks you to verify your email address: do that, because some things don't work until you have.
3. Turn on [two-factor authentication](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication). GitHub strongly recommends it, because it keeps your account safe.

Your username is public, and so is everything you write on GitHub. Pick a name you're happy to see next to your contributions.

## The words, in plain language

GitHub uses a handful of words over and over. Once you know them, the screens make a lot more sense.

### Repository

A [repository](/glossary/repository/) (or "repo") is a project: a folder of files, plus the full history of every change ever made to them. Home Assistant has many. The documentation lives in [home-assistant/home-assistant.io](https://github.com/home-assistant/home-assistant.io), the interface in [home-assistant/frontend](https://github.com/home-assistant/frontend), and Home Assistant Core in [home-assistant/core](https://github.com/home-assistant/core). Each has its own issues, pull requests, and maintainers.

### Issue

An [issue](/glossary/issue/) is a report about a problem, like a bug or a page that is wrong. Anyone can open one in a public repository, and anyone can comment. Issues are not the place for support questions or feature ideas: see [where we talk](/start/where-we-talk/) for where those go.

### Fork

A [fork](/glossary/fork/) is your own copy of a repository, on your account. You can't change a Home Assistant repository directly, but you can change your copy, and then propose your change to the original. You don't have to create a fork yourself: GitHub offers to do it for you the first time you edit a file.

### Branch

A [branch](/glossary/branch/) is a separate line of changes inside a repository. It lets you work on something without touching the main version. Every repository has a main branch that pull requests go into: `dev` for Home Assistant Core and the frontend, and `current` for fixes to the documentation. The first contribution page of each area tells you which one to use.

### Commit

A [commit](/glossary/commit/) is one saved change: the files you changed, who changed them, when, and a short message that says what you did. When you save an edit on GitHub, you make a commit.

### Pull request

A [pull request](/glossary/pull-request/) is a proposal: "here is a change, please take it in". It shows exactly what you changed, runs automated checks on it, and has its own conversation where people discuss it. Despite the name, you don't pull anything. Think of it as a request for the maintainers to pull your change in.

### Review

A [review](/glossary/review/) is someone reading your pull request before it goes in. A reviewer can approve it, comment on it, or ask for changes. Sometimes they suggest a concrete edit you can accept with one selection.

### Merge

To [merge](/glossary/merge/) a pull request is to take its changes into the repository. Only maintainers can merge. When your pull request shows **Merged**, your change is in: well done.

### A few more you'll see

- **Push**: sending commits from somewhere else to GitHub. If you only edit in the browser, GitHub does this for you, and you can ignore the word.
- **Merge conflict**: your change and another change touched the same lines of the same file, and Git can't decide which one to keep. See [When GitHub says there is a conflict](#when-github-says-there-is-a-conflict).
- **Draft**: a pull request that is not ready for review yet.
- **Checks**: the automated tests that run on every pull request. A green check mark means they passed, a red cross means something failed. See [CI](/glossary/ci/).

## Make a small change in your browser

This is the whole loop, from a mistake you spotted to a merged fix. The example is a fix to the documentation on [home-assistant.io](https://www.home-assistant.io/), because that is where most people start. Other repositories work the same way, only the branch and the template differ.

### 1. Open the file

Every page of the documentation has a **Help us improve our documentation** section at the bottom, with an **Edit** link. Select it, and GitHub opens the source file of that page.

In any other repository, browse to the file in the file list and select its name.

### 2. Start editing

Select the pencil icon above the file. The first time, GitHub tells you that you need your own copy of the repository to make changes. Select **Fork this repository**. GitHub creates the fork on your account and opens the editor.

### 3. Make your change

Change the text in the editor. Keep it to one thing: one typo, one outdated step, one unclear sentence. Small changes get reviewed much faster than big ones.

Select **Preview** to check how your change looks.

### 4. Propose the change

1. Select **Commit changes...**.
2. In the **Commit message** field, write a short description of what you changed, like "Fix the name of the Settings menu".
3. Select **Propose changes**.

GitHub saves your change as a commit in your fork, and shows you what you changed.

### 5. Open the pull request

1. Select **Create pull request**.
2. Check the base branch at the top: the branch your pull request goes into. For a documentation fix, that's `current`. If it shows another branch, change it in that menu.
3. Write a clear title, like "Fix outdated menu name on the backup page".
4. Fill out the template in the description. Leave its headings and checkboxes in place, and check the boxes that apply. The template is there to help the reviewer, not to test you.
5. Select **Create pull request**.

That's it. Your proposal is now public, and the right people are notified automatically. You don't need to ask anyone for a review.

### 6. Let the bots do their thing

Within a few minutes, a few things happen:

- Bots add labels, and automated checks start.
- For the documentation, a bot posts a link to a [Deploy Preview](/glossary/deploy-preview/): the whole site with your change in it. Open it and check your page.
- In the code repositories, like Home Assistant Core or the frontend, a bot asks you to sign the [Contributor License Agreement](/start/licensing/) the first time. Follow its link. You do this once, and your pull request can't be merged until you have.

If a check fails and you don't understand why, ask in a comment on your pull request. That's a normal question, and nobody expects you to read the check logs on your first try.

### 7. Respond to the review

Sooner or later, a reviewer looks at your change. That can take hours or weeks, depending on how busy the repository is. [Pull requests and reviews](/start/pull-requests/#waiting-for-a-review) explains why, and what you can do while you wait.

The comments of the review show up on the **Conversation** tab of your pull request, and next to the lines they are about on the **Files changed** tab.

- **To answer a comment**, write your reply below it.
- **To accept a suggested change**, select **Commit suggestion**. Got several? Select **Add suggestion to batch** on each, then **Commit suggestions** to apply them in one go.
- **To change something yourself**, go to your fork, switch to the branch of your pull request with the branch menu above the file list, and edit the file there like before. When you commit, choose to commit directly to that branch. Your pull request updates by itself.
- **When you have handled a comment**, select **Resolve conversation**, so everyone can see what is left.

A review comment is about the change, not about you. If you think a reviewer is wrong, say so, politely, and explain why. If you don't understand a comment, ask. Reviewers would much rather explain than see you guess.

In many Home Assistant repositories, a bot turns your pull request into a draft when a reviewer asks for changes. Once you've handled everything, select **Ready for review** to let them know.

### 8. Merged

When a maintainer merges your pull request, it shows **Merged**. Your change is now part of Home Assistant. A documentation fix on `current` goes live by itself: that branch is what [home-assistant.io](https://www.home-assistant.io) publishes. Code changes reach everyone with the next release.

Sometimes a pull request is closed without merging. The reviewer usually says why: it was fixed another way, or it doesn't fit. That happens to experienced contributors too, and it's not a verdict on you.

## When GitHub says there is a conflict

If someone else changed the same lines while your pull request was waiting, GitHub shows that the branch has conflicts. For a simple conflict, you can fix it in the browser:

1. On your pull request, select **Resolve conflicts**.
2. GitHub shows both versions, between markers like `<<<<<<<`, `=======`, and `>>>>>>>`. Edit the text so only the version you want is left, and remove the markers.
3. Select **Mark as resolved**, and then **Commit merge**.

Not every conflict can be resolved in the browser. If **Resolve conflicts** is not available, or you're unsure what to keep, ask for help in a comment on your pull request.

Is your branch only behind, without conflicts? Then GitHub shows an **Update branch** button near the bottom of the pull request. Selecting it pulls in the latest changes.

## What is confusing, honestly

A few things trip up almost everyone the first time:

- **Your change seems to disappear.** After you propose a change, it lives in your fork, not in the Home Assistant repository. That's how it should be. It moves over when the pull request is merged.
- **There are two of everything.** Your fork and the original repository look almost the same. Check the name at the top left: your username, or `home-assistant`.
- **The wrong base branch.** A pull request against the wrong branch is a common first mistake. You can change it afterwards: select **Edit title** next to the title of the pull request, pick another branch in the base branch menu, and select **Change base**.
- **The amount of notifications.** Once you open a pull request, GitHub emails you about everything that happens on it. You can tune that in your [notification settings](https://docs.github.com/en/subscriptions-and-notifications/get-started/configuring-notifications).
- **Silence.** No response for a while doesn't mean nobody cares. There are more pull requests than reviewers.

## Where to go from here

- [Your first contribution](/start/first-contribution/): pick what you want to work on.
- [Your first docs fix](/writing/first-contribution/): this loop, for the documentation.
- [Pull requests and reviews](/start/pull-requests/): what happens after you open a pull request, in more detail.
- GitHub's own [Hello World](https://docs.github.com/en/get-started/start-your-journey/hello-world) tutorial, if you want to practice in a repository of your own first.

---
title: Your first docs fix
description: Fix something small in the documentation, straight from your browser. No setup needed.
order: 1
sidebarLabel: Your first contribution
---

The fastest way to start is to fix something you noticed yourself. Did a page confuse you? Was a step outdated, or a screenshot from an older version? That is your first contribution.

No idea yet? Readers report problems through the feedback link on every page. Those reports are [open issues on GitHub](https://github.com/home-assistant/home-assistant.io/issues), and many of them are small fixes waiting for someone to pick them up.

You need a free [GitHub](https://github.com/) account. New to GitHub? [Use GitHub, without being a developer](/start/github/) explains the words you see on the way, like fork, commit, and pull request.

Not up for editing yourself? That is fine too. Select **Provide feedback** under **Help us improve our documentation** at the bottom of the page on [home-assistant.io](https://www.home-assistant.io/) and describe what is wrong. It becomes an issue that someone else can pick up. You need a GitHub account for that as well.

## 1. Open the page

1. Go to the page on [home-assistant.io](https://www.home-assistant.io/) that you want to fix.
2. Scroll to **Help us improve our documentation** at the bottom, and select **Edit**.
3. GitHub shows the source of the page. Select the pencil icon, **Edit this file**, at the top right of the file.
4. The first time, GitHub offers to create your own copy of the repository, called a [fork](/start/github/#fork). Accept it. You don't have to do anything else with it.

> [!NOTE]
> If the pencil icon won't show up, make sure you are signed in to your GitHub account first.

## 2. Make your change

Pages are written in Markdown. Most of it is plain text, so you can edit it like any other text. Look at how the rest of the page does things, like links and lists, and do the same.

Keep your change focused: one fix per pull request is easier to review than ten. Planning something bigger, like a new section or a new page? Read the [style guide](/writing/reference/style/) and [how a page is structured](/writing/guides/structure/) first.

> [!TIP]
> Small things reviewers often point out: write **Settings** > **Devices & services** in bold when you refer to the interface, and write "Home Assistant" in full.

## 3. Propose the change

1. Select **Commit changes...**.
2. In the window that opens, write a short description of what you changed, like "Fix the name of the backup menu".
3. Select **Propose changes**.

GitHub saves your change in your fork, and shows you what you changed. Spotted a mistake in your own edit at this point? No problem: open the pull request anyway, and fix it afterward. Step 6 explains how.

## 4. Open the pull request

1. Select **Create pull request**.
2. Check the base branch at the top. Fixing existing documentation? It must say `current`: the documentation of the release people are running right now. If it says something else, change it in that menu.
3. Fill in the template. Don't remove any of its text: it helps the reviewers. Under **Type of change**, check the box that fits, usually **Spelling, grammar or other readability improvements** or **Adjusted missing or incorrect information in the current documentation**. Under **Checklist**, check the boxes that apply.
4. Select **Create pull request**.

That's it. Your pull request is public now, and the right people are notified by themselves. You don't need to ask anyone for a review.

## 5. Check the preview

A few minutes after you open the pull request, a bot comments with a link to a **Deploy Preview**. That is the full site with your change in it. Open it and check that your page looks the way you intended.

## 6. Review and merge

A maintainer reviews your change. GitHub sends you a notification when something happens, by email or on github.com, depending on your settings.

- **A suggestion?** Accept it straight from the pull request with **Commit suggestion**.
- **Want to change something yourself?** Edit the file again in your fork, on the branch of your pull request, and the pull request updates by itself. [Use GitHub](/start/github/#7-respond-to-the-review) shows where to find it.
- **A question you don't understand?** Ask. Reviewers would much rather explain than see you guess.

Once your pull request is merged, Netlify publishes your fix to home-assistant.io.

## What is next

- Fix a few more things. Most regular docs contributors started with typos.
- Prefer a walkthrough with screenshots of every screen? The community guide [Editing the documentation and creating a pull request on GitHub](https://community.home-assistant.io/t/editing-the-documentation-and-creating-a-pull-request-on-github/9573) on the forum shows them.
- Ready for bigger changes? [Preview the site locally](/writing/guides/local-preview/).

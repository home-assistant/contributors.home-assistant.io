---
title: Grow as a contributor
description: What comes after your first pull request. Reviewing, triaging, owning an integration, taking on a role, and where it can lead.
sidebarLabel: Grow as a contributor
order: 4.5
---

Your first contribution is merged. Now what? This page shows the paths people take after that, roughly in the order most people walk them. You don't have to walk all of them, and there is no finish line. Plenty of people contribute for years by doing one thing well.

Each step says what it means, what it takes, and how you get there. Where something isn't written down anywhere, this page says so, instead of guessing.

## 1. Become a regular

The easiest way to grow is to keep showing up. A second and third pull request in the same part of the project teach you more than the first one did, and the people reviewing them start to recognize your name.

Most of the work that keeps Home Assistant running isn't writing new things, though. It's helping the people and changes that are already there. That is where regulars make the biggest difference.

### Review pull requests

There are more pull requests than reviewers. Every review you give makes the final review by a maintainer faster. You don't need any permissions to review: anyone can comment on a pull request, test it, or approve it.

The pull request templates of Core and the frontend ask you to review two other open pull requests in the same repository when you open your own. They also link a search for pull requests that don't have a review yet. That is a good place to start.

What makes a useful review:

- Test the change with your own device or setup, and say what you found. "I tried this with my device, and it works" helps.
- Check the basics: is the template filled in, do the checks pass, does it do one thing?
- Ask a question when something isn't clear. If you don't understand it, the next person won't either.

For the details per repository, see [reviewing pull requests in Core](/core/development/reviewing/) and [review and release in the frontend](/frontend/development/review-and-release/). The general flow is in [pull requests and reviews](/start/pull-requests/).

### Help with issues

Bug reports pile up fast. Many miss a log, a version, or the steps to reproduce. You can help without any special access:

- Try to reproduce a bug on your own installation, and comment with what happened.
- Ask for the missing details, kindly. [Report a bug](/start/report-a-bug/) lists what each repository's form asks for.
- Point to a duplicate when you find one.
- Confirm that an old bug still happens on the latest version, so it doesn't go stale.

Setting labels or closing issues needs permissions on GitHub that most contributors don't have. The labels you'll see used for this include `needs-more-information` in Core and on [home-assistant.io](https://github.com/home-assistant/home-assistant.io), `needs more information` in the frontend, and `waiting-for-reply` in Core.

Looking for something to fix yourself? Some repositories mark issues with `good first issue` or `help-wanted`, among them Core, the frontend, and home-assistant.io. Not every repository uses these labels, and how many issues carry them at any moment varies a lot.

### Help people

Answering questions is a contribution, and one that users feel right away.

- On the [community forum](https://community.home-assistant.io/) and [Discord](https://www.home-assistant.io/join-chat/), help people with their setup. [Answer your first question](/community/first-contribution/) shows how, and [welcome newcomers](/community/guides/welcome-newcomers/) helps you do it well.
- In [feature requests](https://github.com/home-assistant/feature-requests/discussions), help shape ideas. Explain the problem behind a request, point to an existing request instead of a duplicate, and vote. The product team uses feature requests to shape the [roadmap](/roadmap/how-it-works/).

## 2. Become an integration owner

An [integration owner](/glossary/integration-owner/) looks after an integration. You know the device or service best, so you're the person reviewers listen to when it changes.

### What it takes

The owners of an integration are listed in the `codeowners` field of its `manifest.json` in Home Assistant Core. To become one, open a pull request that adds your GitHub username there, then run hassfest to update the `CODEOWNERS` file of the repository:

```shell
python3 -m script.hassfest
```

Commit both files. The pull request is reviewed like any other. It helps a lot to have worked on the integration first. [Have an integration owner](/core/quality-scale/integration-owner/) explains the role, and what it asks of you: an owner takes care of the integration over time. An integration without an active owner can lose its place on the quality scale.

### What you get

- **Review requests.** GitHub asks you to review pull requests that touch your integration, because the `CODEOWNERS` file is generated from the manifests.
- **The documentation too.** The `CODEOWNERS` file of home-assistant.io is synced with Core. If you own the integration, you own its documentation page as well, and get asked to review changes to it.
- **Issue mentions.** When an issue or pull request in Core or on home-assistant.io gets the label of your integration (`integration: <domain>`), a bot assigns you and mentions you in a comment.
- **Bot commands.** That comment lists commands only the integration owners of that integration can use, by commenting `@home-assistant <command>`: close, reopen, or rename the issue, remove your integration's label, and add or remove a few triage labels like `needs-more-information`. On pull requests, you can also mark it as a draft, mark it ready for review, or update its branch. Commands that don't name an integration only work when the issue or pull request has the label of a single integration.
- **Task issues.** In Core and home-assistant.io, only members of the GitHub organization and people listed in `CODEOWNERS` can open issues of the Task type. Task issues from anyone else are closed automatically.

The bot's source is in [OpenHomeFoundation/bots](https://github.com/OpenHomeFoundation/bots). It shows exactly what each command does.

## 3. Take on a role in your area

Some areas have roles with more responsibility. Each one is granted in its own way.

- **Language leader.** Every language that Assist understands has leaders who review the changes to their language in the [intents repository](https://github.com/OHF-Voice/intents). To apply, you need to be a native speaker, have made at least two pull requests to the intents repository, and help review pull requests for your language. See [language leaders](/translate/voice/language-leaders/).
- **Moderator.** Moderators keep the forum, Discord, and the subreddit friendly and safe. Moderators are nominated by other moderators, and the community managers of the Open Home Foundation accept the nomination. See [how moderation works](/community/guides/moderation/#becoming-a-moderator).
- **Creator Network.** If you make videos, posts, or other content about Home Assistant, you can apply to the [Creator Network](/community/reference/programs/#creator-network).
- **Works with Home Assistant.** If you work for a device maker, the [Works with Home Assistant](/community/reference/programs/#works-with-home-assistant) program is for your company.

## 4. Maintainers and teams

A [maintainer](/glossary/maintainer/) can approve and merge pull requests in a repository. Each repository has its own maintainers, often organized in GitHub teams, like `@home-assistant/core` or `@home-assistant/frontend`. [How the project is organized](/start/organization/#teams-in-codeowners) lists the teams you'll meet in the `CODEOWNERS` files, and what each one owns.

How someone becomes a maintainer isn't written down on this site yet. Reviewing, triaging, and owning an integration are valuable on their own, whatever comes after.

## 5. Get recognized

Your work shows up in places users read:

- **Release notes.** The release notes on the [Home Assistant blog](https://www.home-assistant.io/blog/) thank contributors by their GitHub username, next to the features they worked on. The people who helped write the release notes are thanked too.
- **The full changelog.** Every release has a full changelog of Home Assistant Core, linked from the release notes under **All changes**. Each merged pull request is listed there with its author.

## 6. Go further with the foundation

Home Assistant is one of the projects of the [Open Home Foundation](https://www.openhomefoundation.org/). There is more to join:

- **The roadmap.** See what the foundation is working on, and where you can help, on the [roadmap](/roadmap/).
- **Meetups and Community Day.** Meet other contributors in person, or host a meetup yourself. The foundation reimburses hosts for certain costs. See [host a meetup](/community/guides/meetups/).
- **Other projects.** The foundation also owns projects like ESPHome and Music Assistant, and works with others. Its [projects page](https://www.openhomefoundation.org/projects/) lists them, with links to each.
- **Jobs.** The foundation publishes its open positions on its [jobs page](https://jobs.ashbyhq.com/openhomefoundation).

## Who to talk to

- Not sure what to pick up next? Ask in **#developers** on the [Home Assistant Discord](https://www.home-assistant.io/join-chat/), or in the channel of your area. [Where we talk](/start/where-we-talk/#by-area) lists them. The [project forum](discord:project-forum) has the longer running projects, and the bigger topics the team is sprinting on.
- Want to become an integration owner? Ask in a pull request or issue of that integration, where its current owners can see it.
- Interested in becoming a language leader? Start a topic in the [intents discussions](https://github.com/OHF-Voice/intents/discussions).
- Questions about community roles, meetups, or Community Day? Email the community team at [community@openhomefoundation.org](mailto:community@openhomefoundation.org).

---
name: fact-check
description: Use this to verify a page or a whole area of the Home Assistant contributors website against the source repositories, and to fix or remove what does not hold.
---

# Fact-check

Verify a page, or every page of an area, against the real sources, and fix what is wrong. The [`review` skill](../review/SKILL.md) finds problems in a change. This skill goes through existing pages, claim by claim, and fixes them.

## The rule

Never invent anything. Every statement on this site needs a source someone can read: code, a repository file, or an official page. If you cannot find one, the claim goes, or it gets narrowed to what the source does say. Never replace a guess with another guess.

## Where the truth lives

For code and repository files, the source is the default branch of their repository, in the table below. Never use a local working copy as the source: it can be weeks old.

| Topic | Repository | Branch |
| --- | --- | --- |
| Core, integrations, entities | [home-assistant/core](https://github.com/home-assistant/core) | `dev` |
| Frontend, components, design tokens | [home-assistant/frontend](https://github.com/home-assistant/frontend) | `dev` |
| Supervisor | [home-assistant/supervisor](https://github.com/home-assistant/supervisor) | `main` |
| Home Assistant OS | [home-assistant/operating-system](https://github.com/home-assistant/operating-system) | `dev` |
| Android app | [home-assistant/android](https://github.com/home-assistant/android) | `main` |
| iOS app | [home-assistant/iOS](https://github.com/home-assistant/iOS) | `main` |
| User documentation | [home-assistant/home-assistant.io](https://github.com/home-assistant/home-assistant.io) | `current` (`next` for the coming release) |
| Old developer docs | [home-assistant/developers.home-assistant](https://github.com/home-assistant/developers.home-assistant) | `master` |
| Architecture decisions | [home-assistant/architecture](https://github.com/home-assistant/architecture) | `master` |
| Official apps | [home-assistant/addons](https://github.com/home-assistant/addons) | `master` |
| Brands | [home-assistant/brands](https://github.com/home-assistant/brands) | `master` |
| Versions | [home-assistant/version](https://github.com/home-assistant/version) | `master` |
| Intents | [OHF-Voice/intents](https://github.com/OHF-Voice/intents) | `main` |
| Bashio | [hassio-addons/bashio](https://github.com/hassio-addons/bashio) | `main` |

The old developer docs are a source of what was written, not of what is true. Check what they say against the code too.

### Documentation for an open pull request

Documentation for a new feature is often written while the code pull request in the other repository is still open. That is the normal order: the documentation merges after the code, and if the code never merges, the documentation does not either. For such a pull request, the source for the new feature is the head of the open code pull request, not the default branch. Do not flag that the feature is not merged yet, or that the default branch does not have it.

The open code pull request is the source for what the feature does, but not for which release ships it: that can only be checked once it merges. So when a page or blog post names that release, like "available from 2026.12", do not flag it while the code pull request is still open. Once it is merged, check the release against something like:

- The version in `homeassistant/const.py` at the merge commit, for core. A merge into `dev` at `2026.12.0.dev0` ships in 2026.12.
- A release tag that contains the merge commit.
- The milestone of the pull request. Most pull requests merged into `dev` have none, so a missing milestone is not a finding.

Find the code pull request in the description, under "This PR belongs together with". Read its changes with:

```shell
gh pr view <number> --repo home-assistant/<repository>
gh pr diff <number> --repo home-assistant/<repository>
```

For anything about the organization (who owns, funds, employs, or decides), the source is an official page, like [the structure of the Open Home Foundation](https://www.openhomefoundation.org/structure/). For the community, it is [home-assistant.io/community](https://www.home-assistant.io/community/) and the [code of conduct](https://www.home-assistant.io/code_of_conduct/). For roles and processes, it is the page or repository of the team that runs them, like the [architecture repository](https://github.com/home-assistant/architecture) for architecture decisions.

For a tool from outside the project, like Docker, VS Code, WSL, or uv, the source is the official documentation of that tool.

Quote what a source says verbatim. A summary from a tool that fetches a page can garble names and numbers: read the page itself before you rely on a detail. For a product name, it is the glossary of this site: see `formerly` in `src/content/docs/glossary/`.

## Read a source without a local clone

Read a file:

```shell
gh api -H "Accept: application/vnd.github.raw" \
  "repos/home-assistant/core/contents/homeassistant/const.py?ref=dev"
```

List a folder:

```shell
gh api "repos/home-assistant/core/contents/homeassistant/helpers?ref=dev" \
  --jq '.[].name'
```

Search code (the default branch only):

```shell
gh search code --repo home-assistant/core "async_setup_entry" --limit 20
```

Read a pull request, an issue, or a release:

```shell
gh pr view <number> --repo home-assistant/core
gh release view --repo home-assistant/core
```

Read a web page with any tool that fetches a URL. Keep the URL: it goes in your report.

## Read a source with a local clone

Fetch first, then read the remote branch, never the working copy. If fetching over SSH fails, fetch over HTTPS. Never read a branch you could not fetch: it can be a day old or more.

```shell
git -C ../core fetch https://github.com/home-assistant/core.git \
  dev:refs/remotes/origin/dev
```

Then:

```shell
git -C ../core fetch origin dev
git -C ../core show origin/dev:homeassistant/const.py
git -C ../core grep -n "async_setup_entry" origin/dev -- homeassistant/helpers
git -C ../core ls-tree --name-only origin/dev:homeassistant/helpers
```

## Steps

1. List the pages. For an area: `ls -R src/content/docs/<area>/`.
2. For each page, read it in full. Write down every claim that a source can prove or disprove: commands, paths, file names, function and class names, parameters, endpoints, version numbers, defaults, limits, people, teams, channels, timings, and promises.
3. Check each claim against its source, with the commands above. Pay most attention to the patterns in [step 3 of the `review` skill](../review/SKILL.md#3-verify-every-claim): absolute words, lost conditions, organization claims, copied facts, and comments in examples.
4. Walk every example and sequence of steps, as in [step 4 of the `review` skill](../review/SKILL.md#4-walk-the-examples-and-steps). Run small snippets when you can, in a temporary folder outside the repository.
5. Fix the page:
   - A false claim: correct it to what the source says.
   - A claim you cannot source that would mislead a reader, like a wrong command, a function that does not exist, or a made-up number or promise: remove it, or narrow it to what the source supports.
   - A claim you cannot source that is harmless, like advice or tone: leave it, and list it in your report.
   - Where the source behaves in a surprising way, describe what it does. Never write that code in another repository is wrong or should change.
   - Keep the edit small. Do not restructure a page or rewrite correct paragraphs.
6. For a page that copies facts that change, set `source` to the URL you checked and `lastVerified` to today's date (see "Facts that go stale" in [`.github/copilot-instructions.md`](../../copilot-instructions.md)).
7. Run the checks:

   ```shell
   pnpm check
   pnpm build
   pnpm links
   pnpm structure
   ```

## Confirmed facts

Some facts have no public source yet, but a maintainer confirmed them, like the name of a meeting or who sets a schedule. They belong in the page, but nobody can check them later. So:

- Ask in the pull request, and quote the maintainer's confirmation there. The pull request is then the source.
- Do not remove a fact that a maintainer confirmed in an earlier pull request because you cannot find it in the code. Find that pull request with `gh pr list --repo home-assistant/contributors.home-assistant.io --search "<words>" --state merged`, or ask.
- Do not extend a confirmed fact. "The foundation sets the release schedule" does not tell you who picks the date of a single release.

These facts were checked or confirmed while the site was built. Keep them, and keep their wording:

- Home Assistant is owned by the Open Home Foundation, a non-profit. Nabu Casa and Apollo Automation are commercial partners of the foundation. Nobody working on Home Assistant is employed by Nabu Casa. Sources: [openhomefoundation.org/structure](https://www.openhomefoundation.org/structure/), [nabucasa.com/about](https://www.nabucasa.com/about/).
- The architecture meeting (not "core architecture meeting") guards the technical architecture, beside the roadmap.
- The release schedule is set by the Open Home Foundation.
- The release party is a joint effort of the Home Assistant and Community teams of the foundation.
- Moderators are nominated by other moderators, and accepted by the community managers of the foundation.
- Home Assistant Cloud is now called Home Assistant Link. The code is still the `cloud` integration.
- The CLA bot runs on code repositories only, not on documentation repositories.
- The frontend releases from the `rc` branch (tags there), merged into `master` on release day.
- There is no formal appeal process for moderation decisions yet.
- For integrations, the person responsible is called the integration owner, not the code owner. The code keeps its names: the `codeowners` field in the manifest and the `CODEOWNERS` file.
- For a new integration or dashboard card, the project recommends publishing it in the Marketplace first: you gain experience and can iterate faster. Once it has matured and has a user base, reach out to the maintainers to see whether it should ship built in.
- The version format is owned by Core; Releases explains it briefly and links to Core.
- The Home Assistant Discord has these channels for contributors: `#developers` (general development), `#core`, `#frontend`, `#operating-system` (also for the Supervisor), `#apple-apps`, `#designers`, `#product-and-ux`, `#user-researchers`, `#documentation`, `#language-leaders`, and `#beta` (for people testing a beta). It also has "Building in the open", the announcement channel for contributors, a channel for general coding support, and the project forum, for longer running projects and bigger topics the team is sprinting on. Their URLs live in `src/data/discord.ts`.

## Report

Keep it short. For each fix: the file, what was wrong, and the source (repository, branch, and path, or the URL). Then what you checked and found correct, what you could not verify and why, and the judgment calls a maintainer should look at.

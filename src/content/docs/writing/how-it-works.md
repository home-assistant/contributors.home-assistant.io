---
title: How the documentation works
description: Where the pages live, which branch to use, and how a change goes from pull request to home-assistant.io.
order: 2
sidebarLabel: How it works
---

The documentation and the rest of [home-assistant.io](https://www.home-assistant.io/) live in one GitHub repository: [home-assistant/home-assistant.io](https://github.com/home-assistant/home-assistant.io). The site is built with [Jekyll](https://jekyllrb.com/). Pages are Markdown files, with a few [Liquid helpers](/writing/reference/liquid/) for things like links into the Home Assistant interface.

## Where pages live

Everything is in the `source` folder. The parts you work with most:

- `source/_integrations`: one page per integration, named after its domain, like `hue.markdown`.
- `source/_docs`: the general documentation, like automations, scripts, and the backup guide.
- `source/_dashboards`: dashboards and cards.
- `source/_data/glossary.yml`: the glossary behind the term tooltips.
- `source/_redirects`: where old URLs are sent when a page moves.
- `source/_includes/asides/docs_sitemap.html`: the sidebar of the general documentation. It is maintained by hand, so a new page in `source/_docs` that needs a place in the sidebar gets a link there.

## Branches

The repository has two branches you choose between:

- **`current`** is the documentation of the release people use today. Target it for fixes and improvements to existing documentation.
- **`next`** is the documentation for the upcoming release. Target it when you document a new integration or a new feature that is not released yet.

Picking the right branch matters: a change on `next` only goes live with the next release. The pull request template reminds you, and so does a bot: when the base branch does not match your pull request, it adds the `needs-rebase` label and leaves a comment that tells you which branch to use.

Documenting a new feature from a core pull request? Open one documentation pull request per core pull request, and link them. Then both can be merged together for the same release.

## Parent pull requests

A documentation pull request that documents a code change has a _parent_: the pull request with that code change, in a repository like core or frontend. Link them both ways: the parent in the **Additional information** section of your documentation pull request, and your documentation pull request in the description of the parent.

A bot follows those links, and labels your documentation pull request:

- `has-parent`: your pull request links a parent. The bot then expects it to target `next`. A pull request without a parent is expected to target `current`.
- `parent-merged`: the parent is merged, so the documentation can follow.
- `needs-rebase`: the pull request targets the wrong branch. Change the base branch, and rebase if needed.

You may also see `awaits-parent`, which means the pull request awaits the merge of its parent.

The bot keeps both pull requests in step, too. When the parent is closed without being merged, your documentation pull request is closed as well. When the parent is reopened, so is yours.

So a documentation pull request on `next` waits for its parent. That can take a while, and that is fine: pull requests with the `has-parent` label are never marked as stale.

## From pull request to live

1. You open a pull request.
2. Automated checks run: remark checks the Markdown, textlint checks spelling and terminology, and the Astro part of the site is built. [Automated checks](/writing/reference/checks/) has the details.
3. Netlify builds a **Deploy Preview** of the full site with your change.
4. A maintainer reviews the change.
5. Once merged into `current`, Netlify publishes the change to home-assistant.io. Changes on `next` go live with the release.

Pull requests and issues without activity for 60 days are marked as stale, and closed 7 days later unless something happens. A comment or a new commit is enough to keep them open.

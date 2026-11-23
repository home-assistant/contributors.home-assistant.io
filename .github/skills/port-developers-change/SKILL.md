---
name: port-developers-change
description: Use this to bring a change merged on developers.home-assistant.io over to the Home Assistant contributors website, while the old site still receives changes. Finds what changed, maps it to the page here, and ports it rewritten in this site's style, verified against the source.
---

# Port a change from developers.home-assistant.io

This site replaces [developers.home-assistant.io](https://github.com/home-assistant/developers.home-assistant). While people still merge changes there, those changes need to land here too. This skill ports them, one pull request at a time.

A change there is a source, not a template. Port what it means, rewritten for this site, and check it against the code.

## 1. Find the changes

For one pull request, start from its number. For everything since a date:

```shell
gh pr list --repo home-assistant/developers.home-assistant \
  --state merged --search "merged:>=2026-10-01" \
  --limit 100 --json number,title,mergedAt
```

For blog posts, comparing the folders is quicker. This lists the posts on the old site that are not here yet (with a clone of the old site next to this one, fetched first):

```shell
git -C ../developers.home-assistant fetch \
  https://github.com/home-assistant/developers.home-assistant.git \
  master:refs/remotes/origin/master
comm -23 \
  <(git -C ../developers.home-assistant ls-tree --name-only \
    origin/master blog/ | sed 's#^blog/##' | sort) \
  <(ls src/content/blog | sort)
```

To see whether a change was already ported, search this repository for the number:

```shell
gh pr list --repo home-assistant/contributors.home-assistant.io \
  --state all --search "home-assistant/developers.home-assistant#<number>"
```

## 2. Read what changed

```shell
gh pr view <number> --repo home-assistant/developers.home-assistant
gh pr diff <number> --repo home-assistant/developers.home-assistant
gh pr view <number> --repo home-assistant/developers.home-assistant \
  --json files --jq '.files[].path'
```

Read the description and the review comments too. They often hold the reason for the change, and the code pull request it documents.

## 3. Map each file to its page here

Changes to `docs/`:

1. Turn the file path into the old URL: `docs/core/entity/sensor.md` is `/docs/core/entity/sensor`. An `id` or `slug` in the front matter of the old page changes that: read it with `gh api -H "Accept: application/vnd.github.raw" "repos/home-assistant/developers.home-assistant/contents/<path>?ref=master"`.
2. Find the new page in the redirect maps:

   ```shell
   grep -hP '^/docs/core/entity/sensor\t' redirects/*.tsv
   ```

   When two maps disagree, `redirects/overrides.tsv` wins.
3. The new path, like `/core/entities/sensor/`, is the file `src/content/docs/core/entities/sensor.md` (or `.mdx`, or `index.md` in that folder).
4. Several old pages may have been merged into one page here. Find the section that covers the changed text, and check `redirects/fragments.tsv` for the old heading.

When there is no row, the page is new on the old site. Pick the area and the place with the [`write-page` skill](../write-page/SKILL.md), and add a row for its old path to `redirects/<area>.tsv`, so its old URL keeps working.

When the change removes a page, find what covers that topic here. Remove or rewrite it only when the code agrees that it is gone. Point the redirect row of the old page at the closest page that remains.

Changes to `blog/`:

- A post `blog/2026-10-09-uom-selector.md` becomes `src/content/blog/2026-10-09-uom-selector.md`. The date and the name stay the same, so the URL `/blog/2026/10/09/uom-selector/` stays the same too.
- Keep the text of a post as it was written, word for word. Posts are a record of their time. Do not apply the style rules of this site to them.
- The one change to the text: rewrite links to `/docs/...` and `https://developers.home-assistant.io/docs/...` to the new path, found as in the steps for `docs/` above. For a link with an anchor, use the heading on the new page that `redirects/fragments.tsv` maps it to, or the heading that now covers the same text. When no heading fits, link the page without the anchor. Links to `/blog/...` stay as they are: the blog URLs did not change.
- Convert the front matter:
  - `title` stays as it is, quotes included.
  - `author` becomes the list `authors`, with the name as it is in `src/data/authors.ts`. The old site can spell a name differently, like "Erik Montnemery" for "Erik Montnémery": match on the GitHub username in `authorURL`. Drop `authorURL`, `authorImageURL`, and `authorTwitter`.
  - Add `date`, from the file name.
  - Add a `description`: the first sentence of the post, as plain text without Markdown. When the post starts with a heading, like `## Summary`, take the first sentence after it.
  - Add the `areas` (IDs from `src/data/areas.ts`). Posts about core and integrations are `core`.
  - The [`create-blog-post` skill](../create-blog-post/SKILL.md) shows the format.
- For an author who is not in `src/data/authors.ts`, add them with their real name and GitHub username, and run `pnpm avatars`. Only when the name comes from a source, like the post or their GitHub profile. Otherwise ask.

Changes to `static/` (images): put the image next to the page that uses it, with a relative path and alt text.

Changes to the old site itself, like `docusaurus.config.js`, `sidebars.js`, or `src/`, do not apply here.

## 4. Port it

1. Read the page here in full, so the change fits what is already there.
2. Verify the change against the source, with the [`fact-check` skill](../fact-check/SKILL.md). The pull request on the old site may be about a code change that is not merged, or that changed again since. Port only what the default branch of the code supports.
3. Rewrite it in the style of this site. The rules are in [`.github/copilot-instructions.md`](../../copilot-instructions.md). Few em dashes, second person, American English, short sentences, "Home Assistant" in full, no former names.
4. If the change touches a fact that another page here repeats, update that page too, or link to the one page that owns it.
5. If you rename a heading, follow "Moving or renaming pages" in the rules.

## 5. Check and open the pull request

```shell
pnpm check
pnpm build
pnpm links
pnpm structure
```

In the pull request, link the pull request on developers.home-assistant.io you ported, like `Ports home-assistant/developers.home-assistant#<number>`. That link is how the next person finds out it is done.

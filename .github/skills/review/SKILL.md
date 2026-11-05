---
name: review
description: Use this to review a pull request, a set of pages, or site code of the Home Assistant contributors website in depth. Verifies claims against the source repositories, checks examples and steps, and reports findings with evidence and a severity.
---

# Review

Review a pull request, or a set of pages or files, of this site. You can be a person, Copilot, Claude, or another agent: the steps are the same.

The rules live in [`.github/copilot-instructions.md`](../../copilot-instructions.md). The short checklists live in [`.github/instructions/review-content.instructions.md`](../../instructions/review-content.instructions.md) (pages) and [`.github/instructions/review-site.instructions.md`](../../instructions/review-site.instructions.md) (site code). This skill is how you work through them in depth. Do not copy the rules into your review: link the section.

Just review. Do not change files unless you are asked to fix what you find.

## 1. Set the scope

For a pull request:

```shell
gh pr view <number> --repo home-assistant/contributors.home-assistant.io
gh pr diff <number> --repo home-assistant/contributors.home-assistant.io
```

When the description links an open pull request in another repository that this pull request documents, the new feature is checked against that pull request, not the default branch. See [documentation for an open pull request](../fact-check/SKILL.md#documentation-for-an-open-pull-request).

For local changes, review the diff against `main`:

```shell
git fetch origin main
git diff "$(git merge-base origin/main HEAD)"
```

For a set of pages or files without a diff, review each file as a whole. Note which files are pages (`src/content/`) and which are site code (everything else). Pick the checklist that fits each file.

Read every changed page in full, not only the changed lines. A changed line can contradict the paragraph above it.

## 2. Run the checks

Run the checks CI runs, in this order. A failure is a finding of its own. When `dist/` was built from the exact tree you review, you can skip `pnpm build`. Otherwise build first: `pnpm links` and steps 5 and 6 read `dist/`, and an old build passes without checking your change.

```shell
pnpm install
pnpm structure
pnpm check
pnpm build
pnpm links
```

Then look for the writing mistakes a script can find, in pages and in code comments. In code, `"click"` as an event name is fine.

```shell
grep -rnP '\x{2014}|\x{2013}' <files>
grep -rnwiE 'e\.g\.|i\.e\.|etc\.|click' <files>
grep -rnwE 'HA|HASS' <files>
grep -rnwiE 'service|service call|add-on|addon|lovelace|component|breaking change|code owners?|Home Assistant Cloud|core architecture meeting' <files>
```

Each hit needs a look, not an automatic finding. "service" in `services.yaml` or a quoted API path is fine. "click" for a mouse action is fine. "component" is only a former name when it means an integration: a frontend component is fine. "code owner" is only a former name when it means the owner of an integration, who is an integration owner: a `CODEOWNERS` file outside integrations, the `codeowners` field, and labels like `by-code-owner` are fine. The former names come from `formerly` in the glossary pages. List them all with:

```shell
awk '/^  formerly:/{f=1;next} f&&/^    - /{print FILENAME": "$0;next} {f=0}' \
  src/content/docs/glossary/*.md
```

The architecture meeting is never "core architecture meeting": that one is not in the glossary.

## 3. Verify every claim

This is the part that matters most. Earlier reviews of this site found the same kinds of mistakes again and again. Never accept a claim because it sounds right.

For each statement about how something works, what a command does, a name, a number, a date, a person, a team, or a process:

1. Find the source. Code and repository files are true on the default branch of their repository, like `dev` for core and frontend. The table is in the [`fact-check` skill](../fact-check/SKILL.md#where-the-truth-lives), with the commands to read a file without a local clone. When the pull request documents a feature from an open code pull request, check claims about that feature against the code pull request instead.
2. Read the source yourself. Do not trust the old developers site, the pull request description, or another page of this site as proof.
3. Compare word by word. Quote the source verbatim in your evidence. A summary from a tool that fetches a page can garble it: read the page yourself before you rely on a detail. Pay most attention to:
   - **Absolute words**: "every", "all", "always", "only", "never", "nothing", "any", "cannot". Look for the exception: a second code path, an outer validation, a fallback, a feature flag. A rule like "never do X" is guidance, and fine.
   - **Quantities in passing**: "most", "many", "every day", "thousands". An introduction sentence is a claim too.
   - **Lost conditions**: "checked when the option is set" turned into "checked".
   - **Organization and process claims**: who employs, funds, or decides; teams, roles, and channels; review times, schedules, and promises. No code proves these. They need an official page, or a confirmed fact (see the confirmed facts in the `fact-check` skill). Treat them as unsourced until you find that.
   - **Copied facts that change**: schedules, versions, counts, lists of people. The page needs `source` and `lastVerified` in its front matter (see "Facts that go stale" in the rules). A source link proves where a fact came from, not that it is still true: check the value today.
   - **Comments in code examples** that promise something the code does not do.
4. Check neighboring pages. A guide that contradicts its reference page, or a short rule that contradicts the detailed one, is a finding even when one of them is right.

## 4. Walk the examples and steps

- **Lifecycle boundaries.** For every code example, ask what happens at the first update, on unload and reload, on reset, on a migration, after a downgrade, when an entity disappears and comes back, at zero or 100%, and with an empty list. Run small snippets when you can.
- **Steps in order.** Follow a sequence of steps from a fresh setup, as the reader would. Look for a missing `cd`, an unclear working folder, a missing install, a config step that a later step depends on.
- **Current API.** Check names, signatures, and imports against the default branch of the repository, not your memory. For a feature from an open code pull request, check them against that pull request. Its open state is not a finding.
- **Mermaid.** Every label must match the code it describes.

## 5. Check structure, links, and glossary

- Front matter, headings, area skeleton, and sidebar fields: see "Front matter", "Sidebar groups", and "Area skeleton" in the rules.
- **Moved pages.** For a page that moved or was renamed, there must be a row in `redirects/<area>.tsv` with the old path. `pnpm links` checks that redirects land on a page, not that one exists for every move: compare the file list of the pull request (`gh pr diff <number> --name-only`) against the redirect maps.
- **Renamed headings.** For a renamed heading on a page that old links point to, the pull request must update `redirects/fragments.tsv`: run `pnpm build`, then `pnpm fragments`, and review the rows it adds or drops. Find those pages with `grep -h "<new path>" redirects/*.tsv`.
- **Glossary autolinks.** For a new or changed `autolink` word, find where it links in the built site, and read each match in context:

  ```shell
  grep -roP '.{0,80}<a href="/glossary/<term>/" class="glossary-term">[^<]*</a>.{0,80}' dist/ \
    --include=index.html
  ```

  Every match must mean the term. If one does not, the word does not belong in `autolink`.

## 6. Check the site code

For files outside `src/content/`, use the site checklist, and check what the code does, not what its comments say:

- Open the page in the browser (`pnpm dev`, or `pnpm build` and `pnpm preview`). Test with the keyboard only, at phone, tablet, and desktop width, in light and dark, with the sidebar open and collapsed.
- Calculate contrast for text with `opacity` or a blended background, after compositing.
- Look at the generated HTML in `dist/` for duplicate `id`s and heading structure.
- For each comment that describes a guarantee, find the code that keeps it.

Without a browser, inspect the generated HTML in `dist/` and the CSS, calculate contrast with a small script, and mark what you could not test, like keyboard flow and screen reader output, as **unverified**.

## 7. Report

Report only what you verified. For each finding:

- **Severity**:
  - **Critical**: wrong in a way that breaks something or misleads readers into harm, like a wrong security claim or a broken build.
  - **High**: a false claim, an example that fails, steps that do not work, a missing redirect, an inaccessible control.
  - **Medium**: a code comment that promises what the code does not do, a lost condition, an unsourced organization claim, a stale copied fact, a contradiction with another page, a wrong autolink.
  - **Low**: writing rules, wording, small consistency issues.
- **Where**: file and line, or the heading.
- **What is wrong**, in one or two sentences.
- **Evidence**: the source path and branch and what it says, the command and its output, or the measured value.
- **Fix**: what the text or code should say. Never replace a guess with a guess: if you do not know the right value, say to remove the claim.

Mark anything you could not check as **unverified**, with what you would need to check it. Do not list what is already good: a review is a list of what to change. (The `fact-check` skill does list what it checked, because it changes pages itself.)

Write each finding like this:

```markdown
**[HIGH] src/content/docs/<area>/<page>.md:42**
- What: The example reads `data[0]`, which fails when the device returns an empty list.
- Evidence: `homeassistant/components/<domain>/coordinator.py` on core `dev` returns `[]` when nothing is connected.
- Fix: Check for an empty list before reading the first item.
```

End with an overall verdict: approve, comment, or request changes, and a numbered list of the findings:

```text
Overall: request changes.
1. [HIGH] <file>:<line> The example reports 0 when the device is at 1%.
2. [MEDIUM] <file>:<line> The review time has no source.
3. [LOW] <file>:<line> Em dash.
```

On a pull request, post the review as a single comment only when you are asked to.

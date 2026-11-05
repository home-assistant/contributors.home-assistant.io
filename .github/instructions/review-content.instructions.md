---
applyTo: "src/content/**"
---

# Reviewing pages and blog posts

The writing rules are in `.github/copilot-instructions.md`. For an in-depth review, follow the `review` skill in `.github/skills/review/`. Flag these, with the line:

## Claims

- A claim without a source the author could have read: code, a repository file, or an official page. Be strictest with claims no code can prove: who employs, funds, or decides; teams, roles, and channels; numbers, timings, and promises.
- Absolute words in a claim about behavior: "every", "all", "always", "only", "never", "nothing", "any", "cannot". Ask for the source that covers every path. A rule like "never do X" is guidance and is fine.
- A condition lost in a summary: "checked by some features" written as "enforced everywhere".
- Copied facts that go stale (schedules, versions, counts, lists of people) without `source` and `lastVerified` in the front matter. A source link proves where a fact came from, not that it is still true.
- Prose that teaches a pattern another page, hassfest, or pylint rejects.
- Text that says code in another repository is wrong or should change. Describe what it does.

## Examples and steps

- An example that breaks across a lifecycle boundary: first update, unload, reload, reset, migration, downgrade, an entity that disappears and comes back, zero or 100%, an empty list.
- Steps that fail when followed in order from a fresh setup: a missing `cd`, an unclear folder, a missing install or config step.
- Code that does not match the current API on the default branch of its repository (`dev` for core and frontend), or fence lines over 80 characters, or a fence without a language.
- When the pull request documents an open pull request in another repository, check the new feature against that pull request, not the default branch. Documentation merges after the code, so never flag that the feature is not merged yet. Do flag a release named for it while the code pull request is open. Once it is merged, accept any release evidence you can check, like the version in `homeassistant/const.py` at the merge commit for core, a release tag, or a milestone. A missing milestone alone is not a finding.
- A Mermaid label that does not match the code it describes.

## Front matter and structure

- A page without `title` and `description`, or a heading that skips a level, or content starting at `#`.
- A new page in an area that breaks its skeleton: overview, first contribution (order 1), how it works (order 2), guides, reference.
- A folder nested deeper than one level, or a folder called "docs".
- A `sidebarGroup` that is not listed in `sidebarGroups` of the folder's `index.md`.
- Generated pages edited by hand: `src/content/docs/apps/bashio/` (all but `index.md`).

## Links, moves, and glossary

- A moved or renamed page without a row in `redirects/<area>.tsv` for its old path.
- A renamed heading on a page that old links point to, without checking `redirects/fragments.tsv` (`pnpm build`, then `pnpm fragments`).
- Internal links that are not absolute with a trailing slash, links to developers.home-assistant.io, bare URLs, or tracking links.
- A new `autolink` word in `src/content/docs/glossary/` that also means something else elsewhere on the site, like "theme" or "unavailable".

## Words

- Former names in new text: "service" for an action, "add-on" for an app, "Lovelace" for a dashboard, "component" for an integration, "breaking change" for a backward-incompatible change, "Home Assistant Cloud" for Home Assistant Link, "core architecture meeting" for the architecture meeting. Code identifiers and quoted API paths are fine.
- Em dashes or en dashes, anywhere.
- "e.g.", "i.e.", "etc.", "click" (unless it is a mouse action), "HA" or "HASS", "master/slave".
- Title case in headings, British spelling, "the user" instead of "you", CAPS or bold for emphasis.
- Hard-wrapped paragraphs. Write one line per paragraph.
- Callouts that are not GitHub alerts (`> [!NOTE]`), or a page full of them.
- YAML examples that break the YAML style: truthy booleans, flow mappings, single quotes, a list with one item.
- Images without meaningful alt text.

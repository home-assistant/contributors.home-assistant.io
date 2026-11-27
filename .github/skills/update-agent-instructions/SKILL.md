---
name: update-agent-instructions
description: Use this if the user wants to update the agent instructions for the Home Assistant contributors website, or sync the writing guidelines shared with home-assistant.io.
---

# Update agent instructions

Update `.github/copilot-instructions.md`, the agent instructions for this site. `CLAUDE.md` and `AGENTS.md` are symlinks to it.

## Shared section

The "Brand personality" section is shared with home-assistant.io.
Its source is the "Brand personality" section of the writing style skill of home-assistant.io:

- `https://raw.githubusercontent.com/home-assistant/home-assistant.io/current/.claude/skills/home-assistant-docs-writing-style/SKILL.md`

The skill uses shorter wording than this file, so do not copy it verbatim.
Update the section so that its rules match its source: add new rules, change rules that changed, and remove rules that the source dropped.
Do not edit the section in any other way.
If the writing style skill has a new rule that applies to all Home Assistant writing, mention it to the user instead of adding it.

## Style guide imports

The "General language" and "YAML" sections import the style guide pages of this site, `src/content/docs/writing/reference/style.md` and `src/content/docs/writing/reference/yaml.md`.
Do not copy rules from those pages into the instructions.
Keep the import paths relative to `.github/copilot-instructions.md`, like `@../src/content/docs/writing/reference/style.md`, because Claude Code resolves them from there.

Copilot code review does not load imported files.
It reviews the writing with `.github/instructions/review-writing.instructions.md`, a short form of both pages.
When a rule on one of those pages changes, update that checklist too.

## Site specific sections

All other sections describe this site. Review them against the repository:

- `src/data/areas.ts` for the list of areas.
- `src/content.config.ts` for the front matter of pages and blog posts.
- `astro.config.ts` for Markdown features like callouts.
- `package.json` for the available scripts.

## Rules

- Preserve the existing structure and wording where possible.
- Prefer small, reviewable edits over broad rewrites.
- Do not wrap lines at a fixed width. Write each sentence on its own line, or keep a paragraph on a single line.
- Do not edit any other files, except to keep them in step: the checklists in `.github/instructions/` repeat some rules in short form, and the skills in `.github/skills/` link to sections of the instructions by name. When you change a rule or rename a section, update those too.

If a remote source cannot be fetched, stop and report the missing source instead of guessing.

After editing, give a short summary of the changes.

---
name: update-agent-instructions
description: Use this if the user wants to update the agent instructions for the Home Assistant contributors website, or sync the writing guidelines shared with home-assistant.io.
---

# Update agent instructions

Update `.github/copilot-instructions.md`, the agent instructions for this site. `CLAUDE.md` and `AGENTS.md` are symlinks to it.

## Shared sections

The "Brand personality" and "YAML" sections (including "Home Assistant YAML") are shared with home-assistant.io.
Their sources are the writing skills of home-assistant.io:

- "Brand personality": the "Brand personality" section of `https://raw.githubusercontent.com/home-assistant/home-assistant.io/current/.claude/skills/home-assistant-docs-writing-style/SKILL.md`
- "YAML" and "Home Assistant YAML": `https://raw.githubusercontent.com/home-assistant/home-assistant.io/current/.claude/skills/home-assistant-yaml-style/SKILL.md`

The skills use different headings and shorter wording than this file, so do not copy them verbatim.
Update each shared section so that its rules match its source: add new rules, change rules that changed, and remove rules that the source dropped.
Keep the structure and examples of this file, and its notes about this site, like that it has no Liquid.
Leave out rules that only apply to the home-assistant.io website, like its Jekyll and Liquid setup or its textlint configuration.
Do not edit the shared sections in any other way.
If the writing style skill has a new rule that applies to all Home Assistant writing, outside the shared sections, mention it to the user instead of adding it.

The "General language" section is no longer shared, because home-assistant.io moved its writing rules into skills and rewrote them.
It is maintained in this repository.
Keep it in step with the style guide in `src/content/docs/writing/reference/style.md`.

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

---
name: update-agent-instructions
description: Use this if the user wants to update the agent instructions for the Home Assistant contributors website, or sync the writing guidelines shared with home-assistant.io.
---

# Update agent instructions

Update `.github/copilot-instructions.md`, the agent instructions for this site. `CLAUDE.md` and `AGENTS.md` are symlinks to it.

## Shared sections

The "Brand personality", "General language", and "YAML" sections (including "Home Assistant YAML") are shared with home-assistant.io. Copy them verbatim from:

- `https://raw.githubusercontent.com/home-assistant/home-assistant.io/current/.github/copilot-instructions.md`

Replace each shared section in this repository with the current version of the same section from that file. Do not edit the shared sections in any other way. If the source has a new section that applies to all Home Assistant writing (not to the home-assistant.io website or its Jekyll setup), mention it to the user instead of adding it.

## Site specific sections

All other sections describe this site. Review them against the repository:

- `src/data/areas.ts` for the list of areas.
- `src/content.config.ts` for the front matter of pages and blog posts.
- `astro.config.ts` for Markdown features like callouts.
- `package.json` for the available scripts.

## Rules

- Preserve the existing structure and wording where possible.
- Prefer small, reviewable edits over broad rewrites.
- Write in flowing text. Do not hard wrap lines.
- Do not edit any other files, except to keep them in step: the checklists in `.github/instructions/` repeat some rules in short form, and the skills in `.github/skills/` link to sections of the instructions by name. When you change a rule or rename a section, update those too.

If a remote source cannot be fetched, stop and report the missing source instead of guessing.

After editing, give a short summary of the changes.

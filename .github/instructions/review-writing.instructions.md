---
applyTo: "src/content/**"
---

# Reviewing the writing of pages and blog posts

This is the short form of the style guide (`src/content/docs/writing/reference/style.md`) and the YAML style guide (`src/content/docs/writing/reference/yaml.md`). Flag these, with the line:

## Words

- Former names in new text: "service" for an action, "add-on" for an app, "Lovelace" for a dashboard, "component" for an integration, "breaking change" for a backward-incompatible change, "Home Assistant Cloud" for Home Assistant Link, "core architecture meeting" for the architecture meeting. Code identifiers and quoted API paths are fine.
- Em dashes or en dashes, anywhere.
- "e.g.", "i.e.", "etc.", "click" (unless it is a mouse action), "HA" or "HASS", "master/slave".
- Title case in headings, British spelling, "the user" instead of "you", CAPS or bold for emphasis.
- Names spelled differently from their owners, like "Zwave" or "Github".

## Formatting

- Paragraphs wrapped at a fixed width, with line breaks in the middle of sentences. Each sentence on its own line, or a whole paragraph on one line, is fine.
- A missing Oxford comma, or two spaces after a period.
- UI elements not in bold, or a path through the UI without `>` between the steps.
- Bullets with `*` or `+`, or an ordered list with `1.` on every item.
- A list where some items end with a period and others do not.
- Callouts that are not GitHub alerts (`> [!NOTE]`), or a page full of them.
- Images without meaningful alt text.

## YAML examples

- Truthy booleans (`yes`, `on`, `True`), flow mappings, single-quoted strings, or explicit nulls (`~`, `null`).
- Indentation other than 2 spaces, or list items not indented under their key.
- A comment without a space after `#` or a capital letter.
- `\n` or a long single-line string instead of `|` or `>`.
- Options set to their default, or empty sections: `mode: single`, `conditions: []`, `data: {}`.
- Placeholders not in capitals with underscores, like `YOUR_API_KEY`.
- A list around a single value, or several values in one comma-separated string.
- An `entity_id` at the action level or under `data`, instead of under `target`.
- A single mapping for `triggers`, `conditions`, `actions`, or `sequence`, instead of a list.
- A template where plain YAML can do the job, double quotes inside a template, a filter without spaces around `|`, or the `states` object instead of `states()`, `is_state()`, `state_attr()`, or `is_state_attr()`.

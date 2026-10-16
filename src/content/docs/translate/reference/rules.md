---
title: Translation rules
description: The rules that apply to every language. Short, and worth reading before you start.
order: 1
---

These rules apply to every language. Some languages have [extra guidelines](/translate/reference/languages/) on top.

- **Only translate into your native language.** Machine translation and second languages show, and native speakers notice right away.
- **Do not translate names.** Product and brand names stay as they are: Home Assistant, Supervisor, Hue, Z-Wave, Matter.
- **Keep placeholders intact.** A placeholder name between curly brackets, like `{name}`, stays exactly as it is. In plurals and choices, keep the keywords and the brackets, and translate the text inside the inner brackets. See [Placeholders and references](/translate/guides/placeholders/).
- **Match the tone of Home Assistant.** Friendly, clear, and direct. Write the way you would explain something to a friend, not the way a manual would.
- **Keep it short where space is short.** Buttons, badges, and state names often have little room. For example, translations under `state_badge` are shown on small badges, so they need to be short. To try one out, open **Settings** > **Tools** > **States**, set a state on a test entity like `device_tracker.test`, and use your translation as the state.
- **Reuse, do not repeat.** If the same text appears in multiple strings, link them with a reference.
- **Be consistent.** Use the same word for the same thing everywhere. If your language has agreed on a term, use it.
- **Ask when in doubt.** Leave a comment on the string in Lokalise. A question is better than a guess.

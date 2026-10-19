---
title: Language leaders
description: Every language in the intents repository has leaders who review its changes. What the role involves, and how to become one.
order: 5
---

Assist should understand people in their own language, and understand them well. To keep the quality of each language up, languages have language leaders: native speakers who look after their language.

## What language leaders do

- **Review every change to their language.** They are notified of each pull request that touches the folders of their language, and they decide whether it gets merged.
- **Guard the quality.** They check that sentences are correct, natural, and consistent with the rest of the language. A sentence that slips through matches the wrong things, or does not match at all.
- **Keep the language consistent.** They decide on choices like formal or informal address, and on the words to use for common things.

Language leaders own the `sentences/`, `responses/`, `tests/`, `rules/`, and `lists/` folders of their language. They do not need anyone else's approval to change them.

## Who the leaders are

The leaders of each language are listed under `leaders` in [`languages.yaml`](https://github.com/OHF-Voice/intents/blob/main/languages.yaml), with their GitHub usernames. The [`CODEOWNERS`](https://github.com/OHF-Voice/intents/blob/main/CODEOWNERS) file is generated from that list, which is how GitHub knows whom to ask for a review. You also find them in the table of [supported languages](/translate/voice/languages/).

## Become a language leader

Anyone can apply, if you:

- Are a native speaker of the language.
- Have made at least two pull requests to the intents repository.
- Help review pull requests for the language.

To apply, start a topic in the [intents discussions](https://github.com/OHF-Voice/intents/discussions), or ask in **#developers** on the Home Assistant [Discord server](https://www.home-assistant.io/join-chat).

Some languages have no leader yet. If yours is one of them, that is your chance: contribute, review what others open, and apply.

## Losing the role

A language leader is the gatekeeper of a language. When a leader is inactive, contributions to the language wait. When a leader accepts low quality changes, Assist stops understanding people correctly.

So if a leader becomes a bottleneck, or the quality is not good enough, they are removed as leader. They can apply again later.

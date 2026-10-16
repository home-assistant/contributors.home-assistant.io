---
title: How Assist understands language
description: Intents, sentences, slots, lists, and responses. The ideas behind Assist, and how a spoken command becomes an action.
order: 1
sidebarLabel: How Assist understands
---

Before you write your first sentence, it helps to know what happens to it. This page follows a command from the moment someone speaks it to the moment Assist answers.

## From voice to action

When you talk to Assist, your command goes through a few steps. Together, they are called the [Assist pipeline](/glossary/assist-pipeline/):

1. **Speech to text** turns the audio into a sentence, like "turn on the kitchen lights".
2. **Conversation** works out what the sentence means. The built-in [conversation agent](/glossary/conversation-agent/) does that by matching the sentence against the templates in the [intents repository](https://github.com/OHF-Voice/intents). The result is an intent.
3. **Intent handling** carries out the intent, for example by turning on the lights in the kitchen.
4. **The response** is rendered from a template in your language, like "Turned on the lights".
5. **Text to speech** speaks that response.

Step 2 and step 4 are where your work comes in. The sentences and responses are in the [intents repository](https://github.com/OHF-Voice/intents). They are published as the `home-assistant-intents` package, which Home Assistant includes.

Integrations can plug in their own engines for some of these steps: a [conversation agent](/core/entities/conversation/), [speech to text](/core/entities/stt/), or [text to speech](/core/entities/tts/). Your sentences are used by the built-in conversation agent.

You can also type to Assist. Then the speech steps are skipped, but the matching works the same.

## Intents

An [intent](/glossary/intent/) is what a sentence means, in a form Home Assistant can act on. "Turn on the kitchen lights", "kitchen lights on", and "switch on the lights in the kitchen" are three sentences with the same intent: `HassTurnOn`, for the lights in the kitchen.

Intent names start with `Hass`, like `HassTurnOn`, `HassGetState`, or `HassStartTimer`. The list of intents is the same for every language. It is defined in [`intents.yaml`](https://github.com/OHF-Voice/intents/blob/main/intents.yaml), and [Built-in intents](/translate/voice/intents/) describes each of them.

## Slots

A slot is a piece of information the intent needs. In "turn on the kitchen lights", there are two:

- `area` is "kitchen".
- `domain` is "light", because the word "lights" tells Assist which kind of device you mean.

Some slots are filled with something the user has set up in Home Assistant: `name` (the name of an entity), `area`, and `floor`. Home Assistant provides those while it matches a sentence. Other slots come from lists in the repository, like colors, or from numbers, like a brightness of 50 percent.

## Slot combinations

People ask for the same thing in different ways. "Turn on the overhead light" names one entity. "Turn on the lights in the kitchen" names an area and a kind of device. Each set of slots a sentence fills is a slot combination, with its own name:

- `name_only`: "turn on the overhead light"
- `area_domain`: "turn on the lights in the kitchen"
- `domain_only`: "turn on the lights in here", where the area is the one of the voice satellite you are talking to

Sentences and tests are organized per intent and per slot combination. Each slot combination has an importance level that says how much a language needs it, from `required` to `optional`. The [progress overview](https://ohf-voice.github.io/intents/) uses those levels to score each language.

## Sentence templates

You do not write every possible sentence. You write templates, which describe many sentences at once:

```text
(turn | switch) on [the] {name}
```

This matches "turn on the overhead light", "switch on overhead light", and every other mix of those words. `( | )` lists alternatives, `[ ]` marks optional words, and `{name}` is a slot. The engine that matches templates is [hassil](https://github.com/OHF-Voice/hassil). [Template sentence syntax](/translate/voice/template-syntax/) has the full reference.

## Lists and expansion rules

Two tools keep templates short and readable:

- **Lists** hold the possible values of a slot, like the colors a light can have. A list can also be a range of numbers, or a wildcard that matches any text, like the name of a song.
- **Expansion rules** are reusable pieces of a template. A rule called `turn` that holds `(turn | switch)` lets you write `<turn> on [the] {name}` in every file.

Both are defined per language, because the words differ per language.

## Responses

After Home Assistant handles an intent, Assist answers. The answer comes from a response template in your language, written in [Jinja2](https://jinja.palletsprojects.com/en/latest/templates/). A response can use the values of the slots, and some intents give it more to work with, like the state of the entity you asked about:

```yaml
one: "{{ slots.name | capitalize }} is {{ state.state_with_unit }}"
```

Every group of sentences points to the response that fits it. That way, "open the garage door" can answer "Opening", while "turn on the lamp" answers "Turned on the light".

## Tests

Every sentence template needs at least one test sentence. A test describes a small home (some areas, some entities), a few sentences, the slots they should fill, and the exact response Assist should give. Tests run on every pull request, so your sentences keep working when someone else changes something. [Test syntax](/translate/voice/test-syntax/) explains how to write them.

## Next step

Ready to try it? [Contribute sentences and responses](/translate/voice/contributing/) walks you through your first change.

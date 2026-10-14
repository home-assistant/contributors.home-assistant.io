---
title: Conversation API
description: Send text to a conversation agent over the REST or WebSocket API, and read the response it gives back.
sidebarGroup: Voice and AI
order: 52
---

The `conversation` integration takes a sentence, hands it to a [conversation agent](/glossary/conversation-agent/), and returns the agent's response. The built-in agent matches the sentence to an [intent](/core/internals/intents/) and handles it. Other agents, like those backed by a large language model, do it their own way. The response looks the same either way.

To build an agent yourself, see the [conversation entity](/core/entities/conversation/). This page is about calling one.

## Send a sentence

Over the REST API, POST to `/api/conversation/process`:

```json
{
  "text": "turn on the lights in the living room",
  "language": "en"
}
```

Over the WebSocket API, send `conversation/process` with the same fields:

```json
{
  "id": 5,
  "type": "conversation/process",
  "text": "turn on the lights in the living room",
  "language": "en"
}
```

| Field | Description |
| --- | --- |
| `text` | Required. The sentence. |
| `language` | The language of the sentence. Defaults to the language of the instance. |
| `agent_id` | The agent to use. Defaults to the built-in agent, `conversation.home_assistant`. |
| `conversation_id` | Continues an earlier conversation. See [conversations](#conversations). |
| `device_id` | The device the sentence came from, like a voice satellite. |
| `satellite_id` | The entity ID of the satellite the sentence came from. |

## The response

```json
{
  "response": {
    "response_type": "action_done",
    "language": "en",
    "data": {
      "success": [
        {"name": "Living Room", "type": "area", "id": "living_room"},
        {"name": "Ceiling", "type": "entity", "id": "light.ceiling"}
      ],
      "failed": []
    },
    "speech": {
      "plain": {
        "speech": "Turned on the lights",
        "extra_data": null
      }
    },
    "card": {}
  },
  "conversation_id": "01J9Z7K1M3S8TQ0Y6E4H2B5N7C",
  "continue_conversation": false
}
```

- `response_type`: what happened. See below.
- `data`: depends on the response type.
- `speech`: what to say to the user. Under `plain` for plain text, or `ssml` for [SSML](https://www.w3.org/TR/speech-synthesis11/).
- `conversation_id`: pass it with the next sentence to continue the conversation.
- `continue_conversation`: `true` if the agent expects an answer from the user, like after asking a question.

### Action done

The intent did something, like turning on a light. `data.success` lists the targets that were acted on, and `data.failed` the ones that failed. Each target has a `name`, a `type`, and an optional `id`. The type is one of `floor`, `area`, `domain`, `device_class`, `device`, `entity`, or `custom`.

Targets build on each other, from general to specific. "Turn off all lights" has one target, `domain` light. "Turn on the kitchen lights" has two: `area` kitchen and `domain` light. "Open the kitchen blinds" has three: `area` kitchen, `domain` cover, and `device_class` blind.

### Query answer

The response answers a question, like "what is the temperature?". The answer is in `speech`, and `data.success` lists what was asked about.

### Error

Something went wrong. `data.code` says what, and `speech` has a message for the user:

- `no_intent_match`: the sentence did not match any intent.
- `no_valid_targets`: the area, device, or entity does not exist, or is not exposed.
- `failed_to_handle`: an error while handling the intent.
- `unknown`: an error outside intent handling.

## Conversations

An agent that supports it keeps track of a conversation, so "and in the kitchen?" makes sense after "turn on the lights in the living room". Every response has a `conversation_id`. Send it along with the next sentence to continue:

```json
{
  "text": "and in the kitchen?",
  "conversation_id": "01J9Z7K1M3S8TQ0Y6E4H2B5N7C"
}
```

## Preload sentences

Loading the sentences of a language takes a moment. To have them ready before the first request, send `conversation/prepare` over the WebSocket API, with an optional `language` and `agent_id`:

```json
{
  "id": 6,
  "type": "conversation/prepare",
  "language": "en"
}
```

## Other WebSocket commands

- `conversation/agent/list`: the available agents, optionally filtered by `language` and `country`.
- `conversation/sentences/list` (admin): the sentences registered by sentence triggers in automations.
- `conversation/agent/homeassistant/language_scores`: how well the built-in agent supports each language, and the preferred language for the given `language` and `country`.
- `conversation/agent/homeassistant/debug`: shows how the built-in agent matches a list of `sentences`, without acting on them. Useful while writing sentences.

---
title: Conversation entity
description: Build a conversation agent that takes text from Assist and answers it, with or without a language model behind it.
sidebarLabel: Conversation
sidebarGroup: Voice and AI
---

A conversation entity is a [conversation agent](/glossary/conversation-agent/): it receives what someone typed or said, and returns a response. Assist sends text to it as part of an [Assist pipeline](/glossary/assist-pipeline/), and so do the `conversation.process` action and the chat in the frontend. Inherit from `ConversationEntity` in `homeassistant.components.conversation`.

Most conversation entities today wrap a large language model (LLM). Home Assistant does the heavy lifting around it: it keeps the chat history in a chat log, gives the model tools to control the home through the LLM API, and turns the last message into a spoken response. Your entity translates between that chat log and the API of the model.

## Properties

Conversation entities have these properties on top of the [generic entity properties](/core/entities/entity-class/).

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `supported_languages` | `list[str] \| Literal["*"]` | Required | The languages the agent understands. Return `"*"` (`MATCH_ALL`) when it handles any language, which is usual for an LLM. |
| `supports_streaming` | `bool` | `False` | Whether the agent streams its response. Set it to `True` when you feed the chat log with `async_add_delta_content_stream`, so Assist can start speaking before the full answer is in. |

`supported_languages` has no `_attr_` shortcut: implement it as a property.

## Supported features

Combine the values of `ConversationEntityFeature` with the bitwise or (`|`) operator.

| Value | Description |
| ----- | ----------- |
| `CONTROL` | The agent can control devices in Home Assistant, usually because the user gave it access to the LLM API. When local intents are preferred in the pipeline, Assist then leaves some sentences to your agent instead of handling them locally. |

## The chat log

Home Assistant hands every message to your entity together with a `ChatLog`. The chat log holds the whole conversation so far, as a list of content objects in `chat_log.content`:

- `SystemContent`: the system prompt.
- `UserContent`: what the user said, with optional `attachments`.
- `AssistantContent`: what the agent said, with optional `tool_calls` and `thinking_content`.
- `ToolResultContent`: the result of a tool call.

The chat log lives for the duration of a chat session, so a follow-up question arrives with the earlier messages already in place. You never store history yourself.

These are the calls you use most:

- `await chat_log.async_provide_llm_data(llm_context, user_llm_hass_api, user_llm_prompt, user_extra_system_prompt)`: builds the system prompt and attaches the LLM API the user picked in your options. Pass `user_input.as_llm_context(DOMAIN)` as the context. It raises `ConverseError` when something is wrong, which you turn into a result with `err.as_conversation_result()`.
- `chat_log.llm_api`: the LLM API instance after the call above, or `None`. Its `tools` are what you offer to the model, and `custom_serializer` converts their schemas.
- `chat_log.async_add_delta_content_stream(agent_id, stream)`: the way to add a streamed response. Feed it dictionaries with `role`, `content`, `thinking_content`, or `tool_calls`. It runs the tool calls for you and yields every message it adds, so you can loop until `chat_log.unresponded_tool_results` is `False`.
- `chat_log.async_add_assistant_content(content)`: the non streaming variant. It also runs tool calls and yields their results.
- `chat_log.async_add_assistant_content_without_tools(content)`: adds a plain response. Use it for agents without tools.

When the model is done, `async_get_result_from_chat_log(user_input, chat_log)` builds the `ConversationResult` from the last assistant message. It also sets `continue_conversation` when the last message ends with a question mark (the Greek and Chinese question marks count too), so a voice satellite keeps listening for the answer.

The full typed API is in [`chat_log.py`](https://github.com/home-assistant/core/blob/dev/homeassistant/components/conversation/chat_log.py).

## Methods

### Handle a message

Implement `_async_handle_message`. Home Assistant has already created the chat log and added the user message to it when this runs.

```python
async def _async_handle_message(
    self,
    user_input: ConversationInput,
    chat_log: ChatLog,
) -> ConversationResult:
    """Process a sentence."""
```

`ConversationInput` holds the request:

| Name | Type | Description |
| ---- | ---- | ----------- |
| `text` | `str` | What the user said. |
| `context` | `Context` | The context to attach to actions you take. |
| `conversation_id` | `str \| None` | The ID of the conversation, for multi turn conversations. |
| `device_id` | `str \| None` | The device the request came from, like a voice satellite. |
| `satellite_id` | `str \| None` | The entity ID of the Assist satellite the request came from. |
| `language` | `str` | The language of the text. Falls back to the language of Home Assistant. |
| `agent_id` | `str` | The agent that handles the request. |
| `extra_system_prompt` | `str \| None` | Extra instructions for the model, for example from a `start_conversation` action. |

Return a `ConversationResult` with an `intent.IntentResponse` as `response`, and optionally `conversation_id` and `continue_conversation`.

Older integrations override `async_process` instead. That still works, but you lose the chat log handling, so new code implements `_async_handle_message`.

### Prepare

`async_prepare(language)` is optional. Home Assistant calls it as soon as it knows a request is coming, so you can load a model or other resources ahead of time.

## States

The state is the timestamp of the last message the entity handled, or `unknown` before the first one. Home Assistant sets and restores it; the `state` property is final.

## Example

A conversation entity that streams the response of a model and lets it use the tools of the LLM API.

```python
from typing import Literal

from homeassistant.components import conversation
from homeassistant.const import CONF_LLM_HASS_API, MATCH_ALL

from .const import DOMAIN


class MyConversationEntity(conversation.ConversationEntity):
    """A conversation agent backed by a language model."""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_supports_streaming = True

    def __init__(self, entry: MyConfigEntry) -> None:
        """Set up the entity."""
        self.entry = entry
        self._attr_unique_id = entry.entry_id
        if entry.options.get(CONF_LLM_HASS_API):
            self._attr_supported_features = (
                conversation.ConversationEntityFeature.CONTROL
            )

    @property
    def supported_languages(self) -> list[str] | Literal["*"]:
        """Return the supported languages."""
        return MATCH_ALL

    async def _async_handle_message(
        self,
        user_input: conversation.ConversationInput,
        chat_log: conversation.ChatLog,
    ) -> conversation.ConversationResult:
        """Process a sentence."""
        try:
            await chat_log.async_provide_llm_data(
                user_input.as_llm_context(DOMAIN),
                self.entry.options.get(CONF_LLM_HASS_API),
                self.entry.options.get("prompt"),
                user_input.extra_system_prompt,
            )
        except conversation.ConverseError as err:
            return err.as_conversation_result()

        while True:
            stream = self.entry.runtime_data.stream(chat_log)
            async for _ in chat_log.async_add_delta_content_stream(
                self.entity_id, stream
            ):
                pass
            if not chat_log.unresponded_tool_results:
                break

        return conversation.async_get_result_from_chat_log(
            user_input, chat_log
        )
```

`runtime_data.stream` stands in for your client library: it sends the chat log to the model and yields delta dictionaries.

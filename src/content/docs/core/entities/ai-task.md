---
title: AI task entity
description: Build an AI task entity that lets automations ask a model to generate data or images.
sidebarLabel: AI task
sidebarGroup: Voice and AI
---

An AI task entity gives automations and scripts access to a model for one-off jobs, without a conversation around it: summarize these sensor readings, describe what the camera sees, write a fitting notification, or draw an image. People use it through the `ai_task.generate_data`, `ai_task.generate_image`, and `ai_task.evaluate` actions. Inherit from `AITaskEntity` in `homeassistant.components.ai_task`.

Integrations that offer a [conversation entity](/core/entities/conversation/) for a model usually offer an AI task entity as well, and share the code that sends a chat log to the model between the two.

## Properties

AI task entities have no properties of their own. The [generic entity properties](/core/entities/entity-class/) apply.

## Supported features

Combine the values of `AITaskEntityFeature` with the bitwise or (`|`) operator. Home Assistant checks them before it calls your entity, and refuses tasks the entity does not support.

| Value | Description |
| ----- | ----------- |
| `GENERATE_DATA` | The entity generates text or structured data. Implement `_async_generate_data`. |
| `SUPPORT_ATTACHMENTS` | The entity accepts attachments, like camera snapshots or files, with a task. |
| `GENERATE_IMAGE` | The entity generates images. Implement `_async_generate_image`. |
| `EVALUATE` | The entity answers evaluation questions. Implement `_async_evaluate`. |

## The chat log

Every data and image task arrives with a `ChatLog`, the same one a conversation entity gets. Home Assistant has already filled it: a system prompt for task work, the LLM API if the caller asked for one, and the instructions of the task as a user message, with its attachments. You send the chat log to the model, add the answer to it, and build the result from it. See [the chat log](/core/entities/conversation/#the-chat-log) on the conversation entity page for the API.

## Methods

### Generate data

```python
async def _async_generate_data(
    self, task: GenDataTask, chat_log: ChatLog
) -> GenDataTaskResult:
    """Handle a generate data task."""
```

`GenDataTask` has these fields:

| Name | Type | Description |
| ---- | ---- | ----------- |
| `name` | `str` | The name of the task, for logs and traces. |
| `instructions` | `str` | What the model should do. Already in the chat log. |
| `structure` | `probatio.Schema \| None` | The shape the data must have, or `None` for plain text. |
| `attachments` | `list[conversation.Attachment] \| None` | Files that go with the instructions. Already in the chat log. |
| `llm_api` | `llm.API \| None` | The LLM API the caller asked for. Already attached to the chat log. |

Return a `GenDataTaskResult` with the `conversation_id` of the chat log and the generated `data`: a string without a structure, or a dictionary that matches the structure.

### Generate image

```python
async def _async_generate_image(
    self, task: GenImageTask, chat_log: ChatLog
) -> GenImageTaskResult:
    """Handle a generate image task."""
```

`GenImageTask` has a `name`, `instructions`, and optional `attachments`. Return a `GenImageTaskResult`:

| Name | Type | Description |
| ---- | ---- | ----------- |
| `image_data` | `bytes` | The raw image. |
| `conversation_id` | `str` | The ID of the chat log. |
| `mime_type` | `str` | The type of the image, like `image/png`. |
| `width` | `int \| None` | The width in pixels, if known. |
| `height` | `int \| None` | The height in pixels, if known. |
| `model` | `str \| None` | The model that made the image, if known. |
| `revised_prompt` | `str \| None` | The prompt the model actually used, if it rewrote it. |

### Evaluate

```python
async def _async_evaluate(
    self, task: EvaluationTask
) -> EvaluationTaskResult:
    """Handle an evaluation task."""
```

An evaluation task asks the model to judge a set of questions against some state, attachments, or both, and answer with probabilities instead of free text. It gets no chat log. `EvaluationTask` has these fields:

| Name | Type | Description |
| ---- | ---- | ----------- |
| `name` | `str` | The name of the task, for logs and traces. |
| `questions` | `dict[str, EvaluationQuestion]` | The questions, keyed by an ID. |
| `state` | JSON value | The data to judge, or `None`. |
| `attachments` | `list[conversation.Attachment] \| None` | Files to judge. |

Home Assistant refuses a task that has neither `state` nor attachments. Every question has a `type` and `instructions`:

- `noul`: a yes or no question. Answer with a `NoulAnswer`, the probability of yes.
- `choice`: pick one of at least two named alternatives in `criteria`. Answer with a `ChoiceAnswer`: the chosen key and a probability per key.
- `score`: pick a level from the ordered list in `criteria`. Answer with a `ScoreAnswer`: the expected level index and a probability per level.

Return an `EvaluationTaskResult` with the `answers`, keyed by the same IDs as the questions.

## Structured output

In the action, users describe the structure with [selectors](/glossary/selector/): every field has a selector, and optionally a `description` and `required`. Fields are optional unless `required` is `true`, and the data may not contain fields outside the structure.

```yaml
structure:
  name:
    description: "The name of the animal"
    required: true
    selector:
      text:
  legs:
    selector:
      number:
```

Home Assistant turns that into a `probatio.Schema` before it reaches your entity, with the descriptions kept on the keys. Convert it to the schema format of your model, usually JSON schema, and ask the model for output in that format. Then parse the answer and return the dictionary. If the model returns something that does not parse, raise a `HomeAssistantError`.

## States

The state is the timestamp of the last task the entity handled, or `unknown` before the first one. Home Assistant sets and restores it; the `state` property is final.

## Example

```python
import json

from homeassistant.components import ai_task, conversation
from homeassistant.exceptions import HomeAssistantError

Feature = ai_task.AITaskEntityFeature


class MyAITask(ai_task.AITaskEntity):
    """AI tasks with a cloud model."""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_supported_features = Feature.GENERATE_DATA

    def __init__(self, entry: MyConfigEntry) -> None:
        """Set up the entity."""
        self.client = entry.runtime_data
        self._attr_unique_id = f"{entry.entry_id}_ai_task"

    async def _async_generate_data(
        self,
        task: ai_task.GenDataTask,
        chat_log: conversation.ChatLog,
    ) -> ai_task.GenDataTaskResult:
        """Send the chat log to the model and return its answer."""
        text = await self.client.complete(chat_log, task.structure)
        chat_log.async_add_assistant_content_without_tools(
            conversation.AssistantContent(
                agent_id=self.entity_id, content=text
            )
        )

        if not task.structure:
            return ai_task.GenDataTaskResult(
                conversation_id=chat_log.conversation_id, data=text
            )

        try:
            data = json.loads(text)
        except json.JSONDecodeError as err:
            raise HomeAssistantError("Model returned invalid JSON") from err

        return ai_task.GenDataTaskResult(
            conversation_id=chat_log.conversation_id, data=data
        )
```

`client.complete` stands in for your client library, which converts the chat log and the structure to the format of the model.

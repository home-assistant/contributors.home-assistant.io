---
title: Assist satellite entity
description: Build an Assist satellite entity for a device that listens for voice commands and speaks the response.
sidebarLabel: Assist satellite
sidebarGroup: Voice and AI
---

An Assist satellite entity represents a device with a microphone and usually a speaker that people talk to, like a voice assistant speaker. The device streams audio to Home Assistant, which runs an [Assist pipeline](/glossary/assist-pipeline/) on it and sends back the response. The entity tracks where in that conversation the device is, and lets automations make it speak or ask questions. Inherit from `AssistSatelliteEntity` in `homeassistant.components.assist_satellite`.

The entity does not do speech recognition or synthesis itself: that is the job of the [speech-to-text](/core/entities/stt/), [conversation](/core/entities/conversation/), and [text-to-speech](/core/entities/tts/) entities in the pipeline. The satellite entity moves audio and events between the device and the pipeline.

## Properties

Assist satellite entities have these properties on top of the [generic entity properties](/core/entities/entity-class/). Every property can be set with its `_attr_` attribute, like `_attr_pipeline_entity_id`.

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `pipeline_entity_id` | `str \| None` | `None` | The entity ID of the [select entity](/core/entities/select/) that picks the pipeline for this device. With `None`, the preferred pipeline is used. |
| `vad_sensitivity_entity_id` | `str \| None` | `None` | The entity ID of the select entity that sets how sensitive voice activity detection is, which decides how long a silence ends the command. |
| `tts_options` | `dict[str, Any] \| None` | `None` | Options passed to text-to-speech for responses, like the preferred audio format of the device. See [options and audio formats](/core/entities/tts/#options-and-audio-formats). |

The `assist_pipeline` integration has ready made select entities for the pipeline and the sensitivity that you can add to the same device.

## Supported features

Combine the values of `AssistSatelliteEntityFeature` with the bitwise or (`|`) operator.

| Value | Description |
| ----- | ----------- |
| `ANNOUNCE` | The device can play an announcement that Home Assistant starts. Implement `async_announce`. Enables the `assist_satellite.announce` action and the connection test in the frontend. |
| `START_CONVERSATION` | The device can play an announcement and then listen for a reply. Implement `async_start_conversation`. Enables the `assist_satellite.start_conversation` action. The `assist_satellite.ask_question` action uses it as well. Starting a conversation fails when the pipeline uses the built-in Home Assistant conversation agent, which does not keep a conversation going. |

## Running a pipeline

When the device hears its wake word or someone presses its button, start a pipeline with `async_accept_pipeline_from_satellite`, and pass it the audio stream of the device. Don't run pipelines in another way: this method picks the pipeline, keeps the conversation ID across turns, and handles announcements and questions that are in progress.

```python
await self.async_accept_pipeline_from_satellite(
    audio_stream,
    start_stage=PipelineStage.STT,
    end_stage=PipelineStage.TTS,
    wake_word_phrase="okay nabu",
)
```

The audio must be 16 kHz, 16-bit, mono PCM. Pass `wake_word_phrase` when the device detected the wake word itself, or start at `PipelineStage.WAKE_WORD` to let Home Assistant detect it.

To catch the next wake word for the voice setup wizard, Home Assistant only looks at pipelines that start at `PipelineStage.STT` with a `wake_word_phrase`. Wake words that Home Assistant detects itself can't be intercepted.

Every pipeline event goes to your `on_pipeline_event` method, where you forward what the device needs, like the URL of the response audio. The state follows the events by itself, with one exception: after the response, call `tts_response_finished()` once the device is done speaking, to go back to `idle`.

## Methods

| Method | Required | Description |
| ------ | -------- | ----------- |
| `on_pipeline_event(event)` | Yes | Handle an event of a running pipeline. A callback, so it must not await. |
| `async_get_configuration()` | Yes | Return the current `AssistSatelliteConfiguration`. A callback, so return a cached copy and fetch it from the device when you set up. |
| `async_set_configuration(config)` | Yes | Apply a new configuration to the device. Return once the device and Home Assistant agree on it. |
| `async_announce(announcement)` | With `ANNOUNCE` | Play the announcement. Return only when it has finished playing. |
| `async_start_conversation(start_announcement)` | With `START_CONVERSATION` | Play the announcement, then listen for a reply and run a pipeline on it. Return when the announcement has finished playing. |

### Configuration

`AssistSatelliteConfiguration` describes the wake words of the device:

| Field | Type | Description |
| ----- | ---- | ----------- |
| `available_wake_words` | `list[AssistSatelliteWakeWord]` | The wake words the device can listen for, each with an `id`, the `wake_word` phrase, and its `trained_languages`. |
| `active_wake_words` | `list[str]` | The IDs of the wake words the device listens for now. |
| `max_active_wake_words` | `int` | How many wake words can be active at once. |

The frontend reads and changes this through the `assist_satellite/get_configuration` and `assist_satellite/set_wake_words` WebSocket commands. `get_configuration` also returns the `pipeline_entity_id` and the VAD sensitivity entity (as `vad_entity_id`) of the satellite. `set_wake_words` takes a list of `wake_word_ids`: Home Assistant rejects IDs that are not in `available_wake_words`, and more IDs than `max_active_wake_words` allows. The voice setup wizard also uses `assist_satellite/intercept_wake_word` to catch the next wake word and show it to the user.

### Announcements

`async_announce` and `async_start_conversation` receive an `AssistSatelliteAnnouncement`. Home Assistant already turned the message into audio, so you only play media:

| Field | Description |
| ----- | ----------- |
| `message` | The text of the announcement, to show on a screen if the device has one. |
| `media_id` | The URL of the audio to play. |
| `preannounce_media_id` | A sound to play before `media_id`, like a chime, or `None` to skip it. |
| `original_media_id` | The media ID as the caller passed it, before Home Assistant resolved it. |
| `media_id_source` | Where the audio came from: `url`, `media_id`, or `tts`. |
| `tts_token` | The token of the generated text-to-speech audio, if any. |

With `ask_question`, Home Assistant calls `async_start_conversation`, then stops the next pipeline after speech-to-text and matches the transcript against the answers the caller gave. For that, start the pipeline for the reply at speech-to-text, which is the default `start_stage` of `async_accept_pipeline_from_satellite`. A pipeline that starts at the wake word runs on past speech-to-text.

Home Assistant sets the state to `responding` while an announcement plays, and back to `idle` when your method returns. If a second announcement comes in during the first, it raises `SatelliteBusyError`.

## States

The state follows the pipeline, from the `AssistSatelliteState` enum. Home Assistant sets it; the `state` property is final.

| Value | Description |
| ----- | ----------- |
| `idle` | Waiting for a wake word or a button press. |
| `listening` | Streaming the voice command to Home Assistant. |
| `processing` | Home Assistant is working out what the command means. |
| `responding` | Speaking the response or an announcement. |

## Example

```python
from homeassistant.components import assist_satellite
from homeassistant.components.assist_pipeline import (
    PipelineEvent,
    PipelineEventType,
)
from homeassistant.core import callback

Feature = assist_satellite.AssistSatelliteEntityFeature


class MySatellite(assist_satellite.AssistSatelliteEntity):
    """A voice satellite speaker."""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_supported_features = Feature.ANNOUNCE

    def __init__(self, device: MyDevice) -> None:
        """Set up the entity."""
        self.device = device
        self._attr_unique_id = f"{device.serial}_satellite"

    @callback
    def async_get_configuration(
        self,
    ) -> assist_satellite.AssistSatelliteConfiguration:
        """Return the cached configuration."""
        return self.device.configuration

    async def async_set_configuration(
        self, config: assist_satellite.AssistSatelliteConfiguration
    ) -> None:
        """Send the new wake words to the device."""
        await self.device.set_wake_words(config.active_wake_words)

    @callback
    def on_pipeline_event(self, event: PipelineEvent) -> None:
        """Forward the response audio to the device."""
        if event.type is not PipelineEventType.TTS_END or not event.data:
            return

        if tts_output := event.data["tts_output"]:
            self.device.play(
                tts_output["url"], on_done=self.tts_response_finished
            )

    async def async_announce(
        self, announcement: assist_satellite.AssistSatelliteAnnouncement
    ) -> None:
        """Play an announcement and wait until it is done."""
        await self.device.play_and_wait(announcement.media_id)
```

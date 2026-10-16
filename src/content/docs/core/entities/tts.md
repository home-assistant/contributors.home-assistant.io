---
title: Text-to-speech entity
description: Build a text-to-speech entity that turns text into audio, in one go or streamed as a language model writes it.
sidebarLabel: Text-to-speech
sidebarGroup: Voice and AI
---

A text-to-speech (TTS) entity turns text into spoken audio. Assist uses it to speak its responses, and the `tts.speak` action uses it to play a message on a media player. Inherit from `TextToSpeechEntity` in `homeassistant.components.tts`. Use it for any speech synthesis engine, local or in the cloud.

## Properties

Text-to-speech entities have these properties on top of the [generic entity properties](/core/entities/entity-class/). Every property can be set with its `_attr_` attribute, like `_attr_supported_languages`.

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `supported_languages` | `list[str]` | Required | The languages the engine can speak. |
| `default_language` | `str` | Required | The language to use when the caller does not pick one. |
| `supported_options` | `list[str] \| None` | `None` | The options a caller may pass, like `voice`. Calls with other options are rejected. |
| `default_options` | `Mapping[str, Any] \| None` | `None` | The options to use when the caller does not set them. |

Home Assistant checks `supported_languages` and `default_language` when the entity is added, and raises an error when either is missing.

## Supported features

Text-to-speech entities have no supported features. Streaming input is detected from your code instead: when you override `async_stream_tts_audio`, Home Assistant knows the engine accepts text in chunks.

## Options and audio formats

Callers pass options as a dictionary, merged on top of `default_options`. An option that is not in `supported_options` is not dropped: the request fails with a `ServiceValidationError` before it reaches your engine. The same happens for a language that is not in `supported_languages`.

The preferred format options are the exception. They are always accepted, and Assist sets them so the audio fits the device that plays it.

| Option | Constant |
| ------ | -------- |
| `preferred_format` | `ATTR_PREFERRED_FORMAT` |
| `preferred_sample_rate` | `ATTR_PREFERRED_SAMPLE_RATE` |
| `preferred_sample_channels` | `ATTR_PREFERRED_SAMPLE_CHANNELS` |
| `preferred_sample_bytes` | `ATTR_PREFERRED_SAMPLE_BYTES` |
| `preferred_bitrate` | `ATTR_PREFERRED_BITRATE` |

If you list one of them in `supported_options`, it reaches your engine, and the engine should produce audio in that format. If you don't, Home Assistant removes it from the options and converts the audio with FFmpeg after your engine returns it. Producing the right format yourself saves that conversion step. Without a preferred format, the result is converted to MP3.

## Methods

### Generate audio

Implement `async_get_tts_audio`, or `get_tts_audio` for blocking code. It receives the full message and returns a tuple of the file extension and the audio bytes, like `("mp3", data)`. Return `(None, None)` when the engine produced nothing. Home Assistant then raises an error for the caller.

```python
async def async_get_tts_audio(
    self, message: str, language: str, options: dict[str, Any]
) -> TtsAudioType:
    """Load TTS audio from the engine."""
```

### Stream audio

A language model writes its answer in chunks. If your engine can start speaking before the text is complete, implement `async_stream_tts_audio` as well. It is optional: without it, Home Assistant collects the whole message and calls `async_get_tts_audio`.

```python
async def async_stream_tts_audio(
    self, request: TTSAudioRequest
) -> TTSAudioResponse:
    """Generate speech from an incoming message."""
```

`TTSAudioRequest` has the `language`, the `options`, and `message_gen`, an async generator of text chunks. Return a `TTSAudioResponse` with the file `extension` and `data_gen`, an async generator of audio chunks.

### Get supported voices

`async_get_supported_voices(language)` is optional. Return a list of `Voice(voice_id, name)` for a language, and the frontend offers them as a choice for the `voice` option. Return `None` when the engine has no voices to pick from. It is a callback, so it must not do I/O: fetch the voices when the entity is set up.

## States

The state is the timestamp of the last time the entity generated audio, or `unknown` before the first one. Home Assistant sets and restores it; the `state` property is final.

## Example

```python
from typing import Any

from homeassistant.components import tts
from homeassistant.core import callback


class MyTextToSpeech(tts.TextToSpeechEntity):
    """Text-to-speech with a cloud engine."""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_supported_languages = ["en-US", "nl-NL"]
    _attr_default_language = "en-US"
    _attr_supported_options = [tts.ATTR_VOICE]

    def __init__(self, entry: MyConfigEntry) -> None:
        """Set up the entity."""
        self.client = entry.runtime_data
        self._attr_unique_id = f"{entry.entry_id}_tts"

    @callback
    def async_get_supported_voices(
        self, language: str
    ) -> list[tts.Voice] | None:
        """Return the voices for a language."""
        return [
            tts.Voice(voice.id, voice.name)
            for voice in self.client.voices
            if voice.language == language
        ]

    async def async_get_tts_audio(
        self, message: str, language: str, options: dict[str, Any]
    ) -> tts.TtsAudioType:
        """Turn the message into audio."""
        try:
            data = await self.client.speak(
                message, language, voice=options.get(tts.ATTR_VOICE)
            )
        except MyClientError:
            return None, None

        return "mp3", data
```

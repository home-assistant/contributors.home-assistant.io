---
title: Speech-to-text entity
description: Build a speech-to-text entity that turns a stream of audio into text for Assist.
sidebarLabel: Speech-to-text
sidebarGroup: Voice and AI
---

A speech-to-text (STT) entity takes a stream of audio and returns the text that was spoken. It is the step in an [Assist pipeline](/glossary/assist-pipeline/) between hearing a voice command and understanding it. Inherit from `SpeechToTextEntity` in `homeassistant.components.stt`. Use it for any speech recognition engine, local or in the cloud.

## Properties

Speech-to-text entities have these properties on top of the [generic entity properties](/core/entities/entity-class/). The six `supported_*` properties are abstract: implement each of them as a property, there are no `_attr_` shortcuts.

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `supported_languages` | `list[str]` | Required | The languages the engine understands, like `en-US`. |
| `supported_formats` | `list[AudioFormats]` | Required | The container formats the engine accepts. |
| `supported_codecs` | `list[AudioCodecs]` | Required | The codecs the engine accepts. |
| `supported_bit_rates` | `list[AudioBitRates]` | Required | The bit rates the engine accepts. |
| `supported_sample_rates` | `list[AudioSampleRates]` | Required | The sample rates the engine accepts. |
| `supported_channels` | `list[AudioChannels]` | Required | The channel layouts the engine accepts. |
| `audio_processing` | `SpeechAudioProcessing` | See below | How the audio should be prepared before it reaches the engine. |

## Supported features

Speech-to-text entities have no supported features.

## Audio formats

Every stream comes with `SpeechMetadata` that says what the audio looks like. Before your entity gets the stream, Home Assistant checks the metadata against your `supported_*` properties with `check_metadata`, so you only receive audio you said you can handle.

| `SpeechMetadata` field | Type | Values |
| ---------------------- | ---- | ------ |
| `language` | `str` | One of `supported_languages`. |
| `format` | `AudioFormats` | `WAV`, `OGG` |
| `codec` | `AudioCodecs` | `PCM`, `OPUS` |
| `bit_rate` | `AudioBitRates` | `BITRATE_8`, `BITRATE_16`, `BITRATE_24`, `BITRATE_32` |
| `sample_rate` | `AudioSampleRates` | `SAMPLERATE_8000`, `SAMPLERATE_11000`, `SAMPLERATE_16000`, `SAMPLERATE_18900`, `SAMPLERATE_22000`, `SAMPLERATE_32000`, `SAMPLERATE_37800`, `SAMPLERATE_44100`, `SAMPLERATE_48000` |
| `channel` | `AudioChannels` | `CHANNEL_MONO`, `CHANNEL_STEREO` |

Voice satellites send 16 kHz, 16-bit, mono PCM audio in a WAV format, so support at least that combination if you want to work with Assist hardware.

### Audio processing

`audio_processing` returns a `SpeechAudioProcessing` from `homeassistant.components.stt.models`. The pipeline only runs its own voice activity detection when `requires_external_vad` is `True`, and it passes all three settings on in its events, so the device that records the audio can prepare it.

| Field | Default | Description |
| ----- | ------- | ----------- |
| `requires_external_vad` | `True` | Home Assistant detects the end of speech with its own voice activity detection. Set it to `False` when your engine detects that itself. |
| `prefers_auto_gain_enabled` | `True` | The audio should get automatic gain control. |
| `prefers_noise_reduction_enabled` | `True` | The audio should get noise reduction. |

## Methods

### Process an audio stream

Implement `async_process_audio_stream`. It receives the metadata and an async iterable of raw audio chunks, and returns a `SpeechResult` once the stream ends.

```python
async def async_process_audio_stream(
    self, metadata: SpeechMetadata, stream: AsyncIterable[bytes]
) -> SpeechResult:
    """Process an audio stream to STT service."""
```

`SpeechResult` has the recognized `text` (or `None`) and a `result` of `SpeechResultState.SUCCESS` or `SpeechResultState.ERROR`.

Read the stream as it comes in and send it on to your engine right away. Waiting for the whole stream first adds the length of the command to every response.

### Partial results

When your engine returns a transcript while the user is still speaking, implement `async_process_audio_stream_with_progress` instead. It is an async generator with the same arguments. Yield zero or more `PartialSpeechResult` objects, followed by exactly one `SpeechResult` at the end.

```python
async def async_process_audio_stream_with_progress(
    self, metadata: SpeechMetadata, stream: AsyncIterable[bytes]
) -> AsyncGenerator[PartialSpeechResult | SpeechResult]:
    """Yield partial transcripts, then the final result."""
```

A `PartialSpeechResult` has the full `text` of a speaker so far, not only the new words, and an optional `speaker_id`. Each partial replaces the previous one with the same `speaker_id`. Without this method, the base class calls `async_process_audio_stream` and yields only its final result.

Partial results are new: the Assist pipeline doesn't use them yet, it only waits for the final result.

## States

The state is the timestamp of the last time the entity processed audio, or `unknown` before the first one. Home Assistant sets and restores it; the `state` property is final.

## Example

```python
from collections.abc import AsyncIterable

from homeassistant.components import stt


class MySpeechToText(stt.SpeechToTextEntity):
    """Speech-to-text with a cloud engine."""

    _attr_has_entity_name = True
    _attr_name = None

    def __init__(self, entry: MyConfigEntry) -> None:
        """Set up the entity."""
        self.client = entry.runtime_data
        self._attr_unique_id = f"{entry.entry_id}_stt"

    @property
    def supported_languages(self) -> list[str]:
        return ["en-US", "nl-NL"]

    @property
    def supported_formats(self) -> list[stt.AudioFormats]:
        return [stt.AudioFormats.WAV]

    @property
    def supported_codecs(self) -> list[stt.AudioCodecs]:
        return [stt.AudioCodecs.PCM]

    @property
    def supported_bit_rates(self) -> list[stt.AudioBitRates]:
        return [stt.AudioBitRates.BITRATE_16]

    @property
    def supported_sample_rates(self) -> list[stt.AudioSampleRates]:
        return [stt.AudioSampleRates.SAMPLERATE_16000]

    @property
    def supported_channels(self) -> list[stt.AudioChannels]:
        return [stt.AudioChannels.CHANNEL_MONO]

    async def async_process_audio_stream(
        self, metadata: stt.SpeechMetadata, stream: AsyncIterable[bytes]
    ) -> stt.SpeechResult:
        """Send the audio to the engine as it arrives."""
        try:
            text = await self.client.transcribe(stream, metadata.language)
        except MyClientError:
            return stt.SpeechResult(None, stt.SpeechResultState.ERROR)

        return stt.SpeechResult(text, stt.SpeechResultState.SUCCESS)
```

---
title: Media player entity
description: Control anything that plays audio or video, from a smart speaker to a TV or an AV receiver.
sidebarLabel: Media player
sidebarGroup: Media
---

A media player entity controls something that plays media: a smart speaker, a TV, a streaming stick, an AV receiver, or a projector. It reports what is playing, with artwork and position, and takes commands like play, pause, volume, source, and play this URL. It is one of the richest entity types in Home Assistant, but you only implement what your device can do: the [supported features](/glossary/supported-features/) decide which actions and controls exist.

Inherit from `MediaPlayerEntity`, imported from `homeassistant.components.media_player`. For how the frontend shows a media player, see the [media player more-info view](/design/more-info/media-player/).

## Properties

These properties are specific to media player entities. The generic properties every entity has are on [the entity class](/core/entities/entity-class/). All of them default to `None`, except where the table says otherwise.

### Player

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `state` | `MediaPlayerState \| None` | `None` | The state of the player. See [States](#states). |
| `device_class` | `MediaPlayerDeviceClass \| None` | `None` | What kind of device this is. See [Device classes](#device-classes). |
| `volume_level` | `float \| None` | `None` | The volume, from `0` to `1`. |
| `volume_step` | `float` | `0.1` | How much the volume changes with `volume_up` and `volume_down`, from `0` to `1`. Also settable on the entity description. |
| `is_volume_muted` | `bool \| None` | `None` | Whether the volume is muted. |
| `source` | `str \| None` | `None` | The selected input source. |
| `source_list` | `list[str] \| None` | `None` | The input sources the user can pick from, as human-readable names. Only shown when the player has `SELECT_SOURCE`. |
| `sound_mode` | `str \| None` | `None` | The selected sound mode. |
| `sound_mode_list` | `list[str] \| None` | `None` | The sound modes the user can pick from. Only shown when the player has `SELECT_SOUND_MODE`. |
| `shuffle` | `bool \| None` | `None` | Whether shuffle is on. |
| `repeat` | `RepeatMode \| str \| None` | `None` | The repeat mode: `RepeatMode.OFF`, `RepeatMode.ALL`, or `RepeatMode.ONE`. |
| `group_members` | `list[str] \| None` | `None` | The entity IDs of the players grouped with this one for synchronous playback. If your platform has a group leader, put it first. |
| `app_id` | `str \| None` | `None` | The ID of the app that is running. |
| `app_name` | `str \| None` | `None` | The name of the app that is running. |
| `supported_features` | `MediaPlayerEntityFeature` | `MediaPlayerEntityFeature(0)` | What the player can do. See [Supported features](#supported-features). |

### Current media

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `media_content_id` | `str \| None` | `None` | The ID of the media that is playing. |
| `media_content_type` | `MediaType \| str \| None` | `None` | The type of the media that is playing, like `MediaType.MUSIC` or `MediaType.TVSHOW`. |
| `media_duration` | `int \| None` | `None` | The duration of the media in seconds. |
| `media_position` | `int \| None` | `None` | The position in the media in seconds. |
| `media_position_updated_at` | `datetime \| None` | `None` | When `media_position` was last valid. Use `homeassistant.util.dt.utcnow()`. |
| `media_title` | `str \| None` | `None` | The title of the media. |
| `media_artist` | `str \| None` | `None` | The artist, for music. |
| `media_album_name` | `str \| None` | `None` | The album, for music. |
| `media_album_artist` | `str \| None` | `None` | The album artist, for music. |
| `media_track` | `int \| None` | `None` | The track number, for music. |
| `media_series_title` | `str \| None` | `None` | The title of the series, for TV shows. |
| `media_season` | `str \| None` | `None` | The season, for TV shows. |
| `media_episode` | `str \| None` | `None` | The episode, for TV shows. |
| `media_channel` | `str \| None` | `None` | The channel that is playing. |
| `media_playlist` | `str \| None` | `None` | The title of the playlist that is playing. |
| `media_image_url` | `str \| None` | `None` | The URL of the artwork. |
| `media_image_remotely_accessible` | `bool` | `False` | Whether the frontend can load `media_image_url` directly. When `False`, Home Assistant proxies the image. |
| `media_image_hash` | `str \| None` | Hash of the URL | Changes when the artwork changes, so browsers do not show a cached image. Set it when the URL stays the same but the image does not. |

The frontend moves the position bar forward by itself, based on `media_position` and `media_position_updated_at`. So only update the two when the position really jumps, like after a seek or a new track, not every second. Updating them every second only fills the database.

When the state is `off`, Home Assistant leaves out the media attributes, the volume, source, sound mode, shuffle, and repeat attributes, and the entity picture. The `group_members` attribute stays, for players that support grouping.

## Supported features

Combine the flags of `MediaPlayerEntityFeature` with the bitwise or (`|`) operator. Home Assistant only offers an action when the entity has the flag for it.

| Flag | Description | Implement |
| --- | --- | --- |
| `TURN_ON` | Turn the player on. | `turn_on` |
| `TURN_OFF` | Turn the player off. | `turn_off` |
| `PLAY` | Start or resume playback. | `media_play` |
| `PAUSE` | Pause playback. | `media_pause` |
| `STOP` | Stop playback. | `media_stop` |
| `PREVIOUS_TRACK` | Go to the previous track. | `media_previous_track` |
| `NEXT_TRACK` | Go to the next track. | `media_next_track` |
| `SEEK` | Jump to a position. | `media_seek` |
| `VOLUME_SET` | Set the volume to a level. | `set_volume_level` |
| `VOLUME_STEP` | Turn the volume up and down. | `volume_up` and `volume_down`, or rely on `set_volume_level` |
| `VOLUME_MUTE` | Mute and unmute. | `mute_volume` |
| `SELECT_SOURCE` | Pick an input source. | `select_source`, and `source_list` |
| `SELECT_SOUND_MODE` | Pick a sound mode. | `select_sound_mode`, and `sound_mode_list` |
| `PLAY_MEDIA` | Play a specific piece of media. | `play_media` |
| `MEDIA_ENQUEUE` | The player handles the `enqueue` option of `play_media`. | `play_media` |
| `MEDIA_ANNOUNCE` | The player handles the `announce` option of `play_media`. | `play_media` |
| `BROWSE_MEDIA` | Browse the media the player can play. | `async_browse_media` |
| `SEARCH_MEDIA` | Search the media the player can play. | `async_search_media` |
| `CLEAR_PLAYLIST` | Clear the play queue. | `clear_playlist` |
| `SHUFFLE_SET` | Turn shuffle on or off. | `set_shuffle` |
| `REPEAT_SET` | Set the repeat mode. | `set_repeat` |
| `GROUPING` | Group players for synchronous playback. | `join_players` and `unjoin_player`, and `group_members` |

## Device classes

The device class tells Home Assistant, and voice assistants that sync with it, what kind of device this is. Use the `MediaPlayerDeviceClass` enum.

| Device class | Description |
| --- | --- |
| `tv` | A television. |
| `speaker` | A speaker or a stereo system. |
| `receiver` | An audio video receiver, which sends audio to speakers and video to a display. |
| `projector` | A projector. |

## Playing media

The `media_player.play_media` action calls `play_media` with the media type, the media ID, and some options in `kwargs`:

- `enqueue`: a `MediaPlayerEnqueue` that says what to do with the queue. `add` adds the media to the end of the queue, `next` plays it after the current item, `play` plays it now and keeps the queue, and `replace` plays it now and clears the queue. The action editor only offers it for players with `MEDIA_ENQUEUE`, but Home Assistant does not filter it out, so ignore it if you do not support it.
- `announce`: `True` for an announcement, like a doorbell sound or a text-to-speech message. Pause what is playing, play the announcement, and resume. The action editor only offers it for players with `MEDIA_ANNOUNCE`.
- `extra`: a dictionary with extra options from the action call. Always present, and empty by default.

An action call can have `enqueue` or `announce`, never both.

`media_type` is usually a `MediaType` value. If your integration handles media that does not fit any of them, it is fine to use your integration domain as the type.

## Browsing media

With `BROWSE_MEDIA`, implement `async_browse_media`. It gets a `media_content_type` and a `media_content_id`, both `None` for the root, and returns a `BrowseMedia` object: a tree of items, each with a title, a media class (`MediaClass`), an ID, whether it can be played or expanded, and a thumbnail. Raise `BrowseError` for an ID you do not know.

### Media sources

The media source integration lets any integration offer media: local files, text-to-speech, radio stations, cameras. If your player can play a URL, add those sources to your browser for free. Pass the browse call on to `media_source.async_browse_media`, or add its root to your own tree. When you play a media source ID, resolve it to a URL first with `media_source.async_resolve_media`, and run that URL through `async_process_play_media_url`, which turns a relative URL into one your device can reach.

### Artwork in the browser

If your thumbnails are only reachable from the local network, proxy them through Home Assistant, so they also work in the companion app away from home. Set the `thumbnail` of a `BrowseMedia` item to `self.get_browse_image_url(media_content_type, media_content_id, media_image_id)`. When the browser loads it, Home Assistant calls your `async_get_browse_image`. Fetch the image there with `self._async_fetch_image(url)`, and return a tuple of the content and the content type.

> [!WARNING]
> Never use a URL as `media_image_id`. Anyone who can reach the proxy could then use it to fetch anything from the local network.

Only proxy when the request comes from outside the network: `is_local_request(hass)` from `homeassistant.helpers.network` tells you. The artwork of what is playing now goes through `async_get_media_image`, which has its own cache: you only need to set `media_image_url`.

## Searching media

With `SEARCH_MEDIA`, implement `async_search_media`. It gets a `SearchMediaQuery` with a `search_query`, and optionally a `media_content_type`, a `media_content_id` to search in, and `media_filter_classes`, a list of `MediaClass` values to limit the results. Return a `SearchMedia` with the matching `BrowseMedia` items in `result`.

## Methods

Each method has a sync and an async variant. Implement one of them. The async variants start with `async_`, like `async_media_play`.

| Method | Description |
| --- | --- |
| `turn_on()` | Turn the player on. |
| `turn_off()` | Turn the player off. |
| `media_play()` | Start or resume playback. |
| `media_pause()` | Pause playback. |
| `media_stop()` | Stop playback. |
| `media_previous_track()` | Go to the previous track. |
| `media_next_track()` | Go to the next track. |
| `media_seek(position: float)` | Jump to the position, in seconds. |
| `set_volume_level(volume: float)` | Set the volume, from `0` to `1`. |
| `mute_volume(mute: bool)` | Mute or unmute. |
| `select_source(source: str)` | Pick an input source. |
| `select_sound_mode(sound_mode: str)` | Pick a sound mode. |
| `play_media(media_type, media_id, **kwargs)` | Play a piece of media. See [Playing media](#playing-media). |
| `clear_playlist()` | Clear the play queue. |
| `set_shuffle(shuffle: bool)` | Turn shuffle on or off. |
| `set_repeat(repeat: RepeatMode)` | Set the repeat mode. |
| `join_players(group_members: list[str])` | Group these players with this one. |
| `unjoin_player()` | Remove this player from its group. |
| `async_browse_media(media_content_type, media_content_id)` | Async only. Return a `BrowseMedia` tree. |
| `async_search_media(query)` | Async only. Return a `SearchMedia` result. |
| `async_get_browse_image(media_content_type, media_content_id, media_image_id)` | Async only. Return the bytes and content type of a browser thumbnail. |

Some methods have a default you can override:

- `toggle`: turns the player on when it is `off`, and off otherwise.
- `media_play_pause`: pauses when the state is `playing`, and plays otherwise.
- `volume_up` and `volume_down`: change `volume_level` by `volume_step` through `set_volume_level`, when the player has `VOLUME_SET`. Implement them yourself if your device has its own volume buttons.

## States

Return a `MediaPlayerState` from `state`.

| State | Description |
| --- | --- |
| `off` | The player is off and does not take commands until it is turned on. |
| `on` | The player is on, but you do not know more. |
| `idle` | The player is on and takes commands, but nothing is playing, like on a home screen. |
| `playing` | Media is playing. |
| `paused` | Media is loaded and paused. |
| `buffering` | The player is getting ready to play. |

> [!NOTE]
> `MediaPlayerState.STANDBY` is deprecated. Use `off` or `idle` instead.

Many players cannot be controlled while they are in standby. If Home Assistant can still turn the device on another way, like Wake-on-LAN or a power command over a different connection, show it as `off`. If there is no way to turn it on from Home Assistant, mark the entity [unavailable](/glossary/unavailable/). The [entity unavailable rule](/core/quality-scale/entity-unavailable/) of the quality scale has the details.

## Example

A network speaker that plays, pauses, sets the volume, and plays URLs, including media sources.

```python
from typing import Any

from homeassistant.components import media_source
from homeassistant.components.media_player import (
    BrowseMedia,
    MediaPlayerDeviceClass,
    MediaPlayerEntity,
    MediaPlayerEntityFeature,
    MediaPlayerState,
    MediaType,
    async_process_play_media_url,
)


class MySpeaker(MediaPlayerEntity):
    """A network speaker."""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_device_class = MediaPlayerDeviceClass.SPEAKER
    _attr_supported_features = (
        MediaPlayerEntityFeature.PLAY
        | MediaPlayerEntityFeature.PAUSE
        | MediaPlayerEntityFeature.VOLUME_SET
        | MediaPlayerEntityFeature.PLAY_MEDIA
        | MediaPlayerEntityFeature.BROWSE_MEDIA
    )

    def __init__(self, speaker: MySpeakerClient) -> None:
        """Initialize the speaker."""
        self._speaker = speaker
        self._attr_unique_id = speaker.serial

    @property
    def state(self) -> MediaPlayerState:
        """Return the state of the speaker."""
        if self._speaker.is_playing:
            return MediaPlayerState.PLAYING
        return MediaPlayerState.IDLE

    @property
    def volume_level(self) -> float:
        """Return the volume, from 0 to 1."""
        return self._speaker.volume / 100

    async def async_media_play(self) -> None:
        """Resume playback."""
        await self._speaker.play()

    async def async_media_pause(self) -> None:
        """Pause playback."""
        await self._speaker.pause()

    async def async_set_volume_level(self, volume: float) -> None:
        """Set the volume."""
        await self._speaker.set_volume(round(volume * 100))

    async def async_browse_media(
        self,
        media_content_type: MediaType | str | None = None,
        media_content_id: str | None = None,
    ) -> BrowseMedia:
        """Browse the audio of media sources."""
        return await media_source.async_browse_media(
            self.hass,
            media_content_id,
            content_filter=lambda item: item.media_content_type.startswith(
                "audio/"
            ),
        )

    async def async_play_media(
        self, media_type: MediaType | str, media_id: str, **kwargs: Any
    ) -> None:
        """Play a URL or a media source."""
        if media_source.is_media_source_id(media_id):
            play_item = await media_source.async_resolve_media(
                self.hass, media_id, self.entity_id
            )
            media_id = play_item.url

        url = async_process_play_media_url(self.hass, media_id)
        await self._speaker.play_url(url)
```

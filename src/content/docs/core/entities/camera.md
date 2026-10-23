---
title: Camera entity
description: Show still images from a camera, and optionally a live stream over HLS or WebRTC.
sidebarLabel: Camera
sidebarGroup: Media
---

A camera entity serves images from a camera: a still image on request, and, if the camera can, a live video stream. It is what powers the camera feeds on dashboards, the snapshots in notifications, and the recordings made with the `camera.record` action.

Inherit from `Camera`, imported from `homeassistant.components.camera`. Use it for anything that shows a live or near-live picture. If your device only has a still image that changes now and then, like a map or a QR code, the [image entity](/core/entities/image/) is simpler.

## Properties

These properties are specific to camera entities. The generic properties every entity has are on [the entity class](/core/entities/entity-class/).

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `brand` | `str \| None` | `None` | The brand of the camera. |
| `camera_entity_capabilities` | `CameraEntityCapabilities` | `CameraEntityCapabilities()` | What the camera supports. See [Two-way audio](#two-way-audio). |
| `model` | `str \| None` | `None` | The model of the camera. |
| `frame_interval` | `float` | `0.5` | Seconds between frames of the MJPEG stream that Home Assistant builds from still images. |
| `is_on` | `bool` | `True` | Whether the camera is on. When it is off, image requests fail with a "service unavailable" response. |
| `is_recording` | `bool` | `False` | Whether the camera is recording. Sets the state. |
| `is_streaming` | `bool` | `False` | Whether the camera is streaming. Sets the state. |
| `motion_detection_enabled` | `bool` | `False` | Whether motion detection is on. |
| `use_stream_for_stills` | `bool` | `False` | Take still images from the stream instead of calling `async_camera_image`. Only a property: there is no `_attr_` for it. |
| `content_type` | `str` | `"image/jpeg"` | The MIME type of the images you return. A plain instance attribute set in `__init__`, not a property. |
| `stream_options` | `dict` | `{}` | Options passed to the stream integration when it opens your stream source. A plain instance attribute. |

Cameras do not poll by default (`should_poll` is `False`). When you override `__init__`, call `super().__init__()`: it sets up the access tokens, the stream, and the WebRTC bookkeeping.

## Supported features

Combine the flags of `CameraEntityFeature` with the bitwise or (`|`) operator.

| Flag | Description |
| --- | --- |
| `ON_OFF` | The camera can be turned on and off. Implement `turn_on` and `turn_off`. |
| `STREAM` | The camera has a live stream. Implement `stream_source` for HLS, or the native WebRTC methods. |

## Still images

Every camera returns still images through `async_camera_image` (or `camera_image`). The frontend calls it for thumbnails and dashboards, and the `camera.snapshot` action saves its result to disk.

The frontend can ask for a `width` and a `height`. Scaling is best effort:

- If your camera can scale, pass the size on and return the smallest image that is at least that large.
- Keep the aspect ratio. When it does not match, the returned image can be wider or taller than asked.
- If you cannot scale and return a JPEG, Home Assistant scales it for you.

If the camera has a stream and no separate snapshot endpoint, set `use_stream_for_stills` to `True`, and Home Assistant grabs stills from the stream. Another common way is to pass the stream source to `async_get_image` of the FFmpeg integration (`homeassistant.components.ffmpeg`), which grabs a frame from it.

## Streams

A camera with `CameraEntityFeature.STREAM` offers a live stream in one of two ways. The frontend picks a player based on what the camera offers.

### HLS through the stream integration

Implement `stream_source` and return a URL that FFmpeg can open, usually an RTSP URL. Home Assistant's stream integration turns it into HLS for the frontend, and uses it for `camera.record` and `camera.play_stream` too.

When another integration has registered a WebRTC provider that can handle your stream source, like the go2rtc integration, the frontend also gets WebRTC for your camera. You do not have to do anything for that.

### Native WebRTC

If your camera or cloud speaks WebRTC itself, implement these methods instead:

- `async_handle_async_webrtc_offer(offer_sdp, session_id, send_message)`: start a session for the SDP offer of the frontend. Send the answer, candidates, and errors back with the `send_message` callback, as `WebRTCAnswer`, `WebRTCCandidate`, and `WebRTCError`.
- `async_on_webrtc_candidate(session_id, candidate)`: handle an ICE candidate that the frontend sends after the offer. Required when you implement the offer method.
- `close_webrtc_session(session_id)`: optional. Clean up when the frontend closes the stream.

Once you override `async_handle_async_webrtc_offer`, the frontend uses WebRTC only and never falls back to HLS. Native WebRTC streams do not go through the stream integration, so recording is not available. To pass extra settings to the WebRTC client, like a data channel, override `_async_get_webrtc_client_configuration` and return a `WebRTCClientConfiguration`.

### WebRTC providers

An integration can also offer WebRTC for cameras of other integrations, based on their stream source. Implement `CameraWebRTCProvider` and register it with `async_register_webrtc_provider(hass, provider)`. The provider tells Home Assistant which stream sources it supports with `async_is_supported`, and handles the offers and candidates for those cameras. This is how go2rtc works, and you will rarely need it.

### Two-way audio

When the camera has a speaker, people can talk through it while they watch the live stream. To offer this, set `camera_entity_capabilities` to a `CameraEntityCapabilities` with `two_way_audio` as `True`, imported from `homeassistant.components.camera`.

Only declare it when the camera can receive audio over the stream Home Assistant uses.

```python
self._attr_camera_entity_capabilities = CameraEntityCapabilities(
    two_way_audio=device.supports_two_way_audio and device.protocol == "rtsp"
)
```

The frontend gets two-way audio only when all of these hold:

- Your entity declares two-way audio.
- The camera streams over WebRTC, natively or through a WebRTC provider. Two-way audio is not available over HLS.
- The user turned on the **Two-way audio** preview feature of the camera integration in [Labs](/core/development/labs/). The browser only gives access to the microphone over HTTPS, so two-way audio needs Home Assistant to be opened over HTTPS.


## Methods

Each method has a sync and an async variant. Implement one of them.

| Method | Sync variant | Description |
| --- | --- | --- |
| `async_camera_image(width=None, height=None)` | `camera_image` | Return the bytes of a still image, or `None`. |
| `stream_source()` | none | Async only. Return the stream URL, or `None`. Needs `STREAM`. |
| `async_turn_on()` | `turn_on` | Turn the camera on. Needs `ON_OFF`. |
| `async_turn_off()` | `turn_off` | Turn the camera off. Needs `ON_OFF`. |
| `async_enable_motion_detection()` | `enable_motion_detection` | Turn motion detection on. |
| `async_disable_motion_detection()` | `disable_motion_detection` | Turn motion detection off. |
| `handle_async_mjpeg_stream(request)` | none | Optional. Proxy an MJPEG stream from the camera directly. By default, Home Assistant builds one from still images every `frame_interval` seconds. |

The native WebRTC methods are listed in [Native WebRTC](#native-webrtc).

## States

The state is final, and comes from `is_recording` and `is_streaming`, in that order. The values are in the `CameraState` enum.

| State | When |
| --- | --- |
| `recording` | `is_recording` is `True`. |
| `streaming` | `is_streaming` is `True`, and the camera is not recording. |
| `idle` | Neither. |

The camera adds `access_token`, and, when set, `model_name`, `brand`, and `motion_detection` as attributes. The access token and the entity picture are excluded from the [recorder](/glossary/recorder/), because the tokens rotate every five minutes.

## Example

A network camera with an RTSP stream and a snapshot URL.

```python
from homeassistant.components.camera import Camera, CameraEntityFeature


class MyCamera(Camera):
    """A network camera."""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_supported_features = CameraEntityFeature.STREAM

    def __init__(self, device: MyDevice) -> None:
        """Initialize the camera."""
        super().__init__()
        self._device = device
        self._attr_unique_id = device.serial
        self._attr_brand = "Example"
        self._attr_model = device.model

    async def async_camera_image(
        self, width: int | None = None, height: int | None = None
    ) -> bytes | None:
        """Return a snapshot."""
        return await self._device.snapshot(width=width, height=height)

    async def stream_source(self) -> str | None:
        """Return the RTSP URL of the main stream."""
        return self._device.rtsp_url
```

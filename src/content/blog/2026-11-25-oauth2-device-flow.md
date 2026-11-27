---
title: OAuth 2.0 device authorization grant
description: The OAuth2 helper now supports the device authorization grant (RFC 8628) for providers that offer no authorization code grant, and the implementation base classes were split per grant.
date: 2026-11-25
authors:
  - Erwin Douna
areas:
  - core
---

The OAuth2 helper now supports the device authorization grant ([RFC 8628](https://www.rfc-editor.org/rfc/rfc8628)), next to the authorization code grant it already supported. With the device flow, Home Assistant requests a device code, shows the user a short code and a verification URL, and polls the provider until the user approves the request on another device.

Use it only for providers that don't offer the authorization code grant. When a provider supports both, the authorization code grant is preferred, and an integration implements one grant, never both. This follows [architecture discussion #1299](https://github.com/home-assistant/architecture/discussions/1299).

Existing integrations don't need any changes. This is implemented in core [PR #161715](https://github.com/home-assistant/core/pull/161715).

## Implementing the device flow

### Application credentials platform

A device flow integration ships its own public client ID, so users never add application credentials for it, and it doesn't appear in the application credentials dialog. Instead of `async_get_authorization_server`, the platform implements two functions:

```python
"""Application credentials platform for Example."""

from homeassistant.components.application_credentials import (
    DeviceFlowAuthorizationServer,
    DeviceFlowClientCredential,
)
from homeassistant.core import HomeAssistant


async def async_get_device_flow_authorization_server(
    hass: HomeAssistant,
) -> DeviceFlowAuthorizationServer:
    """Return the device authorization server."""
    return DeviceFlowAuthorizationServer(
        device_authorization_url="https://example.com/oauth/device/code",
        token_url="https://example.com/oauth/token",
    )


async def async_get_device_flow_client_credential(
    hass: HomeAssistant,
) -> DeviceFlowClientCredential:
    """Return the public client of the integration."""
    return DeviceFlowClientCredential(client_id="example-public-client-id")
```

`device_authorization_url` is the device authorization endpoint, where Home Assistant requests the device and user codes. A platform must implement both functions, and it can't also implement `async_get_authorization_server` or `async_get_auth_implementation`.

### Config flow

The config flow extends `AbstractOAuth2DeviceFlowHandler`. Scopes and other parameters for the device authorization request go in `extra_authorize_data`:

```python
"""Config flow for Example."""

import logging
from typing import Any

from homeassistant.helpers import config_entry_oauth2_flow

from .const import DOMAIN


class OAuth2FlowHandler(
    config_entry_oauth2_flow.AbstractOAuth2DeviceFlowHandler, domain=DOMAIN
):
    """Config flow to handle Example OAuth2 authentication."""

    DOMAIN = DOMAIN

    @property
    def logger(self) -> logging.Logger:
        """Return logger."""
        return logging.getLogger(__name__)

    @property
    def extra_authorize_data(self) -> dict[str, Any]:
        """Extra data for the device authorization request."""
        return {"scope": "offline_access"}
```

While Home Assistant waits for the user, the flow shows a progress step with the code and the verification URL. The text is shared between all integrations, so the integration adds no strings for it.

When the user has approved, the helper calls `async_oauth_create_entry`, exactly like the authorization code flow. The created config entry stores the token the same way, so `OAuth2Session` and token refresh work unchanged. Two things are specific to the device flow:

- A token without `expires_in`, which some providers issue, is treated as non-expiring.
- Refreshing a token without a `refresh_token` raises `ConfigEntryAuthFailed`, which starts reauthentication.

## Changes to the OAuth 2.0 helper classes

`AbstractOAuth2Implementation` used to describe the authorization code grant only. It's now split:

- `AbstractOAuth2BaseImplementation` holds what every grant shares: `name`, `domain`, and token refresh.
- `AbstractAuthorizationCodeImplementation` adds `async_generate_authorize_url` and `async_resolve_external_data`.
- `DeviceFlowImplementation` implements the device authorization grant on top of the base class.

`AbstractOAuth2Implementation` stays available as an alias of `AbstractAuthorizationCodeImplementation`, so implementations that subclass it keep working unchanged.

The functions that handle implementations of any grant are now typed with `AbstractOAuth2BaseImplementation`: `async_register_implementation`, `async_get_implementations`, `async_add_implementation_provider`, and `OAuth2Session`. `async_get_config_entry_implementation` also returns the base class now, since it serves both grants. Custom integrations that annotate these results with the old type may need to update their annotations to pass type checking, and code that calls authorization-code-specific methods such as `async_generate_authorize_url` on the result needs to narrow the type first; nothing changes at runtime.

More details are in the [OAuth2 documentation](/core/integrations/oauth2/#the-device-authorization-grant).

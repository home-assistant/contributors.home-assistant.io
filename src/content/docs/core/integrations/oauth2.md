---
title: OAuth 2.0 and application credentials
description: Link a user's account at a cloud service with OAuth 2.0, and let Home Assistant handle the tokens for you.
sidebarLabel: OAuth 2.0
sidebarGroup: Setup and configuration
order: 7
---

Many cloud services let users link their account with OAuth 2.0: the user logs in on the website of the service, and Home Assistant gets a token. Home Assistant has helpers for the whole thing, in `homeassistant.helpers.config_entry_oauth2_flow`: the config flow, storing the token, refreshing it, and handling errors. You do not implement any of that yourself.

The quickest start is the scaffold script:

```shell
python3 -m script.scaffold config_flow_oauth2
```

## How it fits together

OAuth 2.0 needs a client ID and a client secret: the credentials of an application registered at the service. There are two ways a user gets those:

- **Application credentials**: the user registers their own application at the service, and enters its client ID and secret in Home Assistant. Every integration that supports OAuth 2.0 must support this.
- **Home Assistant Link account linking**: Nabu Casa registered an application with the service, so users with a subscription can link their account without registering anything. This gives the best experience. To add your integration to it, contact [partner@openhomefoundation.org](mailto:partner@openhomefoundation.org).

Both end up as an implementation, a subclass of `AbstractOAuth2Implementation`. The config flow lets the user pick one if there are several, and uses it to log in.

Your library has to be built so that Home Assistant can refresh tokens for it: it asks for a valid token before each request, instead of handling the refresh itself. See [OAuth 2 in your API library](/core/integrations/api-library/#oauth-2) for how to build that.

## Application credentials

Add `application_credentials` to the `dependencies` in your [manifest](/core/integrations/manifest/#dependencies), and create `application_credentials.py` with the URLs of the authorization server of the service:

```python
from homeassistant.components.application_credentials import (
    AuthorizationServer,
)
from homeassistant.core import HomeAssistant


async def async_get_authorization_server(
    hass: HomeAssistant,
) -> AuthorizationServer:
    """Return the authorization server."""
    return AuthorizationServer(
        authorize_url="https://example.com/oauth/authorize",
        token_url="https://example.com/oauth/token",
    )
```

`authorize_url` is where the user logs in. `token_url` is where Home Assistant gets and refreshes tokens.

### A custom implementation

If the service does something special, return your own implementation instead, from `async_get_auth_implementation`. For example, for a service that requires [PKCE](https://www.rfc-editor.org/rfc/rfc7636):

```python
from homeassistant.components.application_credentials import (
    ClientCredential,
)
from homeassistant.helpers.config_entry_oauth2_flow import (
    AbstractOAuth2Implementation,
    LocalOAuth2ImplementationWithPkce,
)


async def async_get_auth_implementation(
    hass: HomeAssistant, auth_domain: str, credential: ClientCredential
) -> AbstractOAuth2Implementation:
    """Return an implementation that uses PKCE."""
    return LocalOAuth2ImplementationWithPkce(
        hass,
        auth_domain,
        credential.client_id,
        authorize_url="https://example.com/oauth/authorize",
        token_url="https://example.com/oauth/token",
        # Optional, defaults to an empty string
        client_secret=credential.client_secret,
        # Optional, between 43 and 128, defaults to 128
        code_verifier_length=128,
    )
```

For other changes, subclass `AuthImplementation` from the application credentials integration, and override what you need.

### Help users create credentials

Explain where users create their credentials in `strings.json`, under `application_credentials`:

```json
{
  "application_credentials": {
    "description": "Create credentials in the [console]({console_url})."
  }
}
```

Fill placeholders like `console_url` with `async_get_description_placeholders` in `application_credentials.py`, so URLs stay out of the translations:

```python
async def async_get_description_placeholders(
    hass: HomeAssistant,
) -> dict[str, str]:
    """Return the placeholders for the credentials dialog."""
    return {"console_url": "https://example.com/developers"}
```

### Credentials from YAML

New integrations must not accept credentials in `configuration.yaml`: users enter them in the UI. Integrations that used to accept them can move them over with `async_import_client_credential`:

```python
from homeassistant.components.application_credentials import (
    ClientCredential,
    async_import_client_credential,
)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Import credentials from YAML."""
    if DOMAIN in config:
        await async_import_client_credential(
            hass,
            DOMAIN,
            ClientCredential(
                config[DOMAIN][CONF_CLIENT_ID],
                config[DOMAIN][CONF_CLIENT_SECRET],
            ),
        )

    return True
```

## The config flow

Extend `AbstractOAuth2FlowHandler`. It already has the `user` step, picks the implementation, sends the user to the service, and receives the token. You set the domain and a logger, and add the scopes and other parameters the service needs in `extra_authorize_data`:

```python
import logging
from typing import Any

from homeassistant.helpers import config_entry_oauth2_flow


class OAuth2FlowHandler(
    config_entry_oauth2_flow.AbstractOAuth2FlowHandler, domain=DOMAIN
):
    """Handle the OAuth 2.0 config flow of Example."""

    DOMAIN = DOMAIN

    @property
    def logger(self) -> logging.Logger:
        """Return the logger."""
        return logging.getLogger(__name__)

    @property
    def extra_authorize_data(self) -> dict[str, Any]:
        """Return extra parameters for the authorize URL."""
        return {"scope": "read write offline_access"}
```

When the login succeeds, the helper calls `async_oauth_create_entry` with the data, including the token. By default it creates an entry with the name of the implementation as title. Override it to set a unique ID, a better title, or to [handle reauthentication](#reauthentication).

### Reauthentication

Tokens can become invalid for good, for example when the user revokes access at the service. Home Assistant then starts a [reauthentication flow](/core/integrations/reauth-reconfigure/#reauthentication). For OAuth 2.0, that means logging in again:

```python
from collections.abc import Mapping

from homeassistant.config_entries import SOURCE_REAUTH, ConfigFlowResult


async def async_step_reauth(
    self, entry_data: Mapping[str, Any]
) -> ConfigFlowResult:
    """Start reauthentication."""
    return await self.async_step_reauth_confirm()


async def async_step_reauth_confirm(
    self, user_input: dict[str, Any] | None = None
) -> ConfigFlowResult:
    """Tell the user they need to log in again."""
    if user_input is None:
        return self.async_show_form(step_id="reauth_confirm")

    return await self.async_step_user()


async def async_oauth_create_entry(
    self, data: dict[str, Any]
) -> ConfigFlowResult:
    """Create an entry, or update it during reauthentication."""
    account = await get_account(self.hass, data["token"])
    await self.async_set_unique_id_or_abort(account.id)

    if self.source == SOURCE_REAUTH:
        return self.async_update_reload_and_abort(
            self._get_reauth_entry(), data_updates=data
        )

    return self.async_create_entry(title=account.name, data=data)
```

Always implement reauthentication, so users can link their account again without removing the integration.

## Make authenticated requests

Create an `OAuth2Session` in `async_setup_entry`. It keeps the token valid, and stores refreshed tokens in the config entry:

```python
from homeassistant.helpers.config_entry_oauth2_flow import (
    OAuth2Session,
    async_get_config_entry_implementation,
)


async def async_setup_entry(
    hass: HomeAssistant, entry: ExampleConfigEntry
) -> None:
    """Set up Example from a config entry."""
    implementation = await async_get_config_entry_implementation(
        hass, entry
    )
    session = OAuth2Session(hass, entry, implementation)

    coordinator = ExampleCoordinator(
        hass, entry, ExampleClient(session)
    )
    await coordinator.async_config_entry_first_refresh()

    entry.runtime_data = coordinator

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
```

Before every request, the library calls `await session.async_ensure_token_valid()`, which refreshes the token if needed, and then reads the token from `session.token["access_token"]`. Keep token handling in the library, the setup, or the coordinator, never in entity code.

## Errors

When a token request fails, the helper raises one of these exceptions from `homeassistant.exceptions`. Each one is also a config entry exception that says what should happen, with a translated message, so you do not have to map them or add them to `strings.json`.

| Exception | Cause | Also a |
| --- | --- | --- |
| `OAuth2TokenRequestReauthError` | HTTP status 400 to 499, except 429 | `ConfigEntryAuthFailed` |
| `OAuth2TokenRequestTransientError` | HTTP status 429, or 500 to 599 | `ConfigEntryNotReady` |
| `OAuth2TokenRequestError` | Any other HTTP status. Base class of the two above. | `ConfigEntryNotReady` |
| `OAuth2TokenRequestConnectionError` | No response, or a response without a usable token | `ConfigEntryNotReady` |

`async_get_config_entry_implementation` works the same way: it raises `ImplementationUnavailableError` (a `ConfigEntryNotReady`) or `UnknownImplementationError` (a `ConfigEntryAuthFailed`). For backward compatibility, the token request exceptions also inherit from `aiohttp.ClientResponseError`, and `OAuth2TokenRequestConnectionError` from `aiohttp.ClientError`. When `async_ensure_token_valid` raises `OAuth2TokenRequestReauthError`, it has already started the reauthentication flow.

So let these exceptions propagate:

- **With a coordinator**, you do not need any error handling for them. `OAuth2TokenRequestReauthError` starts reauthentication, and the others count as a failed update that is retried. Do the first refresh in `async_setup_entry`, as in the example above, so the token is checked before the entities are set up.
- **Without a coordinator**, call `await session.async_ensure_token_valid()` in `async_setup_entry`. Home Assistant then retries the setup, or starts reauthentication.

Only catch one of them when your integration needs different behavior, like raising `ConfigEntryError` for a status that is permanent for this service. Catch the most specific exception, and let the rest through.

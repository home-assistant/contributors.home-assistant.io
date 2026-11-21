---
title: Secure integrations
description: Credentials, certificates, redaction, admin-only access, webhooks, and file paths. The patterns and helpers that keep an integration safe.
sidebarLabel: Integrations
order: 1
---

An [integration](/glossary/integration/) runs inside Home Assistant Core, in the same process, with access to everything. It talks to devices and services on the network, it stores the credentials of the user, and it can add new ways into Home Assistant, like actions, WebSocket commands, and webhooks. Each of those is a place where a mistake hurts.

The good news: Home Assistant has a helper for almost every one of them. This guide shows which one to use, and why. For the bigger picture of who Home Assistant trusts, read [how Home Assistant handles trust](/security/how-it-works/) first.

## Talk to the network safely

### Use the shared web session

Get your HTTP session from Home Assistant, and pass it to your library:

```python
from homeassistant.helpers.aiohttp_client import async_get_clientsession

session = async_get_clientsession(hass)
client = ExampleClient(entry.data[CONF_HOST], session=session)
```

For HTTPX, use `get_async_client(hass)` from `homeassistant.helpers.httpx_client`. Both check SSL certificates by default (`verify_ssl=True`). The aiohttp session also refuses a redirect from an address on the network to the local machine itself (a loopback address), which protects against server-side request forgery.

Passing the session in is also a rule of the quality scale: [inject-websession](/core/quality-scale/inject-websession/).

### Keep certificate checks on

Never turn off certificate checks by default. Some devices only have a self-signed certificate, and then users need a way out. Make it an option in the [config flow](/glossary/config-flow/), with checks on by default, like several integrations in Core do:

```python
from homeassistant.const import CONF_VERIFY_SSL

STEP_USER_DATA_SCHEMA = probatio.Schema(
    {
        probatio.Required(CONF_HOST): str,
        probatio.Required(CONF_VERIFY_SSL, default=True): bool,
    }
)
```

Then pass the choice of the user on to the session:

```python
session = async_get_clientsession(hass, entry.data[CONF_VERIFY_SSL])
```

Certificate checks matter. An advisory from 2025 was about [SSL validation of outgoing requests](https://github.com/home-assistant/core/security/advisories/GHSA-m3pm-rpgg-5wj6) in Core and the libraries it uses.

## Keep secrets secret

### Store credentials in the config entry

Credentials and connection details belong in the `data` of the [config entry](/glossary/config-entry/), not in its `options`. Options are for optional settings, which users change in the [options flow](/glossary/options-flow/).

When credentials stop working, ask the user for new ones with a [reauthentication flow](/glossary/reauthentication/), without setting up the integration again.

### Redact diagnostics

Users post [diagnostics](/glossary/diagnostics/) in public issues. Pass everything private through `async_redact_data`, which replaces the values of the keys you list with `**REDACTED**`, also in nested dictionaries and lists:

```python
from homeassistant.components.diagnostics import async_redact_data

TO_REDACT = {CONF_API_KEY, CONF_PASSWORD, "serial_number"}

return {"entry_data": async_redact_data(entry.data, TO_REDACT)}
```

Think beyond passwords: tokens, coordinates, addresses, names, email addresses, and serial numbers. See [diagnostics](/core/integrations/diagnostics/) for the full picture, including tests.

### Keep secrets out of logs

Users attach debug logs to issues too, when they report a problem. When a log line needs to identify a key or an ID, mask most of it with `partial_redact` from `homeassistant.helpers.redact`. It keeps the first 4 and the last 4 characters, and replaces short values completely:

```python
from homeassistant.helpers.redact import partial_redact

_LOGGER.debug("Using API key %s", partial_redact(api_key))
```

The same module has its own `async_redact_data`. It also accepts a mapping from a key to a function, so you can mask a value partly instead of removing it.

## Treat what comes in as untrusted

Data from a device, a cloud service, or a user can be wrong, or crafted on purpose.

- Validate the input of users with schemas. See [validating input](/core/development/input-validation/). Home Assistant checks the data of an action against its schema before your handler runs, so you do not need to check those fields again.
- Data from a device or a service does not go through those schemas. Check that values are what you expect before you use them.
- When a value goes into a URL or a file path, check it against a strict pattern first, like a slug. Otherwise a `../` or a `?` in it can point the request somewhere else.
- Never pass outside data to `eval()`, `exec()`, or a shell. Ruff, the linter of Core, flags `exec` (`S102`), `eval` (`S307`), and `subprocess` with `shell=True` (`S602`), among other risky calls.

What comes in also ends up in the interface: a device name or an entity name reaches dashboards and cards. The frontend has to treat those as untrusted. See [untrusted content in the frontend](/security/guides/frontend/).

## Guard the ways in

Every action, WebSocket command, HTTP view, and webhook you add is a new door into Home Assistant. Decide who may use it.

### Admin-only actions

An action that changes configuration, or has other security implications, should require an admin user. Register it with `async_register_admin_service`, which checks this for you:

```python
from homeassistant.helpers.service import async_register_admin_service

async_register_admin_service(
    hass, DOMAIN, "clear_cache", async_handle_clear_cache
)
```

An action that acts on entities needs a permission check too. See [permissions](/core/internals/permissions/).

### Admin-only WebSocket commands

Put the `require_admin` decorator on top:

```python
@websocket_api.require_admin
@websocket_api.websocket_command({probatio.Required("type"): "example/info"})
@websocket_api.async_response
async def handle_info(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return information about the example."""
```

### HTTP views

A `HomeAssistantView` requires a logged-in user by default (`requires_auth = True`). Only set `requires_auth = False` when there is no other way, and then check the request yourself, in every method of the view: `get` as much as `post` and `put`. For a view that only admins may use, decorate the handler with `require_admin` from `homeassistant.components.http`:

```python
from homeassistant.components.http import HomeAssistantView, require_admin


class ExampleUploadView(HomeAssistantView):
    """Accept an upload from an admin."""

    url = "/api/example/upload"
    name = "api:example:upload"

    @require_admin
    async def post(self, request: web.Request) -> web.Response:
        """Handle the upload."""
```

### Webhooks

A webhook does not need a login: anyone who knows the webhook ID can call it. That makes the ID a secret. Generate it with `webhook.async_generate_id()`, which returns 64 random hexadecimal characters.

When the device or service that calls your webhook is on the local network, register it as local only:

```python
webhook.async_register(
    hass, DOMAIN, entry.title, entry.entry_id, handle_webhook, local_only=True
)
```

Home Assistant then ignores requests that come from outside the local network, or through Home Assistant Link. It logs a warning and answers with `200 OK`, so the caller learns nothing. Webhooks accept `POST` and `PUT` by default. Use `allowed_methods` if you need something else.

An advisory from 2023 was about [local-only webhooks that were reachable from outside](https://github.com/home-assistant/core/security/advisories/GHSA-wx3j-3v2j-rf45), through the remote connection of Home Assistant Link.

## Check file paths

When a user gives your integration a path to read or write, like a folder to save a snapshot in, check it against the allowlist the user configured with `hass.config.is_allowed_path()`. It resolves the path first, so `..` tricks do not get through. It does blocking I/O, so run it in the executor:

```python
allowed = await hass.async_add_executor_job(
    hass.config.is_allowed_path, file_path
)
if not allowed:
    raise ServiceValidationError(
        translation_domain=DOMAIN,
        translation_key="path_not_allowed",
        translation_placeholders={"path": file_path},
    )
```

For URLs, `hass.config.is_allowed_external_url()` does the same against the allowed external URLs.

## What went wrong before

These [past advisories](/security/reference/advisories/) were about integrations and Core. Each one maps to a section of this guide.

- **An HTTP view without a login that only checked some methods.** The legacy Konnected integration checked a token on `POST` and `PUT`, but [not on `GET`](https://github.com/home-assistant/core/security/advisories/GHSA-x84v-g949-293w). See [HTTP views](#http-views).
- **Information before login.** The login page showed [all user accounts](https://github.com/home-assistant/core/security/advisories/GHSA-jqpc-rc7g-vf83) to anyone on the local network.
- **Local is not the same as trusted.** Local-only webhooks were [reachable from the internet](https://github.com/home-assistant/core/security/advisories/GHSA-wx3j-3v2j-rf45) through the remote connection of Home Assistant Cloud, now Home Assistant Link. See [webhooks](#webhooks).
- **Outside data in a request path.** A field of an action ended up in the path of a [Supervisor API request](https://github.com/home-assistant/core/security/advisories/GHSA-4r74-h49q-rr3h). See [treat what comes in as untrusted](#treat-what-comes-in-as-untrusted).
- **Certificate checks that were off without anyone noticing.** A parameter of aiohttp was [replaced the wrong way](https://github.com/home-assistant/core/security/advisories/GHSA-m3pm-rpgg-5wj6). See [keep certificate checks on](#keep-certificate-checks-on).

## Related

- [Security helpers](/security/reference/helpers/): all helpers on one page.
- [Dependencies and supply chain](/security/guides/dependencies/): what Home Assistant asks of the library your integration uses.
- [Authentication](/core/internals/auth/) and [permissions](/core/internals/permissions/): users, groups, and permission checks.

---
title: How authentication works
description: Users, groups, credentials, and tokens in Home Assistant, and the auth providers and multi-factor modules that verify who someone is.
sidebarLabel: How authentication works
sidebarGroup: Authentication
order: 20
---

Home Assistant has its own authentication system. It lives in `homeassistant/auth/`, and `hass.auth` is the auth manager that holds it together. This page explains its parts. To let an app log in to Home Assistant, see the [authentication API](/core/internals/auth-api/). To check what a user may do, see [permissions](/core/internals/permissions/).

## The parts

- **Users**: every person, and every system process that talks to Home Assistant, is a user. The user created during onboarding is the **owner**. The owner can manage other users and always has every permission.
- **Groups**: users are members of one or more groups, and groups carry the [permission policies](/core/internals/permissions/). Home Assistant has three: administrators (`system-admin`), users (`system-users`), and read-only users (`system-read-only`).
- **Auth providers**: verify who someone is, usually with a username and password. More below.
- **Credentials**: the proof that someone authenticated with a specific auth provider. Credentials link to a user. A user can have credentials from several providers, but only one per provider.
- **Refresh tokens and access tokens**: what an app gets after logging in. More below.

## Tokens

When someone logs in to an app, the app gets two tokens:

- An **access token**, valid for 30 minutes. It goes with every request to the APIs.
- A **refresh token**, used to get a new access token when the old one expires. A refresh token expires when it has not been used for 90 days, and the user can revoke it from their profile at any time.

Refresh tokens come in three types:

- **Normal**: created when a user logs in to an app. The app keeps it for the user.
- **Long-lived access token**: backs a long-lived access token a user creates on their profile. The refresh token itself is never shown to anyone.
- **System**: for system users only, like the Supervisor. Never shown to anyone.

## Auth providers

An auth provider confirms who someone is. It defines a login flow, built on the same data entry flow machinery as a [config flow](/glossary/config-flow/), that asks for whatever it needs: a username and password, a code, or nothing at all. When the flow succeeds, the provider hands Home Assistant a `Credentials` object.

Home Assistant ships these providers in `homeassistant/auth/providers/`:

- `homeassistant`: usernames and passwords stored in the configuration directory. This is the provider Home Assistant uses when `auth_providers` is not configured.
- `trusted_networks`: log in without a password from configured networks.
- `command_line`: verify a username and password with an external command.
- `insecure_example`: an example for development and tests. Configuration validation refuses it in `configuration.yaml`, because it is for testing only.

The user configures which providers are active under `auth_providers:` in the `homeassistant:` section of `configuration.yaml`. There can be several instances of the same provider, each with its own `id`. They do not share credentials.

> [!NOTE]
> Only built-in auth providers are supported. A custom integration cannot add one.

### Build an auth provider

A provider is a module in `homeassistant/auth/providers/` that implements two classes. Look at `insecure_example.py` for a complete, small example.

The `AuthProvider` subclass implements:

| Method | Required | Description |
| --- | --- | --- |
| `async_login_flow(context)` | Yes | Return the `LoginFlow` for someone to log in with. |
| `async_get_or_create_credentials(flow_result)` | Yes | Return the `Credentials` for the result of a finished login flow. Existing or new. |
| `async_user_meta_for_credentials(credentials)` | No | Return a `UserMeta` with details, like the name, for a new user created from these credentials. |

The `LoginFlow` subclass implements `async_step_init`. The first step of the flow is always `init`:

```python
async def async_step_init(
    self, user_input: dict[str, str] | None = None
) -> AuthFlowResult:
    """Ask for and check the username and password."""
    errors: dict[str, str] = {}

    if user_input is not None:
        try:
            self._auth_provider.async_validate_login(
                user_input["username"], user_input["password"]
            )
        except InvalidAuthError:
            errors["base"] = "invalid_auth"
        else:
            user_input.pop("password")
            return await self.async_finish(user_input)

    return self.async_show_form(
        step_id="init", data_schema=LOGIN_SCHEMA, errors=errors
    )
```

Do not pass the password on to `async_finish`: the result of the flow is what the provider turns into credentials.

`async_finish` takes over from there: if the user has multi-factor modules set up, the flow continues with those before it creates the credentials.

## Multi-factor authentication modules

A multi-factor authentication (MFA) module adds a second step to logging in, after the auth provider. A user can set up several modules, and picks one when they log in. Home Assistant ships these in `homeassistant/auth/mfa_modules/`:

- `totp`: time-based one-time passwords from an authenticator app.
- `notify`: a one-time password sent through a notify action.
- `insecure_example`: an example for development and tests.

The user configures them under `auth_mfa_modules:` in the `homeassistant:` section of `configuration.yaml`. Without that key, Home Assistant loads `totp`. Like auth providers, only built-in modules are supported.

### Build an MFA module

A module is a subclass of `MultiFactorAuthModule` in `homeassistant/auth/mfa_modules/`. See `insecure_example.py` for a complete example.

| Method | Required | Description |
| --- | --- | --- |
| `input_schema` | Yes | A property with the schema of the form the user fills in when they log in. |
| `async_setup_flow(user_id)` | Yes | Return the `SetupFlow` that sets the module up for a user. |
| `async_setup_user(user_id, setup_data)` | Yes | Set up the module for a user. |
| `async_depose_user(user_id)` | Yes | Remove everything this module stored for a user. |
| `async_is_user_setup(user_id)` | Yes | Return whether the module is set up for a user. |
| `async_validate(user_id, user_input)` | Yes | Return whether what the user entered is valid. |
| `async_initialize_login_mfa_step(user_id)` | No | Called before the MFA step of a login is shown, like the `notify` module does to send the code. |

Users set up modules from their profile. The setup is a data entry flow too, a subclass of `SetupFlow`. For `totp`, that flow generates a secret, shows it as a QR code, and asks for a code to confirm the authenticator app and the clock agree. Only then is the module enabled for the user.

The MFA step has a time limit: when more than 5 minutes have passed since the login started, the login flow aborts it with `login_expired` before it calls `async_validate`. Your module only checks the code.

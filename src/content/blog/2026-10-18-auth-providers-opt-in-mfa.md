---
title: "Auth providers now opt in to multi-factor authentication"
description: As of Home Assistant Core 2026.11, a login flow asks for a second factor only when it extends MfaLoginFlow. The support_mfa property is removed.
date: 2026-10-18
authors:
  - Josef Zweck
areas:
  - core
---

As of Home Assistant Core 2026.11, a login flow only asks for a second factor when it extends the new `MfaLoginFlow`. The auth manager no longer adds the MFA steps to every provider, and `AuthProvider.support_mfa` is removed.

## What to do

Only relevant if your custom integration patches in its own auth provider.

> [!NOTE]
> Custom auth providers are not supported.

To ask for a second factor, extend `MfaLoginFlow`:

```python
from homeassistant.auth.providers import MfaLoginFlow


class MyLoginFlow(MfaLoginFlow[MyAuthProvider]):
    ...
```

If your provider overrides `support_mfa`, remove the property and keep extending `LoginFlow`.

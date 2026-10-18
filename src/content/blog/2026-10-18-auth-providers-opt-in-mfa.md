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

To ask for an enabled second factor, extend `MfaLoginFlow`. After validating the first factor, return `await self.async_finish(flow_result)` instead of calling `self.async_create_entry(data=flow_result)` directly, which bypasses the MFA check. If you override `async_finish`, return `await super().async_finish(flow_result)` so the MFA check still runs.

For example, change your login flow's base class:

```python
from homeassistant.auth.providers import MfaLoginFlow


class MyLoginFlow(MfaLoginFlow[MyAuthProvider]):
    ...
```

If your provider overrides `support_mfa`, remove the property. If it returned `True`, extend `MfaLoginFlow` as shown above, or your provider stops asking for a second factor. If it returned `False`, keep extending `LoginFlow`.

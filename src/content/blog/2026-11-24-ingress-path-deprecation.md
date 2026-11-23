---
title: "X-Ingress-Path is deprecated in favor of X-Forwarded-Prefix"
description: "Home Assistant 2026.12 adds the X-Forwarded-Prefix header to ingress requests and deprecates X-Ingress-Path, which will be removed in Home Assistant 2027.12."
date: 2026-11-24
authors:
  - Felipe Santos
areas:
  - apps
---

From Home Assistant 2026.12, requests that reach your app through [ingress](/apps/guides/ingress/) include the `X-Forwarded-Prefix` header. It has the same value as `X-Ingress-Path`: the path your app is served under, like `/api/hassio_ingress/<token>`. `X-Ingress-Path` is deprecated and will be removed in Home Assistant 2027.12.

<!--truncate-->

## Why

`X-Forwarded-Prefix` is a common proxy header, and many web frameworks and reverse proxies can apply it for you, like Werkzeug with `ProxyFix(x_prefix=1)` or Spring Boot with `server.forward-headers-strategy=framework`. Only Home Assistant sends `X-Ingress-Path`, so apps have to handle it in their own code or configuration.

## What to do

If your app does not read `X-Ingress-Path`, you do not need to change anything.

If it does, switch to `X-Forwarded-Prefix` before Home Assistant 2027.12. If your framework or a reverse proxy in your app can apply the header for you, you may be able to drop that code. If your app still supports releases before 2026.12, keep `X-Ingress-Path` until you raise the minimum version with `homeassistant: 2026.12.0` in `config.yaml`. Those releases pass on any `X-Forwarded-Prefix` the client sends, so your app cannot trust it there.

Check one case now, even if you switch later. From 2026.12, an app that adds `X-Ingress-Path` to its URLs while its framework also applies `X-Forwarded-Prefix` gets the path twice, like `/api/hassio_ingress/<token>/api/hassio_ingress/<token>/static/app.js`. Read only one of the two headers.

From 2026.12, Home Assistant replaces any `X-Forwarded-Prefix` the client sends, so your app can trust the value as long as it only accepts connections from `172.30.32.2`.

## Timeline

1. Home Assistant 2026.12 adds `X-Forwarded-Prefix` and deprecates `X-Ingress-Path` ([home-assistant/core#193747](https://github.com/home-assistant/core/pull/193747)).
2. Home Assistant 2027.12 removes `X-Ingress-Path`.

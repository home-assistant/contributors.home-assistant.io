---
title: "Ingress requests now include X-Forwarded-Prefix"
description: "Home Assistant 2027.1 adds the standard X-Forwarded-Prefix header to ingress requests. Check that your app does not apply the ingress path twice."
date: 2026-11-23
authors:
  - Felipe Santos
areas:
  - apps
---

Starting with Home Assistant 2027.1, requests that reach your app through [ingress](/apps/guides/ingress/) include the `X-Forwarded-Prefix` header.
It has the same value as `X-Ingress-Path`, the path your app is served under, like `/api/hassio_ingress/<token>`.
`X-Ingress-Path` does not change.

<!--truncate-->

## Why

`X-Forwarded-Prefix` is the header that web frameworks and reverse proxies already know.
Werkzeug with `ProxyFix(x_prefix=1)`, Spring, and others read it by themselves to build correct URLs behind a proxy.
With it, your app may work under ingress without reading a header that only Home Assistant sends.

## What to check

If your app reads `X-Ingress-Path` and adds it to its URLs, check whether your web framework, or a reverse proxy inside your app, also honors `X-Forwarded-Prefix`.
If it does, both apply the path, and your URLs end up with it twice, like `/api/hassio_ingress/<token>/api/hassio_ingress/<token>/static/app.js`.

Pick one of the two:

- Stop adding `X-Ingress-Path` yourself, and let the framework use `X-Forwarded-Prefix`.
- Keep using `X-Ingress-Path`, and turn off the `X-Forwarded-Prefix` handling of your framework, or remove the header before it reaches the framework.

Apps that only use `X-Ingress-Path`, or only use relative URLs, need no change.

Home Assistant replaces any `X-Forwarded-Prefix` a client sends, so your app can trust the value, as long as it only accepts connections from `172.30.32.2`.

See [the pull request](https://github.com/home-assistant/core/pull/193747) for the full change.

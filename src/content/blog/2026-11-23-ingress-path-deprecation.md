---
title: "X-Ingress-Path is deprecated in favor of X-Forwarded-Prefix"
description: "Home Assistant 2027.1 adds the standard X-Forwarded-Prefix header to ingress requests and deprecates X-Ingress-Path, which will be removed in Home Assistant 2028.1."
date: 2026-11-23
authors:
  - Felipe Santos
areas:
  - apps
---

Starting with Home Assistant 2027.1, requests that reach your app through [ingress](/apps/guides/ingress/) include the `X-Forwarded-Prefix` header. It has the same value as `X-Ingress-Path`, the path your app is served under, like `/api/hassio_ingress/<token>`. `X-Ingress-Path` is deprecated and will be removed in Home Assistant 2028.1.

<!--truncate-->

## Why

`X-Forwarded-Prefix` is the header that web frameworks and reverse proxies already know. Many of them can apply it for you once you turn it on, like Werkzeug with `ProxyFix(x_prefix=1)` or Spring Boot with `server.forward-headers-strategy=framework`. With it, your app may work under ingress without reading a header that only Home Assistant sends.

## What to do

If your app does not read `X-Ingress-Path`, no change is necessary.

If it does, switch to `X-Forwarded-Prefix` before Home Assistant 2028.1. If your web framework or a reverse proxy inside your app can apply `X-Forwarded-Prefix` for you, you may be able to remove that code completely.

Check this soon, even if you plan to switch later. From Home Assistant 2027.1, an app that adds `X-Ingress-Path` to its URLs, while its framework also applies `X-Forwarded-Prefix`, gets the path twice, like `/api/hassio_ingress/<token>/api/hassio_ingress/<token>/static/app.js`. Use one of the two headers, not both.

Home Assistant replaces any `X-Forwarded-Prefix` a client sends, so your app can trust the value, as long as it only accepts connections from `172.30.32.2`.

## Timeline

1. Home Assistant 2027.1 adds `X-Forwarded-Prefix` and deprecates `X-Ingress-Path` ([home-assistant/core#193747](https://github.com/home-assistant/core/pull/193747)).
2. Home Assistant 2028.1 removes `X-Ingress-Path`.

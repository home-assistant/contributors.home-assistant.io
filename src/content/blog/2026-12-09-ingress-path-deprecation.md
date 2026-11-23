---
title: "X-Ingress-Path is deprecated in favor of X-Forwarded-Prefix"
description: "If your app uses ingress, you may need to update it. Home Assistant 2026.12 adds the X-Forwarded-Prefix header and deprecates X-Ingress-Path, which will be removed in Home Assistant 2027.12."
date: 2026-12-09
authors:
  - Felipe Santos
areas:
  - apps
---

If you develop an app that uses [ingress](/apps/guides/ingress/), you may need to update it. Since Home Assistant 2026.12, every ingress request has a new header, `X-Forwarded-Prefix`, that tells your app which path it is served under. Until now, apps got that path from `X-Ingress-Path`, which is deprecated and will be removed in Home Assistant 2027.12.

<!--truncate-->

## What the path is for

With ingress, the browser opens your app under a path like `/api/hassio_ingress/<token>/`. That path, also called the prefix, is removed before the request reaches your app. When the browser asks for `/api/hassio_ingress/<token>/static/app.js`, your web server only sees `/static/app.js`.

Relative URLs work without knowing the prefix. Your app does need it to build an absolute URL, for example for a redirect to its login page. The token is different on every installation, so Home Assistant sends the prefix in a header.

`X-Ingress-Path` is a header that only Home Assistant uses, so every app has to handle it in its own code or proxy configuration. `X-Forwarded-Prefix` has the same value, and many web frameworks and reverse proxies can apply it for you, like Werkzeug with `ProxyFix(x_prefix=1)` or Spring Boot with `server.forward-headers-strategy=framework`.

## Check if your app is affected

Search your app for `X-Ingress-Path`, including the configuration of its web server or proxy. It can also be spelled `HTTP_X_INGRESS_PATH`, as in Python WSGI and PHP, or `$http_x_ingress_path`, as in nginx.

If you do not find it, you most likely do not need to change anything. If you do, continue with the next section.

## What to do

Read `X-Forwarded-Prefix` if it is available, and fall back to `X-Ingress-Path` if it is not. That way, your app keeps working on releases before 2026.12, and is ready for 2027.12.

In Python, for example:

```python
prefix = (
    request.headers.get("X-Forwarded-Prefix")
    or request.headers.get("X-Ingress-Path")
    or ""
)
```

In nginx, add this to the `http` block, and use `$ingress_prefix` where you now use `$http_x_ingress_path`:

```nginx
map $http_x_forwarded_prefix $ingress_prefix {
    default $http_x_forwarded_prefix;
    ""      $http_x_ingress_path;
}
```

If your framework or proxy already applies `X-Forwarded-Prefix`, make sure your own code only adds `X-Ingress-Path` when `X-Forwarded-Prefix` is missing. Otherwise, the prefix ends up in your URLs twice, like `/api/hassio_ingress/<token>/api/hassio_ingress/<token>/static/app.js`.

## Before you trust X-Forwarded-Prefix

Releases before 2026.12 do not set `X-Forwarded-Prefix`, but they do pass it on when the client sends it. Your app must require 2026.12.0 in its `config.yaml` before it can trust the header:

```yaml
homeassistant: 2026.12.0
```

From that release, Home Assistant replaces any `X-Forwarded-Prefix` the client sends. Your app can then trust the value, as long as it only accepts connections from `172.30.32.2`, and you can remove the fallback to `X-Ingress-Path`.

Users on an older release cannot update to a version of your app that requires 2026.12.0 until they update Home Assistant. If you want to keep supporting them for now, keep the fallback and do not rely on the value for anything security related.

## Timeline

1. Home Assistant 2026.12 adds `X-Forwarded-Prefix` and deprecates `X-Ingress-Path` ([home-assistant/core#193747](https://github.com/home-assistant/core/pull/193747)).
2. Home Assistant 2027.12 removes `X-Ingress-Path`.

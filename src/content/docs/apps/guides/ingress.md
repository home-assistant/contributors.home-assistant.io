---
title: Add a web interface with ingress
description: Show the web interface of your app inside Home Assistant, with Home Assistant taking care of authentication.
order: 6
---

Ingress shows the web interface of your app inside the Home Assistant UI, with its own sidebar entry if the user wants one. Home Assistant handles the login, so users do not need a separate password, and you do not need to open a port on the host. It also gives your app the best [security rating](/apps/reference/security-rating/).

If your app has a web interface, use ingress.

## How it works

The browser talks to Home Assistant at a URL like `/api/hassio_ingress/<token>/`. Home Assistant checks the user's session and passes the request to the Supervisor, which forwards it to your app on the internal network. Your web server only ever sees requests from the Supervisor, at `172.30.32.2`.

The proxy supports HTTP/1.x, streaming responses, and WebSockets.

## Set it up

1. Turn on ingress in `config.yaml`:

   ```yaml
   ingress: true
   ```

2. Run your web server on port 8099 in the container, or set `ingress_port` to the port it uses.
3. Only accept connections from `172.30.32.2`. Deny everything else.
4. Do not ask for a login. The user is already logged in to Home Assistant.

After installing, the app page shows **Open Web UI**, and the user can turn on **Show in sidebar**. Set the icon and title of that entry with `panel_icon` and `panel_title`. With `panel_admin: false`, users who are not administrators see it too.

## Work with relative URLs

Your web interface is served under a path that changes per installation, like `/api/hassio_ingress/Xs3V.../`. This is where most ingress problems come from. Absolute links, like `/static/app.js` or a redirect to `/login`, point to Home Assistant instead of your app and fail.

- Use relative URLs everywhere: `static/app.js`, not `/static/app.js`.
- From Home Assistant 2027.1, Home Assistant adds the header `X-Forwarded-Prefix` to every request, with the path your app is served under. Use it when you need to build absolute URLs, or to set a base path in software that supports one. Many web frameworks and reverse proxies can apply `X-Forwarded-Prefix` for you once you turn it on, like Werkzeug with `ProxyFix(x_prefix=1)` or Spring Boot with `server.forward-headers-strategy=framework`.
- Home Assistant also adds the header `X-Ingress-Path`, with the same value. It is deprecated and will be removed in Home Assistant 2028.1. If your app reads it, switch to `X-Forwarded-Prefix`. If your app also supports releases before 2027.1, fall back to `X-Ingress-Path` when `X-Forwarded-Prefix` is missing. Do not use both: if your app adds `X-Ingress-Path` to its URLs and its framework also applies `X-Forwarded-Prefix`, the URLs end up with the path twice.
- The ingress URL is also available from the Supervisor API, as `ingress_url` and `ingress_entry` in `GET /addons/self/info`.

If the start page of your app is not at `/`, set `ingress_entry` to its path.

## Know who is there

When Home Assistant opens an ingress session for a logged-in user, the Supervisor adds headers that identify that user to the requests of the session:

| Header | Contents |
| --- | --- |
| `X-Remote-User-Id` | The ID of the user |
| `X-Remote-User-Name` | The username |
| `X-Remote-User-Display-Name` | The display name |

These headers are not guaranteed. The Supervisor only sets them when it found the user of the session, and leaves out the username or display name when the user has none. Handle a request without them explicitly, especially when your app decides per user what someone may do: treat it as unknown, not as a default user.

The Supervisor removes these headers from incoming requests and sets them itself, so your app can trust them, as long as it only accepts connections from `172.30.32.2`.

## Large uploads

By default, the Supervisor reads a request body completely before it forwards it. For apps that receive large uploads, set `ingress_stream: true` to stream POST bodies to your app instead.

## Apps on the host network

An app on the host network shares its ports with the host and every other app there. A fixed `ingress_port` can then clash. Set `ingress_port: 0`, and the Supervisor picks a free port between 62000 and 65500 when the app starts. Read it at startup, with Bashio:

```bash
#!/command/with-contenv bashio

port=$(bashio::app.ingress_port)
exec my-web-server --port "${port}"
```

Do not map any port in that range in `ports`; the Supervisor rejects that configuration.

## Example with nginx

A minimal app that serves a page through nginx. The `Dockerfile`:

```dockerfile
FROM ghcr.io/home-assistant/base:3.24

RUN apk add --no-cache nginx && mkdir -p /run/nginx

COPY ingress.conf /etc/nginx/http.d/

CMD [ "nginx", "-g", "daemon off; error_log /dev/stdout info;" ]
```

The nginx configuration, `ingress.conf`, only allows the Supervisor:

```nginx
server {
    listen 8099;
    allow  172.30.32.2;
    deny   all;
}
```

And `config.yaml`:

```yaml
name: "Ingress example"
version: "1.0.0"
slug: "ingress_example"
description: "Ingress testing"
arch:
  - aarch64
  - amd64
init: false
ingress: true
```

Install it, start it, and select **Open Web UI** on the app page.

## Without ingress

If your web interface cannot work under a changing path, or users need to reach it from outside Home Assistant, expose a port with `ports` and set `webui`, so the app page gets an **Open Web UI** button that opens it directly. Then your app has to handle its own authentication. Consider [`auth_api`](/apps/guides/security/#use-home-assistant-users) to check logins against Home Assistant users.

---
title: Run the frontend
description: Run your development frontend against a development Home Assistant, or against a Home Assistant you already have.
order: 2
---

The frontend needs a Home Assistant Core to talk to. There are two ways to connect them:

- **Core serves your frontend.** You run a development Core and tell it to use your [frontend repository](https://github.com/home-assistant/frontend) instead of the built-in one. This is how it works in production, so everything works, including the login page and onboarding.
- **Your frontend connects to a Core.** You serve the frontend yourself and point it at any Home Assistant, even the one running your home. Quick to set up and leaves that Home Assistant alone. The catch: some parts, like the login page, always come from the Core you connect to.

> [!CAUTION]
> Never use development mode in production. Home Assistant caches the frontend aggressively to make it fast on mobile. Development mode turns that off, so you don't have to restart between changes.

## Core serves your frontend

The development server builds the frontend into the `hass_frontend` folder of the repository, and rebuilds it when you save. Core serves it when the `development_repo` option of the `frontend` integration points at your repository.

### In the frontend devcontainer

The devcontainer can run Core for you:

1. In a terminal, run `script/core`. The first time, it installs the `dev` branch of Core and creates a `config` folder with `development_repo` already set, and the `demo` integration for some entities to play with. Use `script/core -r <ref>` to install another branch or tag, or `script/core -s` to skip the install.
2. In a second terminal, start the development server:

   ```shell
   pnpm dev
   ```

3. When the log says `Build done`, open `http://localhost:8124`.

### With your own Core development environment

If you already work on Core, point its configuration at your clone of the frontend. In the `configuration.yaml` of your development Core:

```yaml
frontend:
  development_repo: /path/to/frontend
```

If the path is wrong or not accessible, the frontend won't load. Then start Core, run `pnpm dev` in the frontend repository, and open Home Assistant as usual, on port 8123.

When you use the Core devcontainer, the frontend repository must be visible inside that container. Mount it by adding this to `.devcontainer/devcontainer.json` in the [Core repository](https://github.com/home-assistant/core), and rebuild the container with **Dev Containers: Rebuild Container**:

```json
"mounts": [
  "source=/path/to/frontend,target=/workspaces/frontend,type=bind"
]
```

Then use the path inside the container, `/workspaces/frontend`, for `development_repo`.

> [!WARNING]
> Don't commit the `mounts` change to Core: it has a path from your machine in it. The setting is only read when the container is built, so you can undo it once the rebuild is done.

The [Core development environment](/core/development/environment/) explains how to set up Core itself.

## Your frontend connects to a Core

`pnpm dev:serve` builds the frontend and serves it on port 8124, connected to the Core on `http://localhost:8123`:

```shell
pnpm dev:serve
```

To connect to another Home Assistant, pass its URL with `-c`. It does not have to be a development version:

```shell
pnpm dev:serve -c http://homeassistant.local:8123
```

That Home Assistant has to accept requests from your development frontend. In the Home Assistant you connect to:

1. Go to **Settings** > **System** > **Network**.
2. Under **HTTP server**, open **More options**, and add `http://localhost:8124` to **CORS allowed origins**. Enter it exactly like that, without a trailing slash, or your browser's requests won't match it.
3. Select **Save**, then **Save and restart**.
4. When Home Assistant is back, confirm the new settings in the **Confirm new HTTP server configuration** dialog. If you don't confirm them within 5 minutes, Home Assistant reverts them and restarts again.

Before Home Assistant 2026.8, these settings live in `configuration.yaml` instead. Add the address to its `http` section, and restart Home Assistant:

```yaml title="configuration.yaml"
http:
  cors_allowed_origins:
    - http://localhost:8124
```

A few things to know:

- Use `-p` to serve on another port, like `pnpm dev:serve -p 8654`. Add that address to **CORS allowed origins** instead.
- Inside the devcontainer, the frontend is served on port 8123 in the container, which is port 8124 on your computer. The URL you pass with `-c` is opened by your browser, not by the container, so `localhost` means your computer.
- The frontend remembers which Home Assistant you logged in to. When you change `-c`, log out first, or it keeps using the old one.

## Keep a server running in the background

All development servers accept the same flags to manage them without keeping a terminal open:

| Flag | What it does |
| --- | --- |
| `--background` | Start the server detached, wait until it is ready, print its URL and process ID, and exit. |
| `--status` | Report whether the server is running. |
| `--logs` | Print the log of the server. Add `--follow` to keep watching it. |
| `--stop` | Stop a server that runs in the background. |

For example:

```shell
pnpm dev:serve --background
pnpm dev:serve --logs --follow
pnpm dev:serve --stop
```

Only one development server or production build can run at a time, because they share the build output. Starting a second one tells you which one is running, and how to stop it. A cold build waits up to 180 seconds to become ready. Set `HA_DEV_SERVER_TIMEOUT` to a number of seconds to change that.

When a server runs in the background, its log is written to `node_modules/.cache/ha-dev-server/`. When the script detects that a coding agent started it, a plain `pnpm dev` or `pnpm dev:*` goes to the background by itself, so it does not block the agent. Set `HA_DEV_BACKGROUND=0` to keep it in the foreground.

## Browser settings

The frontend uses a service worker and caching, which can show you an old build after a change. In the developer tools of your browser:

1. On the **Network** tab, enable **Disable cache**.
2. Under **Application** > **Service workers**, enable **Bypass for network**.

These are the names in Chrome and other Chromium browsers. Other browsers have similar settings.

## Look at the hass object

Every part of the frontend gets its data from one object, `hass`. To see what is in it, open the developer tools, select the `<home-assistant>` element on the **Elements** tab, and run this in the console:

```js
$0.hass
```

That is for exploring only. In code, use the data your component gets passed. [The hass object and contexts](/frontend/architecture/hass-and-contexts/) explains how.

---
title: Build a real app
description: Walk through a complete app, the way experienced app developers set one up. Services with S6 overlay, options with Bashio, translations, documentation, CI, and releases.
order: 3
---

[Your first app](/apps/first-app/) shows how little an app needs. A real app needs more: services that start in the right order and stop the container when they crash, options with validation, logs with levels, documentation, linting, images for every architecture, and releases.

The best way to learn that is to read a real one. [hassio-addons/app-example](https://github.com/hassio-addons/app-example) is the example app of Home Assistant Community Apps, a project that maintains a set of community apps, and [Bashio](/apps/bashio/). It shows a random quote in the log every few seconds. That is not useful by itself, but everything around it is set up the way a maintained app should be. This tutorial walks through it, file by file.

Open the repository next to this page. You do not need to build anything to follow along, but you can install the example to see it run, and copy it as the start of your own app.

## Try it first

The example app is published in the [Home Assistant Community Apps repository](https://github.com/hassio-addons/repository). To install it:

1. Add the repository: under **Settings** > **Apps**, open the **App store**, and in the top-right menu, select **Repositories**. Add `https://github.com/hassio-addons/repository`.
2. Find **Example** in the store, and select **Install**.
3. Select **Start**, then open the **Log** tab.

You see a banner with the name and version of the app and your system, then a quote every five seconds, and every ten seconds a line from a second service. Change **Seconds between quotes** on the **Configuration** tab, restart the app, and watch the log.

## 1. The repository

Home Assistant Community Apps gives every app its own Git repository. A separate repository, the one you just added, lists the released apps for users. The app repository looks like this, leaving out a few files for GitHub like the issue template and code of conduct:

```text
app-example/
├── .github/
│   ├── workflows/
│   │   ├── ci.yaml
│   │   ├── deploy.yaml
│   │   ├── labels.yaml
│   │   ├── pr-labels.yaml
│   │   └── release-drafter.yaml
│   └── renovate.json
├── example/
│   ├── rootfs/
│   ├── translations/
│   │   └── en.yaml
│   ├── .README.j2
│   ├── build.yaml
│   ├── config.yaml
│   ├── Dockerfile
│   ├── DOCS.md
│   ├── icon.png
│   └── logo.png
├── .yamllint
├── LICENSE.md
└── README.md
```

The app itself is the `example` folder. Everything outside it is for the people who work on the app: workflows, linter settings, and the license.

You do not have to split your apps like this. You can also keep all your apps in one repository, with a `repository.yaml` at the top, so users add that repository directly. [home-assistant/apps-example](https://github.com/home-assistant/apps-example) is set up that way. [Create and share a repository](/apps/guides/repository/) explains that setup. The `example` folder works the same way in both.

## 2. The configuration

`example/config.yaml` tells the Supervisor what the app is and what the user can set:

```yaml
---
name: Example
version: dev
slug: example
description: Example app by Home Assistant Community Apps
url: https://github.com/hassio-addons/app-example
init: false
arch:
  - aarch64
  - amd64
options:
  log_level: info
  seconds_between_quotes: 5
schema:
  log_level: list(trace|debug|info|notice|warning|error|fatal)
  seconds_between_quotes: int(1,120)
```

A few things to notice:

- `version: dev` is a placeholder. When a release is published, the tooling of Home Assistant Community Apps writes the real version, and the `image` to pull, into the copy of this file in the app repository users add. In your own repository, put the real version here, and add `image` once you publish images. See [Publish your app](/apps/guides/publishing/).
- `init: false` is required with the base images, because S6 overlay must be the first process in the container. [Run services with S6 overlay](/apps/guides/s6-overlay/#what-the-base-images-set-up) explains why.
- The schema does the validation for you. `int(1,120)` means the Supervisor refuses anything outside 1 to 120, so the script never has to check. `list(...)` shows a dropdown.
- `log_level` is a common convention: users turn on debug logging themselves when something goes wrong, without a new version of your app.

Every key is in the [app configuration](/apps/reference/configuration/) reference. Options and their types are in [Add options](/apps/guides/options/).

## 3. The Dockerfile

`example/Dockerfile`, shortened:

```dockerfile
ARG BUILD_FROM=ghcr.io/hassio-addons/base:21.0.8
# hadolint ignore=DL3006
FROM ${BUILD_FROM}

# Copy root filesystem
COPY rootfs /

# Setup base
RUN apk add --no-cache \
    coreutils=9.11-r0 \
    wget=1.25.0-r3

# Build arguments
ARG BUILD_ARCH
ARG BUILD_VERSION

# Labels
LABEL \
    io.hass.arch="${BUILD_ARCH}" \
    io.hass.version=${BUILD_VERSION}
```

The full file adds more build arguments and labels: a name, description, build date, Git commit, and the Open Container Initiative labels like `org.opencontainers.image.source`. The build workflow fills those in; the Supervisor only passes `BUILD_ARCH`, `BUILD_VERSION`, and, with a `build.yaml`, `BUILD_FROM` and any build arguments you list under `args:` in that file. It also sets `io.hass.type="app"`. The legacy value of that label is `addon`. See [labels](/apps/guides/dockerfile/#labels).

What to take from it:

- **The base image.** The example starts from the base image of Home Assistant Community Apps. Like the [Home Assistant base images](/apps/guides/dockerfile/#base-images), it is Alpine Linux with S6 overlay, Bashio, and Tempio. It adds a startup banner in the log and sets the Bashio log level from a `log_level` option. You can use either.
- **`build.yaml`.** The example also has a `build.yaml` with the base image per architecture. Its build workflow reads `build_from` from that file. The Supervisor still reads it, but logs that it is deprecated. In your own app, put the base image in the `Dockerfile` with a default for `BUILD_FROM`, as on the first line here, and leave `build.yaml` out. See [build.yaml](/apps/guides/dockerfile/#buildyaml).
- **Pinned versions.** The base image and every Alpine package have an exact version. Builds are repeatable, and [Renovate](https://docs.renovatebot.com/) opens a pull request when a new version is out. The `.github/renovate.json` of the example has the rules that find these versions in the `Dockerfile`.
- **`COPY rootfs /`.** All the files of the app live in `rootfs`, in the place they go in the image. No `CMD` and no `ENTRYPOINT`: S6 overlay starts what is in `rootfs`.
- **hadolint.** The comment `# hadolint ignore=DL3006` silences one rule of the Dockerfile linter that runs in CI, because the base image tag comes from an argument.

## 4. Services with S6 overlay

`example/rootfs/etc/s6-overlay/` has three services:

| Service | Type | Depends on | What it does |
| --- | --- | --- | --- |
| `init-example` | oneshot | `base` | Runs once at startup and logs a greeting. In a real app, this is where you write configuration files. |
| `example1` | longrun | `init-example` | Runs `/usr/bin/example1.sh`, the quote loop. |
| `example2` | longrun | `example1` | Runs `/usr/bin/example2.sh`, a second loop. |

The `run` script of a longrun logs a line, then hands over to the program with `exec`:

```bash
#!/command/with-contenv bashio
# shellcheck shell=bash

bashio::log.info "Starting Example1..."

exec /usr/bin/example1.sh
```

Each longrun has a `finish` script that stops the whole container when the program crashes, so the Supervisor sees the failure. All three are in the `user` bundle, through empty files in `user-bundles.d/user/contents.d/`.

How the folders, the `type`, `up`, and `finish` files, and the dependencies work is in [Run services with S6 overlay](/apps/guides/s6-overlay/). Read that guide next to the example; it uses this exact layout.

## 5. Read options with Bashio

The quote loop in `rootfs/usr/bin/example1.sh` reads its option once, at startup:

```bash
#!/command/with-contenv bashio
# shellcheck shell=bash

main() {
    local sleep

    bashio::log.trace "${FUNCNAME[0]}"

    sleep=$(bashio::config 'seconds_between_quotes')
    bashio::log.info "Seconds between each quotes is set to: ${sleep}"

    while true; do
        display_quote
        sleep "${sleep}"
    done
}
main "$@"
```

`bashio::config` gets the options from the Supervisor API, which is why the script starts with `with-contenv`: that gives it the token it needs. Options only change when the user saves them and restarts the app, so reading them once is enough.

Other functions you use for options:

```bash
# Is an optional option set?
if bashio::config.has_value 'username'; then
  bashio::log.info "Logging in as $(bashio::config 'username')"
fi

# Stop with a clear message when a required option is empty
bashio::config.require 'password'

# A boolean option
if bashio::config.true 'ssl'; then
  bashio::config.require.ssl
fi
```

All of them are in the [Bashio options reference](/apps/bashio/config/).

## 6. Log with levels

The example logs at different levels. `bashio::log.info` for normal events, `bashio::log.notice` when it falls back to an offline quote, and `bashio::log.trace` at the start of every function, for when someone needs to see everything.

The user picks the level with the `log_level` option. The community base image applies it before your services start, so `bashio::log.debug` and `bashio::log.trace` stay quiet unless the user asks for them. On a Home Assistant base image, set it yourself at the start of your first service:

```bash
if bashio::config.has_value 'log_level'; then
  bashio::log.level "$(bashio::config 'log_level')"
fi
```

One more thing the example shows. Bashio stops the script when a command fails. The example fetches a quote with `grep`, and `grep` fails when it finds nothing. So the example adds `|| true`, with a comment that says why:

```bash
# The page might not contain a quote at all, in which case grep exits
# non-zero. Bashio runs with errexit (and inherit_errexit), so swallow
# that here and let the caller deal with an empty quote instead.
quote=$(grep -e "<dt>" -e "</dd>" <<< "${html}" | ...) || true
```

Logging, log levels, and error handling are in the [Bashio logging reference](/apps/bashio/logging/).

## 7. Translations and documentation

What users see of the app, apart from the log:

- `translations/en.yaml` gives the options a readable name and description on the **Configuration** tab. Without it, the user sees `seconds_between_quotes`.
- `DOCS.md` is the **Documentation** tab: how to install the app, every option, and where to get help.
- `icon.png` and `logo.png` show up in the app store and on the app page.
- `.README.j2` is a template for the `README.md` of the app in the repository users add. The release tooling of Home Assistant Community Apps renders it, with the version and, for the beta and edge channels, a warning. If you keep your apps in one repository, write a plain `README.md` instead.

The translation file of the example:

```yaml
---
configuration:
  log_level:
    name: Log level
    description: The amount of logging the app should do.
  seconds_between_quotes:
    name: Seconds between quotes
    description: >-
      The number of seconds the app waits until showing a new quote in the
      app log.
```

[Present your app](/apps/guides/presentation/) covers each of these files.

## 8. Continuous integration

Every pull request runs `.github/workflows/ci.yaml`. It calls a shared workflow from [hassio-addons/workflows](https://github.com/hassio-addons/workflows), pinned to a commit. That workflow:

1. Reads the app information from `config.yaml` and `build.yaml`: the slug, the architectures, and the base image.
2. Runs the linters, each as its own job:
   - The app linter, [frenck/action-app-linter](https://github.com/frenck/action-app-linter), which validates `config.yaml` and warns about defaults you can leave out.
   - [Hadolint](https://github.com/hadolint/hadolint) for the `Dockerfile`.
   - [ShellCheck](https://www.shellcheck.net/) for the scripts, including the `run` and `finish` files of the S6 services.
   - yamllint, with the rules in `.yamllint`, and `jq` for every JSON file.
   - Prettier, for JSON, JavaScript, Markdown, and YAML.
   - [zizmor](https://github.com/zizmorcore/zizmor), for security problems in the workflows themselves.
3. Reviews the dependencies that the pull request changes.
4. Builds the image for every architecture, each on a runner of that architecture, without pushing it.

The `# shellcheck shell=bash` line in every script is for ShellCheck: it does not know the `bashio` interpreter, and that line tells it to check the script as Bash.

The other workflows keep the repository tidy: `labels.yaml` syncs the labels of the repository with a shared list, `pr-labels.yaml` checks that every pull request has one of the labels that describe a change, like `bugfix` or `new-feature`, and `release-drafter.yaml` keeps a draft of the next release notes up to date.

> [!NOTE]
> The README of hassio-addons/workflows says that these workflows are subject to change and not versioned, and that using them in other projects is possible but not recommended. For your own repository, copy the lint jobs you want, and build and publish with the [builder actions](/apps/guides/publishing/#build-with-github-actions) of Home Assistant.

## 9. Releases and versions

`.github/workflows/deploy.yaml` runs on every push to `main`, and when a release is published on GitHub. It runs the same checks as CI first, then builds the image for every architecture, pushes it to the GitHub Container Registry, and combines the images into one multi-architecture image, like `ghcr.io/hassio-addons/example`.

Which version and channel that becomes depends on what started it:

| Trigger | Version | Channel |
| --- | --- | --- |
| Push to `main` | The short Git commit, like `6b6b1f1` | edge |
| Pre-release on GitHub | The tag, lowercase and without a leading `v` | beta |
| Release on GitHub | The tag, lowercase and without a leading `v` | stable |

A stable release goes to the beta channel as well. After the build, the workflow tells the matching app repository of Home Assistant Community Apps about the new version. Its tooling then copies the app files, writes `version` and `image` into `config.yaml`, renders the README, and commits that. Users of that channel get the update.

So a release is a GitHub release. Release Drafter keeps the draft of the notes, and publishing it with a tag like `v1.2.0` starts the build. The version follows [Semantic Versioning](https://semver.org/), as the `DOCS.md` of the example explains to users: major for breaking changes, minor for new features, patch for fixes.

That release flow is specific to Home Assistant Community Apps. The rules behind it apply to every app, and are in [Publish your app](/apps/guides/publishing/#versions): publish the image before users can see the new version, and never reuse a version.

## Make it your own

To start your own app from the example:

1. Copy the `example` folder into your repository, and rename it after your app.
2. In `config.yaml`, change `name`, `slug`, `description`, `url`, and the options. Set `version` to a real version.
3. In the `Dockerfile`, pick your base image: keep the community base image, or use a [Home Assistant base image](/apps/guides/dockerfile/#base-images). Put it in `ARG BUILD_FROM`, and remove `build.yaml`.
4. Install your software in the `Dockerfile`, and replace the services in `rootfs/etc/s6-overlay/` with your own. Keep the `finish` scripts.
5. Update `translations/en.yaml`, `DOCS.md`, the icon, and the logo.
6. Add workflows: the lint jobs you want from the example, and the [builder actions](/apps/guides/publishing/) to build and publish your images.
7. Test it: copy the folder into `local_apps` on your Home Assistant, or use the devcontainer from [Test your app](/apps/guides/testing/).

## What is next

- [How apps work](/apps/how-apps-work/): what the Supervisor does with your app, from the repository to a running container. Read it next.
- [Run services with S6 overlay](/apps/guides/s6-overlay/): everything about the services in `rootfs`.
- [Bashio reference](/apps/bashio/): every function, from options to the Supervisor API.
- [Secure your app](/apps/guides/security/): add an AppArmor profile, and ask for as little access as possible.
- [Add a web interface with ingress](/apps/guides/ingress/): show your app inside Home Assistant.

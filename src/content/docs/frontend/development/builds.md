---
title: Builds
description: Make a production build of the frontend, or run the build of a pull request on a real Home Assistant without a development setup.
order: 6
---

Most of the time, the development server is all you need. These are for the other times: when you work on how the frontend is packaged, or when you want to test a pull request on a real Home Assistant.

## Make a production build

```shell
pnpm build
```

This makes a full production build into `hass_frontend/`: both the modern and the legacy build, minified and compressed, with service workers. It takes a while.

When you only need the modern build, for example to compare bundle sizes or measure performance, skip the legacy one:

```shell
pnpm build --modern
```

Production builds accept the same `--background`, `--status`, `--logs`, and `--stop` flags as the [development servers](/frontend/development/run/#keep-a-server-running-in-the-background). A build and a development server can't run at the same time, because they write to the same folder.

### Use your build in Home Assistant

To run Core with your build instead of the frontend it normally installs, install the [frontend repository](https://github.com/home-assistant/frontend) as a Python package into the environment of your development Core, and tell Home Assistant not to replace it:

```shell
pip3 install -e /path/to/frontend --config-settings editable_mode=compat
hass --skip-pip-packages home-assistant-frontend
```

## Try out a pull request

You can run the build of any open frontend pull request on your own Home Assistant, without cloning or building anything. This works on every installation type, including Home Assistant OS. It is useful to check whether a fix works on your hardware, your browser, or your setup.

### Create a GitHub token

Home Assistant downloads the build from GitHub, which needs a token:

1. In GitHub, go to [**Settings** > **Developer settings** > **Personal access tokens** > **Fine-grained tokens**](https://github.com/settings/personal-access-tokens).
2. Select **Generate new token**, and give it a name you recognize, like "Home Assistant frontend testing".
3. Pick a short expiration, like 90 days.
4. Under **Repository access**, select **Public repositories**. Leave the permissions empty.
5. Select **Generate token**, and copy it. You won't see it again.

### Configure Home Assistant

Add the number of the pull request and your token to the `configuration.yaml` of your Home Assistant, and restart it:

```yaml
frontend:
  development_pr: 12345
  github_token: !secret github_token
```

Keep the token itself in `secrets.yaml`, never in a file you share.

On startup, Home Assistant downloads the build of the pull request and uses it instead of the built-in frontend. It keeps a copy, and on later restarts it checks whether the pull request has new commits, and downloads the new build if it does. If the download fails, Home Assistant falls back to the built-in frontend and logs why.

If `development_repo` is also set, that wins, and the pull request is ignored.

To go back, remove both lines and restart. Home Assistant removes the downloaded build.

### Limits

- The pull request needs a successful build in CI.
- GitHub keeps those builds for 7 days. After that, the build has to be made again. The author can do that by updating the branch, for example by merging `dev` into it. If you are not the author, ask them.
- This is for testing. Don't leave it on.

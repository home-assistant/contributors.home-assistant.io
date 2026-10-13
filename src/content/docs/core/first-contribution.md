---
title: Your first contribution to core
description: Set up a development environment, find something small to fix, and open your first pull request to Home Assistant Core.
sidebarLabel: Your first contribution
order: 1
---

Your first pull request to core does not need to be big. A small bug fix, a missing test, or a typo in a log message is a perfect start. What matters is that you get through the whole loop once: environment, change, tests, pull request, and review. After that, everything else is more of the same.

Plan an evening for the setup. Building the development container for the first time takes a while, and you only need to do it once.

## 1. Say hi

Join the **#core** channel on the [Home Assistant Discord](https://www.home-assistant.io/join-chat/). Under **Channels & Roles**, choose **I want to contribute dev skills to Home Assistant** to see it. You do not need permission to start, but it helps to know where to ask when you get stuck.

## 2. Set up your environment

The quickest way is the development container: Visual Studio Code and Docker give you a ready to use environment with the right Python version, all dependencies, and the linters.

1. Install [Docker](https://docs.docker.com/get-docker/), [Visual Studio Code](https://code.visualstudio.com/), and [Git](https://git-scm.com/).
2. [Fork the core repository](https://github.com/home-assistant/core/fork) on GitHub.
3. Clone your fork and open it in Visual Studio Code:

   ```shell
   git clone https://github.com/YOUR_GITHUB_USERNAME/core
   cd core
   git remote add upstream https://github.com/home-assistant/core.git
   code .
   ```

4. When Visual Studio Code asks, select **Reopen in Container**. The first build takes a few minutes.
5. Open the Command Palette, select **Tasks: Run Task**, then **Run Home Assistant Core**. Once the output calms down, open `http://localhost:8123` in your browser. You should see the onboarding screen of your own development instance.

On Windows, do this inside WSL2. The [development environment](/core/development/environment/) guide has the details, and a manual setup if you prefer not to use containers.

## 3. Find something to work on

Good places to look:

- Issues labeled [good first issue](https://github.com/home-assistant/core/labels/good%20first%20issue) in the core repository. There are not always many, so do not worry if the list is short.
- A bug you ran into yourself, in an integration you use. You already know how to reproduce it, and you can test the fix with your own devices.
- An integration you use that has few tests or missing type hints. Tests are a welcome first contribution, and they teach you how the integration works.

Before you start, check that nobody else has opened a pull request for the same issue. If the issue is old, a comment that you are working on it avoids double work.

## 4. Make the change

Create a branch for your change, starting from the latest `dev` branch of Home Assistant. Never work on `dev` directly:

```shell
git fetch upstream
git checkout -b fix-sensor-unit upstream/dev
```

### Find the code

Every integration lives in its own folder, named after its [domain](/glossary/domain/): `homeassistant/components/<domain>/`. Its tests are in `tests/components/<domain>/`. The domain is the last part of the address of the integration's documentation page. The documentation of the Philips Hue integration is at `https://www.home-assistant.io/integrations/hue/`, so its code is in `homeassistant/components/hue/`.

Not sure which file does what? [File structure](/core/integrations/file-structure/) explains them, and [how an integration fits in](/core/integrations/concepts/) explains the ideas behind them.

### Run it

Start your development instance with the **Run Home Assistant Core** task, like in step 2. It uses the configuration in the `config/` folder of your checkout, so it is separate from your own Home Assistant. Add the integration you are working on under **Settings** > **Devices & services**, the way a user would.

Home Assistant loads your code when it starts. After a change, select **Tasks: Restart Running Task** from the Command Palette. To step through the code, press <kbd>F5</kbd> to start Home Assistant in the debugger, and set breakpoints. See [debugging](/core/development/environment/#debugging).

### Turn on debug logging

Most integrations log what they do at the debug level. The setup of your environment added a `logger` section to `config/configuration.yaml`. Add your integration, and the library it uses, under `logs`:

```yaml
logger:
  default: info
  logs:
    homeassistant.components.hue: debug
```

The names of the library loggers are listed under `loggers` in the integration's `manifest.json`. Restart Home Assistant, and the debug messages show up in the terminal of the task. You can also turn on debug logging from the UI: on the page of the integration, open the three dots menu and select **Enable debug logging**.

### Reach your own devices

To reproduce a bug, you often need the real device. The development container runs in Docker, with Docker's default network: it is not on your home network directly.

- Home Assistant in the container can connect to devices on your network by their IP address. When you add the integration, enter the IP address of the device.
- Discovery usually does not work in the container. Zeroconf and SSDP rely on multicast, which Docker's default network does not pass through, so add the device by hand.
- Devices can reach Home Assistant through your computer. The container publishes port 8123, so a device that pushes data to Home Assistant uses the IP address of your computer, like `http://192.168.1.10:8123`. It also publishes port 5683 over UDP, for the Shelly integration.
- USB sticks and Bluetooth adapters can only be passed through to the container on a Linux host. On Windows and macOS, the container cannot access that hardware directly.

On Windows, the container runs inside WSL2. See [networking in WSL](/core/development/environment/#networking-in-wsl) if your devices or your browser cannot reach it.

### Test it

Keep the change small and focused on one thing. Then run the tests for the integration you changed:

```shell
pytest tests/components/YOUR_INTEGRATION
```

If you fixed a bug, add a test that fails without your fix and passes with it. See [writing tests](/core/development/tests/) for how tests in core are written, and [running the tests](/core/development/testing/) for more ways to run them.

## 5. Commit and push

The linters run automatically when you commit. If they change a file, add it and commit again.

```shell
git add .
git commit -m "Fix unit of the energy sensor in Example"
git push -u origin HEAD
```

The `-u` makes the branch on your fork the default for this branch. Without it, your branch keeps following `upstream/dev`, and a later plain `git push` or `git pull` goes to the wrong place.

Write the commit message in the imperative, like "Fix" or "Add", and start with a capital letter.

## 6. Open the pull request

On GitHub, open a pull request from your branch against the `dev` branch of `home-assistant/core`. Fill in the template, without removing anything from it:

- Check exactly one **Type of change**.
- Explain *why* the change is needed, not just what it does.
- Link the issue you fix with `fixes #12345`.

A bot asks you to sign the Contributor License Agreement on your first pull request. Do that right away, nobody reviews a pull request without it. Also, the tests do not run on your first pull request until a maintainer approves them. That is normal, just wait.

## 7. Work through the review

Someone will review your pull request. That can take a while, because the queue is long. Expect questions and requests for changes: that is how every pull request gets better, and it is never personal. When changes are requested, your pull request is moved to draft. Push the fixes, then mark it as **Ready for review** again.

While you wait, review other pull requests. The template asks you to review two, and it is the best way to learn how core works.

## What is next

- Read [after you open a pull request](/core/development/review-process/) to know what to expect.
- Look at the [development checklist](/core/development/checklist/) before your next change.
- Want to build something bigger? Start with [building integrations](/core/integrations/). For a new integration of your own, read [does it belong in core](/core/integrations/create/#does-it-belong-in-core) first: the project recommends the [Marketplace](/marketplace/) as its first home.

---
title: Set up your development environment
description: Get a working Home Assistant Core development setup, with the development container or a manual install on Linux, macOS, or Windows.
sidebarLabel: Development environment
sidebarGroup: Write code
order: 1
source: https://github.com/home-assistant/core/blob/dev/pyproject.toml
lastVerified: 2026-10-12
---

You need a development environment to run Home Assistant from source, run the tests, and run the linters. There are two ways to get one:

- **The development container** (recommended): Visual Studio Code builds a Docker container with the right Python version, every dependency, and the linters already set up. You get the same setup on Linux, macOS, and Windows. The exception is access to hardware like USB sticks, see the note below.
- **A manual setup**: you install Python and the system libraries yourself, and create a virtual environment. Use this if you do not want to use Docker or Visual Studio Code.

## Development container

### What you need

- [Visual Studio Code](https://code.visualstudio.com/)
- [Git](https://git-scm.com/)
- Docker. How you install it depends on your operating system, see below.

> [!NOTE]
> The container makes it harder to use hardware like USB sticks or the Bluetooth adapter of your computer. On a Linux host, you can pass them through to the container. On Windows, Docker runs inside WSL, which has no access to USB devices on its own: you first attach a device to WSL with [usbipd-win](https://learn.microsoft.com/windows/wsl/connect-usb). On macOS, the container cannot access that hardware directly. Docker Desktop can share USB devices over the network with [USB/IP](https://docs.docker.com/desktop/features/usbip/), but that takes extra setup.

### Install Docker on Linux

Install the [Docker Engine](https://docs.docker.com/engine/install/) with the instructions for your distribution. Then follow the [post-installation steps](https://docs.docker.com/engine/install/linux-postinstall/#manage-docker-as-a-non-root-user), so you can use Docker without root.

### Install Docker on macOS

Install [Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/).

### Install Docker on Windows

On Windows, everything runs inside WSL2, the Windows Subsystem for Linux.

1. Install WSL2 with the default Ubuntu distribution. In a Windows terminal, run:

   ```shell
   wsl --install
   ```

2. Check that your distribution runs on WSL version 2:

   ```shell
   wsl -l -v
   ```

   If it shows version 1, convert it with `wsl --set-version <distro name> 2`.

3. Docker Engine runs as a systemd service, so enable systemd. Start the WSL shell with `wsl`, and add this to `/etc/wsl.conf` (with `sudo`):

   ```ini
   [boot]
   systemd=true
   ```

4. Restart WSL from the Windows terminal with `wsl --shutdown`, and start it again.
5. Inside WSL, follow the Linux instructions above to install Docker Engine.

From here on, do everything inside WSL, including cloning the repository. Code on the Windows side of the file system runs into permission problems.

### Open the repository in the container

1. [Fork the core repository](https://github.com/home-assistant/core/fork) on GitHub.
2. Clone your fork, add the Home Assistant repository as `upstream`, and open it in Visual Studio Code:

   ```shell
   git clone https://github.com/YOUR_GITHUB_USERNAME/core
   cd core
   git remote add upstream https://github.com/home-assistant/core.git
   code .
   ```

3. Visual Studio Code detects the container configuration and asks if you want to **Reopen in Container**. Select it. If it asks to install the Dev Containers extension, install it.
4. Wait for the container to build. The first time takes several minutes. When it is done, it runs `script/setup`, which installs all requirements and the Git hooks for the linters.

To check that everything works, open the Command Palette (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>, or <kbd>Shift</kbd>+<kbd>Command</kbd>+<kbd>P</kbd> on macOS), select **Tasks: Run Task**, then **Run Home Assistant Core**. When the output in the terminal slows down, open `http://localhost:8123`. You should see the onboarding screen.

To come back to the container later, open Visual Studio Code, select **Remote Explorer** in the sidebar, and pick the container.

### Tasks

The container comes with tasks for the things you do most. Open the Command Palette, select **Tasks: Run Task**, and pick one:

| Task | What it does |
| --- | --- |
| **Run Home Assistant Core** | Starts Home Assistant with the configuration in `config/`. |
| **Pytest** | Runs the full test suite. |
| **Pytest (changed tests only)** | Runs only the test files you changed. |
| **Code Coverage** | Runs the tests of one integration, with a coverage report. |
| **Update syrupy snapshots** | Updates the snapshots of one integration. |
| **Prek** | Runs the linters on your changes. |
| **Generate Requirements** | Updates `requirements_all.txt` after you changed a dependency. |
| **Install all (test & production) Requirements** | Installs every requirement again. |
| **Compile English translations** | Turns `strings.json` files into the English translations. |
| **Create new integration** | Starts the scaffold that generates a new integration. |

To restart a task that is still running, select **Tasks: Restart Running Task**.

### Debugging

The container comes with debug configurations. Press <kbd>F5</kbd> to start Home Assistant in the debugger, and it stops on any breakpoint you set. The **Run and Debug** view also has configurations to debug the current test file, or to attach to a running instance.

To debug an instance that runs elsewhere, like your production system, use the [debugpy integration](https://www.home-assistant.io/integrations/debugpy/).

Starting with Home Assistant 2026.11, you can also look around inside a running Home Assistant without a debugger, with the debug console under **Settings** > **Tools** > **Debug console**. It runs Python code with `hass` available, shows results as objects you can expand, and completes code while you type. For example, to look at the state of the sun:

```python
hass.states.get("sun.sun")
```

The debug console is enabled with `debug_console:` in `configuration.yaml`, which `script/setup` adds to the configuration of this container. Elsewhere, add it yourself and restart Home Assistant; see the [Debug console integration](https://www.home-assistant.io/integrations/debug_console/). Code runs in the event loop of Home Assistant, so `await` asynchronous calls, and run blocking work with `await hass.async_add_executor_job(...)`.

### When the container does not build

A container that fails to build is often based on an outdated fork.

1. Make sure your fork is up to date with the `dev` branch of Home Assistant.
2. Clean the Docker build cache with `docker buildx prune`.
3. If that does not help, select **Open configuration in recovery devcontainer**, run `git pull upstream dev` in its terminal, then select **Dev Containers: Rebuild Container** from the Command Palette.

## Manual setup

Core needs a recent Python: `requires-python` in its [`pyproject.toml`](https://github.com/home-assistant/core/blob/dev/pyproject.toml) asks for 3.14.2 or newer. The Python that comes with your operating system is often older. If you create the virtual environment with an older Python, it does not work: install the right version, delete the `.venv` folder, and run the setup again.

### Install the system dependencies

Home Assistant and its requirements need a few system libraries and build tools.

On Ubuntu or Debian:

```shell
sudo apt-get update
sudo apt-get install autoconf libssl-dev libxml2-dev libxslt1-dev libjpeg-dev \
  libffi-dev libudev-dev zlib1g-dev pkg-config libavformat-dev \
  libavcodec-dev libavdevice-dev libavutil-dev libswscale-dev \
  libswresample-dev libavfilter-dev ffmpeg libgammu-dev \
  build-essential
```

On Fedora:

```shell
sudo dnf update
sudo dnf install autoconf openssl-devel libxml2-devel libxslt-devel \
  libjpeg-turbo-devel libffi-devel systemd-devel zlib-devel \
  pkgconf-pkg-config libavformat-free-devel libavcodec-free-devel \
  libavdevice-free-devel libavutil-free-devel libswscale-free-devel \
  ffmpeg-free-devel libavfilter-free-devel ffmpeg-free gcc gcc-c++ \
  cmake
```

On Arch or Manjaro:

```shell
sudo pacman -Sy base-devel autoconf libxml2 libxslt libjpeg-turbo \
  libffi systemd zlib pkgconf ffmpeg gcc cmake
```

On macOS, install [Homebrew](https://brew.sh/) and use it to install the dependencies:

```shell
brew install autoconf ffmpeg cmake make
```

Some dependencies, like `cryptography` and `orjson`, contain Rust code. If there is no prebuilt package for your platform, they are built from source, and that needs a Rust toolchain. If the setup fails because `rustc` or `cargo` is missing, run `brew install rust`.

On NixOS, put this `default.nix` in the repository and activate it, for example with [direnv](https://direnv.net/):

```nix
let
  pkgs = import <nixpkgs> { };
in
pkgs.mkShell {
  packages = with pkgs; [
    autoconf
    clang
    cmake
    ffmpeg
    ffmpeg.dev
    gammu
    libffi.dev
    libjpeg.dev
    libxml2.dev
    libxslt.dev
    openssl_3.dev
    pkg-config
    python314
    zlib.dev
  ];
  env = {
    LD_LIBRARY_PATH = "${pkgs.libjpeg.out}/lib";
  };
}
```

On Windows, install [WSL](https://learn.microsoft.com/windows/wsl/install) with Ubuntu, and follow the Ubuntu instructions inside WSL. Keep all your code inside WSL.

### Install Python with uv

The easiest way to get the right Python is [uv](https://docs.astral.sh/uv/), the package manager core uses. Install it with the [official installer](https://docs.astral.sh/uv/getting-started/installation/):

```shell
curl -LsSf https://astral.sh/uv/install.sh | sh
```

You do not have to install Python yourself after that. The core repository has a `.python-version` file with the exact version the development container uses, and uv reads it: when the setup script creates the virtual environment, uv downloads that version if you do not have it yet. To install it up front, run `uv python install` in the repository folder, after you cloned it.

If uv reports that it found no download for the required Python version, your uv is too old. Run the installer again to update it.

On NixOS, `python314` in `default.nix` provides Python, and you do not need uv for it.

### Set up the repository

Fork the [core repository](https://github.com/home-assistant/core/fork), clone your fork, and add the Home Assistant repository as `upstream`:

```shell
git clone https://github.com/YOUR_GITHUB_USERNAME/core
cd core
git remote add upstream https://github.com/home-assistant/core.git
```

Then run the setup script:

```shell
script/setup
```

If no virtual environment is active, it creates one in `.venv`, with uv if you have it, and with `python3 -m venv` otherwise. If a virtual environment is active, it uses that one instead. Then it installs all requirements, installs the Git hooks for the linters, and creates a configuration in the `config` folder.

### Run Home Assistant

Activate the virtual environment in every new terminal:

```shell
source .venv/bin/activate
```

Then start Home Assistant with the configuration from the `config` folder:

```shell
hass -c config
```

Open `http://localhost:8123` to see it.

If `hass` crashes with `SIGKILL` on macOS, your terminal app probably lacks Bluetooth permission. Add it under **System Settings** > **Privacy & Security** > **Bluetooth**.

### Networking in WSL

If `http://localhost:8123` does not open from Windows, find the address of WSL with `ip addr show eth0`, and use the `inet` address without the part after the slash. For example, `172.20.37.6/20` becomes `http://172.20.37.6:8123`.

By default WSL uses NAT networking, which keeps Home Assistant from discovering devices on your network. [Mirrored mode networking](https://learn.microsoft.com/en-us/windows/wsl/networking#mirrored-mode-networking) gives WSL the same network interfaces as Windows, including multicast, so discovery with mDNS works.

## AI tools in the repository

If you use an AI coding tool, it doesn't have to guess how core works. The repository has an `AGENTS.md` file with instructions for agents, and skills in `.claude/skills/`, like `ha-integration-knowledge` for building integrations and `ha-quality-scale-verify` for checking quality scale rules. They are a useful read for humans too.

You stay responsible for the result: see the [AI policy](/start/ai-policy/). [Contribute with AI tools](/start/ai-tools/) lists every skill, and walks through fixing a bug and building an integration up to Bronze with them.

## What is next

- [Running the tests](/core/development/testing/): run the tests before you open a pull request.
- [Linters, hassfest, and CI](/core/development/checks/): what runs when you commit.

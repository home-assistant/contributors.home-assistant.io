---
title: Test a custom integration
description: Use the pytest-homeassistant package to test your custom integration with the same fixtures and helpers as core.
sidebarLabel: Testing integrations
order: 1.5
---

Integrations in core are tested with a set of pytest fixtures and helpers: a `hass` fixture that starts Home Assistant, `MockConfigEntry`, fixture file loaders, snapshot helpers, and more. Core publishes these as a separate package, `pytest-homeassistant`, so you can test your [custom integration](/glossary/custom-integration/) the same way, in its own repository.

How to write good tests, with fixtures, mocks, and snapshots, is the same as in core. See [writing tests](/core/development/tests/). This page covers what you need to set it up outside core.

## Install the package

Add `pytest-homeassistant` to the test dependencies of your repository. In a virtual environment:

```shell
uv pip install pytest-homeassistant
```

The package has the same version number as Home Assistant, and every release of it depends on exactly that release of Home Assistant. So pick the version of `pytest-homeassistant` that matches the Home Assistant version you want to test against, and upgrade them together:

```text title="requirements_test.txt"
pytest-homeassistant==2026.11.1
```

The pytest plugin loads by itself once the package is installed. You do not need to add anything to a `conftest.py` for it.

Some helpers need extra packages. Install the `bluetooth`, `infrared`, or `radio-frequency` extra when you use those helpers, like `pytest-homeassistant[bluetooth]`. The libraries your own integration uses are not included: install them yourself.

> [!WARNING]
> Do not install `pytest-homeassistant` together with `pytest-homeassistant-custom-component`. Both provide the same fixtures. If you used that package before, see [migrate from pytest-homeassistant-custom-component](#migrate-from-pytest-homeassistant-custom-component).

## Configure pytest

Add this pytest configuration to the `pyproject.toml` of your repository:

```toml title="pyproject.toml"
[tool.pytest.ini_options]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "function"
# Let Home Assistant install its httpx alias before respx is imported.
addopts = "-p no:respx"
pythonpath = ["."]
testpaths = ["tests"]
```

- `asyncio_mode` and `asyncio_default_fixture_loop_scope` let your tests be `async` functions without a marker.
- `-p no:respx` only turns off the pytest plugin of respx. The HTTP mocks of the package still use respx.
- `pythonpath = ["."]` makes the `custom_components` folder in the root of your repository importable.

With that, a repository looks like this:

```text
custom_components/my_integration/__init__.py
custom_components/my_integration/manifest.json
tests/__init__.py
tests/conftest.py
tests/test_init.py
tests/fixtures/status.json
pyproject.toml
```

## Write a test

Tests ask for fixtures like `hass` by name, and import helpers from `pytest_homeassistant`. The `hass` fixture loads custom integrations by default, so Home Assistant finds yours in `custom_components/`.

This test sets up a config entry, checks that it loaded, and unloads it again:

```python title="tests/test_init.py"
"""Test the setup of My integration."""

from pytest_homeassistant.common import MockConfigEntry

from custom_components.my_integration.const import DOMAIN
from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import CONF_HOST
from homeassistant.core import HomeAssistant


async def test_load_unload(hass: HomeAssistant) -> None:
    """Test loading and unloading a config entry."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={CONF_HOST: "192.168.1.2"},
    )
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    assert entry.state is ConfigEntryState.LOADED

    assert await hass.config_entries.async_unload(entry.entry_id)
    assert entry.state is ConfigEntryState.NOT_LOADED
```

In a real test, you also mock the library your integration uses, so the test does not talk to a device. See [fixtures and mocking](/core/development/tests/#fixtures-and-mocking).

Run your tests with `pytest`.

## Fixture files and snapshots

Load sample data with the helpers in `pytest_homeassistant.common`, like `load_fixture`, `load_json_object_fixture`, and their `async_` versions. They read from `tests/fixtures/` by default:

```python
data = await async_load_json_object_fixture(hass, "status.json", DOMAIN)
```

When you pass the domain, like above, the helpers look in `tests/components/<domain>/fixtures/` if that folder exists, and in `tests/fixtures/` if not. So both the layout of core and a flat `tests/` folder work.

Two settings change where the package looks. Set them in the same `[tool.pytest.ini_options]` section, relative to the root of your project:

- `ha_test_root`: the folder with your tests, `tests` by default.
- `ha_test_config_dir`: the configuration folder the `hass` fixture uses.

A test that needs its own writable configuration folder overrides the `hass_config_dir` fixture, and returns `hass_tmp_config_dir`. That copies the shared configuration if there is one, or gives an empty temporary folder:

```python title="tests/conftest.py"
import pytest


@pytest.fixture
def hass_config_dir(hass_tmp_config_dir: str) -> str:
    """Use a temporary configuration folder."""
    return hass_tmp_config_dir
```

Snapshots work as in core: they are stored in a `snapshots/` folder next to the test that makes them. Run `pytest --snapshot-update` to create or update them.

## What the package contains

The modules you are most likely to use:

- `pytest_homeassistant.common`: helpers like `MockConfigEntry`, fixture file loaders, `async_fire_time_changed`, `async_mock_service`, and `snapshot_platform`.
- `pytest_homeassistant.components.common`: shared checks for entities, platforms, and integration behavior.
- `pytest_homeassistant.components.diagnostics`: request the [diagnostics](/core/integrations/diagnostics/) of your integration or a device.
- `pytest_homeassistant.components.repairs`: list repair issues, and start and finish repair flows.
- `pytest_homeassistant.test_util.aiohttp`: mock HTTP responses and client sessions.
- `pytest_homeassistant.typing`: types for the fixtures, like `ClientSessionGenerator` and `WebSocketGenerator`.

There are also modules for Bluetooth, MQTT, the recorder, infrared, and radio frequency. The fixtures themselves, like `hass`, `entity_registry`, `device_registry`, and `hass_ws_client`, come from the plugin, so you never import them. The [README of the package](https://github.com/home-assistant/core/tree/dev/packages/pytest-homeassistant) lists every module.

## Migrate from pytest-homeassistant-custom-component

Before core published its own package, many custom integrations used the community package `pytest-homeassistant-custom-component`. To move over:

1. Replace `pytest-homeassistant-custom-component` with `pytest-homeassistant` in your test dependencies.
2. Change imports from `pytest_homeassistant_custom_component` to `pytest_homeassistant`.
3. Remove the autouse fixture that requests `enable_custom_integrations`, if you have one. The `hass` fixture loads custom integrations by default now.

The fixtures you already use, like `hass`, `enable_custom_integrations`, the registry, HTTP, recorder, and snapshot fixtures, keep their names.

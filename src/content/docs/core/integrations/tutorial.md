---
title: Build your first integration
description: Build a small, complete integration step by step, from the scaffold to a config flow, a coordinator, sensors, tests, and a pull request that meets the Bronze tier.
sidebarLabel: Tutorial
sidebarGroup: Getting started
order: 2
---

In this tutorial, you build a complete integration for an air quality monitor on your local network. It is set up from the UI, polls the monitor every minute, and shows its temperature, humidity, and fine dust as sensors. On the way, you touch every part that a new integration in core needs: a library, a config flow, a coordinator, entities, tests, documentation, a brand, and a pull request.

By the end, your integration meets every rule of the Bronze tier of the [quality scale](/core/quality-scale/), the minimum for a new integration in core. Each step says which rules it takes care of, and the last steps check them all off.

The monitor and its library, `exampleair`, are made up for this tutorial. Follow along with your own device and its library: the shape of the code is the same, only the names and the data change. The code is modeled on `theben_conexa`, a small Bronze integration for a local device that was recently added to core, with a sensor platform, a coordinator, and the same set of tests. Where it helps, open its code next to this page.

New to the words config entry, platform, or coordinator? Read [how an integration fits in](/core/integrations/concepts/) first. It takes five minutes.

## Before you start

- **A development environment.** Set one up with [your first contribution](/core/first-contribution/#2-set-up-your-environment) or the [development environment](/core/development/environment/) guide. Run every command on this page from the root of your core checkout, inside that environment.
- **A device or service that fits in core.** It must be available for people to buy and use today, and have an actual user base. See [create an integration](/core/integrations/create/#does-it-belong-in-core). For a new integration, the project recommends that you publish it in the [Marketplace](/marketplace/) first. A custom integration is built the same way, so everything you learn here carries over.
- **Some Python.** You should be comfortable with classes, `async` and `await`, and type hints. You do not need to know Home Assistant's code yet.
- **Time.** Plan a few evenings. The review afterwards takes longer than writing the code, often weeks. That is normal.

Then create a branch for your integration, starting from the latest `dev` branch of Home Assistant. Do this first: core's pre-commit hooks include `no-commit-to-branch`, which refuses every commit on `dev`, `rc`, and `master`.

```shell
git fetch upstream
git checkout -b add-example-air upstream/dev
```

`upstream` is the remote of `home-assistant/core` that you added in [your first contribution](/core/first-contribution/#2-set-up-your-environment).

## 1. Start with the library

Your integration never talks to the device itself. A Python library on PyPI does that, and your integration only translates between the library and Home Assistant. If your device has no library yet, write one first: [build a Python library](/core/integrations/api-library/) explains how, and what it must meet before core accepts it.

This tutorial uses a small async library with this interface:

```python
from dataclasses import dataclass

from aiohttp import ClientSession


@dataclass
class Status:
    """The status of an Example Air monitor."""

    serial_number: str
    name: str
    firmware: str
    temperature: float
    humidity: float
    pm25: int


class ExampleAirError(Exception):
    """Base error of the library."""


class ExampleAirConnectionError(ExampleAirError):
    """The monitor could not be reached."""


class ExampleAirClient:
    """Talk to an Example Air monitor."""

    def __init__(self, host: str, session: ClientSession) -> None:
        """Initialize the client."""

    async def get_status(self) -> Status:
        """Return the current status of the monitor."""
```

Three things about it matter to Home Assistant:

- It is async, so it never blocks the [event loop](/glossary/event-loop/).
- It accepts an `aiohttp` session from the caller, so it can use the shared session of Home Assistant.
- It raises its own exceptions, so the integration can tell an unreachable device from other problems.

Core also asks something of how the library is published. That is the [dependency-transparency](/core/quality-scale/dependency-transparency/) rule:

- The source is in a public repository, under an OSI-approved license like MIT or Apache 2.0.
- Every release is on PyPI, built and published by a public CI pipeline, not uploaded by hand.
- Every version on PyPI matches a tagged release in that repository.

Set this up before you start on the integration. You link the release workflow and the tag in your pull request, and reviewers check them.

While you develop, install your library in editable mode, so you can change the library and the integration at once. Where the library lives depends on your setup.

With a manual setup, everything runs directly on your computer. Keep the library in a folder next to your core checkout, activate the virtual environment, and install it from the core checkout:

```shell
uv pip install -e ../exampleair
```

The development container only has your core checkout mounted, so `../exampleair` does not exist inside it. Clone the library inside the container instead, for example in your home folder, and install it from there:

```shell
git clone https://github.com/YOUR_GITHUB_USERNAME/exampleair ~/exampleair
uv pip install -e ~/exampleair
```

Push your library changes often: when the container is rebuilt, everything outside your core checkout is gone. Once your library is released on PyPI, you can also skip the editable install, and install the released version with `uv pip install exampleair==0.1.0`.

## 2. Generate the integration

Run the scaffold script:

```shell
python3 -m script.scaffold integration
```

It asks a few questions. For this tutorial, the answers are:

| Question | Answer |
| --- | --- |
| What is the domain? | `example_air` |
| What is the name of your integration? | `Example Air` |
| What is your GitHub handle? | Your GitHub username |
| What PyPI package and version do you depend on? | `exampleair==0.1.0` |
| How will your integration gather data? | `local_polling` |
| Does Home Assistant need the user to authenticate? | `no` |
| Is the device/service discoverable on the local network? | `no` |
| What is the integration type? | `device` |
| Can the user authenticate the device using OAuth2? | `no` |

The domain is permanent: it becomes the folder name, and it can never change. See [the manifest](/core/integrations/manifest/#domain).

Because the monitor is not discoverable, the script generates a config flow with a form. It then runs hassfest to validate the result, updates the requirement files, and generates the English translations. You now have:

```text
homeassistant/components/example_air/
├── __init__.py
├── config_flow.py
├── const.py
├── manifest.json
├── quality_scale.yaml
└── strings.json
tests/components/example_air/
├── __init__.py
├── conftest.py
└── test_config_flow.py
```

The generated code works, but it is a template: it has `TODO` comments and a `PlaceholderHub` class where your library goes. The next steps replace all of that.

## 3. Check the manifest

Open `manifest.json`. The scaffold filled it from your answers, and added a few empty keys, for dependencies and discovery. Remove the empty keys: nearly every integration in core leaves them out. What is left:

```json
{
  "domain": "example_air",
  "name": "Example Air",
  "codeowners": ["@your-github-username"],
  "config_flow": true,
  "documentation": "https://www.home-assistant.io/integrations/example_air",
  "integration_type": "device",
  "iot_class": "local_polling",
  "quality_scale": "bronze",
  "requirements": ["exampleair==0.1.0"]
}
```

- `quality_scale` is `bronze` from the start: new integrations must reach at least Bronze. Until every Bronze rule in `quality_scale.yaml` is `done` or `exempt`, hassfest reports an error for it. You get there in step 11.
- `requirements` pins your library to an exact version with `==`. Hassfest requires that, and it is the other half of [dependency-transparency](/core/quality-scale/dependency-transparency/).

[The manifest](/core/integrations/manifest/) explains every key.

## 4. Build the config flow

The [config flow](/core/integrations/config-flow/) is the dialog users see when they add the integration. It asks for the host, connects to the monitor to check that it works, and makes sure the same monitor is not added twice.

Replace `config_flow.py` with:

```python
"""Config flow for the Example Air integration."""

import logging
from typing import Any, override

from exampleair import ExampleAirClient, ExampleAirConnectionError
import probatio

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.const import CONF_HOST
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

STEP_USER_DATA_SCHEMA = probatio.Schema(
    {probatio.Required(CONF_HOST): str}
)


class ExampleAirConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Example Air."""

    VERSION = 1

    @override
    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Handle a flow started by the user."""
        errors: dict[str, str] = {}

        if user_input is not None:
            client = ExampleAirClient(
                user_input[CONF_HOST],
                session=async_get_clientsession(self.hass),
            )

            try:
                status = await client.get_status()
            except ExampleAirConnectionError:
                errors["base"] = "cannot_connect"
            except Exception:
                _LOGGER.exception("Unexpected exception")
                errors["base"] = "unknown"
            else:
                await self.async_set_unique_id_or_abort(status.serial_number)

                return self.async_create_entry(
                    title=status.name, data=user_input
                )

        return self.async_show_form(
            step_id="user",
            data_schema=STEP_USER_DATA_SCHEMA,
            errors=errors,
        )
```

What happens here:

- The first time, `user_input` is `None`, and the step shows the form.
- When the user submits, the flow connects to the monitor. If that fails, it shows the form again with an error. That is the [test-before-configure](/core/quality-scale/test-before-configure/) rule.
- The serial number becomes the unique ID of the config entry. `async_set_unique_id_or_abort` stops the flow when that monitor is already set up. That is the [unique-config-entry](/core/quality-scale/unique-config-entry/) rule. Never use the IP address as unique ID: it changes.
- `async_get_clientsession` gives you the shared web session of Home Assistant.
- `@override` tells the type checker that this method replaces one of the parent class. Core's mypy configuration asks for it.

Schemas in core are written with Probatio, the validation library Home Assistant uses. Import it as `probatio`, without an alias.

All text the user sees lives in `strings.json`, never in the code. Replace it with:

```json
{
  "config": {
    "step": {
      "user": {
        "data": {
          "host": "[%key:common::config_flow::data::host%]"
        },
        "data_description": {
          "host": "The hostname or IP address of your Example Air monitor."
        }
      }
    },
    "error": {
      "cannot_connect": "[%key:common::config_flow::error::cannot_connect%]",
      "unknown": "[%key:common::config_flow::error::unknown%]"
    },
    "abort": {
      "already_configured": "[%key:common::config_flow::abort::already_configured_device%]"
    }
  },
  "exceptions": {
    "update_failed": {
      "message": "An error occurred while fetching data from the monitor."
    }
  }
}
```

The `[%key:...%]` references reuse strings that are already translated into every language. The `data_description` explains each field, which the [config-flow](/core/quality-scale/config-flow/) rule asks for. The `exceptions` section is for the coordinator in the next step. After every change to `strings.json`, regenerate the English translations, which Home Assistant and the tests read:

```shell
python3 -m script.translations develop --integration example_air
```

See [translations](/core/integrations/translations/) for every section of the file, and [make your strings translatable](/translate/guides/developers/) for how to write them.

## 5. Fetch the data with a coordinator

The monitor returns all its values in one request. A [coordinator](/core/integrations/fetching-data/) makes that one request every minute, and hands the result to all entities. It also marks them unavailable when the monitor stops answering, and logs that only once.

Create `coordinator.py`:

```python
"""Coordinator for the Example Air integration."""

from datetime import timedelta
import logging
from typing import override

from exampleair import ExampleAirClient, ExampleAirError, Status

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import (
    DataUpdateCoordinator,
    UpdateFailed,
)

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

type ExampleAirConfigEntry = ConfigEntry[ExampleAirCoordinator]


class ExampleAirCoordinator(DataUpdateCoordinator[Status]):
    """Fetch the status of an Example Air monitor."""

    config_entry: ExampleAirConfigEntry

    def __init__(
        self,
        hass: HomeAssistant,
        config_entry: ExampleAirConfigEntry,
        client: ExampleAirClient,
    ) -> None:
        """Initialize the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            config_entry=config_entry,
            name=DOMAIN,
            update_interval=timedelta(minutes=1),
        )
        self.client = client

    @override
    async def _async_update_data(self) -> Status:
        """Fetch the latest status from the monitor."""
        try:
            return await self.client.get_status()
        except ExampleAirError as err:
            raise UpdateFailed(
                translation_domain=DOMAIN,
                translation_key="update_failed",
            ) from err
```

- `ExampleAirConfigEntry` is a typed config entry. Its `runtime_data` is the coordinator, so your platforms get a typed coordinator for free.
- `update_interval` is fixed by the integration. Users cannot change it, and the config flow must not ask for it. Pick an interval that fits the data: see [appropriate-polling](/core/quality-scale/appropriate-polling/).
- `UpdateFailed` tells the coordinator the update failed. Its message is translated, from the `exceptions` section of `strings.json`.
- The coordinator lives in `coordinator.py`, and the base entity in `entity.py`. That is the [common-modules](/core/quality-scale/common-modules/) rule.

## 6. Set up the config entry

`__init__.py` connects it all. Home Assistant calls `async_setup_entry` for every config entry: at startup, and when a user adds a monitor. Replace the file with:

```python
"""The Example Air integration."""

from exampleair import ExampleAirClient

from homeassistant.const import CONF_HOST, Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .coordinator import ExampleAirConfigEntry, ExampleAirCoordinator

_PLATFORMS: list[Platform] = [Platform.SENSOR]


async def async_setup_entry(
    hass: HomeAssistant, entry: ExampleAirConfigEntry
) -> None:
    """Set up Example Air from a config entry."""
    client = ExampleAirClient(
        entry.data[CONF_HOST], session=async_get_clientsession(hass)
    )

    coordinator = ExampleAirCoordinator(hass, entry, client)
    await coordinator.async_config_entry_first_refresh()

    entry.runtime_data = coordinator

    await hass.config_entries.async_forward_entry_setups(entry, _PLATFORMS)


async def async_unload_entry(
    hass: HomeAssistant, entry: ExampleAirConfigEntry
) -> None:
    """Unload a config entry."""
    await hass.config_entries.async_unload_platforms_or_raise(
        entry, _PLATFORMS
    )
```

- `async_config_entry_first_refresh` fetches the first data before any entity exists. When the monitor is offline, it raises `ConfigEntryNotReady`, and Home Assistant retries the setup later. That is the [test-before-setup](/core/quality-scale/test-before-setup/) rule.
- The coordinator goes in `entry.runtime_data`, not in `hass.data`. That is the [runtime-data](/core/quality-scale/runtime-data/) rule.
- `_PLATFORMS` has one platform. A new integration starts with one: more platforms come in follow up pull requests.
- `async_unload_entry` lets users remove or reload the integration without a restart.
- There is no `async_setup`, because this integration adds no [actions](/glossary/action/) of its own. If yours does, register them in `async_setup`, not here. That is the [action-setup](/core/quality-scale/action-setup/) rule, and for this integration it is exempt.

## 7. Add the entities

First, a base entity in `entity.py`. Every entity of the monitor shares the same device and the same coordinator:

```python
"""Base entity for the Example Air integration."""

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import ExampleAirCoordinator


class ExampleAirEntity(CoordinatorEntity[ExampleAirCoordinator]):
    """Base class for Example Air entities."""

    _attr_has_entity_name = True

    def __init__(self, coordinator: ExampleAirCoordinator) -> None:
        """Initialize the entity."""
        super().__init__(coordinator)
        status = coordinator.data

        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, status.serial_number)},
            manufacturer="Example",
            model="Example Air",
            name=status.name,
            serial_number=status.serial_number,
            sw_version=status.firmware,
        )
```

- `CoordinatorEntity` subscribes the entity to the coordinator, and makes it unavailable when an update fails.
- `_attr_has_entity_name = True` names each entity in the context of its device, like "Living room Temperature". That is the [has-entity-name](/core/quality-scale/has-entity-name/) rule.
- `DeviceInfo` puts the monitor in the [device registry](/core/integrations/device-registry/), so users see one device with all its sensors.
- The entities do not subscribe to anything themselves. `CoordinatorEntity` subscribes to the coordinator in `async_added_to_hass`, and unsubscribes when the entity is removed. If you ever add a subscription of your own, like updates pushed by the library, follow the [entity-event-setup](/core/quality-scale/entity-event-setup/) rule. For this integration, that rule is exempt.

Then the sensor platform, in `sensor.py`:

```python
"""Sensor platform for the Example Air integration."""

from collections.abc import Callable
from dataclasses import dataclass
from typing import override

from exampleair import Status

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorEntityDescription,
    SensorStateClass,
)
from homeassistant.const import (
    UnitOfDensity,
    UnitOfRatio,
    UnitOfTemperature,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import (
    AddConfigEntryEntitiesCallback,
)

from .coordinator import ExampleAirConfigEntry, ExampleAirCoordinator
from .entity import ExampleAirEntity


@dataclass(frozen=True, kw_only=True)
class ExampleAirSensorEntityDescription(SensorEntityDescription):
    """Describe an Example Air sensor."""

    value_fn: Callable[[Status], float | int]


SENSORS: tuple[ExampleAirSensorEntityDescription, ...] = (
    ExampleAirSensorEntityDescription(
        key="temperature",
        device_class=SensorDeviceClass.TEMPERATURE,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        state_class=SensorStateClass.MEASUREMENT,
        value_fn=lambda status: status.temperature,
    ),
    ExampleAirSensorEntityDescription(
        key="humidity",
        device_class=SensorDeviceClass.HUMIDITY,
        native_unit_of_measurement=UnitOfRatio.PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        value_fn=lambda status: status.humidity,
    ),
    ExampleAirSensorEntityDescription(
        key="pm25",
        device_class=SensorDeviceClass.PM25,
        native_unit_of_measurement=UnitOfDensity.MICROGRAMS_PER_CUBIC_METER,
        state_class=SensorStateClass.MEASUREMENT,
        value_fn=lambda status: status.pm25,
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ExampleAirConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the Example Air sensors."""
    coordinator = entry.runtime_data

    async_add_entities(
        ExampleAirSensor(coordinator, description)
        for description in SENSORS
    )


class ExampleAirSensor(ExampleAirEntity, SensorEntity):
    """A sensor of an Example Air monitor."""

    entity_description: ExampleAirSensorEntityDescription

    def __init__(
        self,
        coordinator: ExampleAirCoordinator,
        description: ExampleAirSensorEntityDescription,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self.entity_description = description
        self._attr_unique_id = (
            f"{coordinator.data.serial_number}_{description.key}"
        )

    @property
    @override
    def native_value(self) -> float | int:
        """Return the value of the sensor."""
        return self.entity_description.value_fn(self.coordinator.data)
```

- An [entity description](/glossary/entity-description/) describes each sensor as data: its device class, unit, and how to get its value. Adding a sensor later is one more entry in `SENSORS`.
- The device class gives each sensor its name, its icon, and the right unit conversions. Because these sensors have a device class, they need no name of their own.
- The unique ID combines the serial number with the key. It never changes, and it is what lets users rename the entity. That is the [entity-unique-id](/core/quality-scale/entity-unique-id/) rule.

[Entities and platforms](/core/entities/) has a page for every entity type, like the [sensor entity](/core/entities/sensor/).

## 8. Try it

Before Home Assistant can show your integration in the list, regenerate the files that list all integrations:

```shell
python3 -m script.hassfest --skip-plugins quality_scale
```

Without `--integration-path`, hassfest validates every integration and updates generated files, like `CODEOWNERS` and `homeassistant/generated/config_flows.py`. Those changes belong in your pull request. It only writes them when it finds no errors, and your `quality_scale.yaml` is still all `todo`. That is why this run skips the quality scale check, the same way the scaffold script does. From step 11 on, you run it without `--skip-plugins`.

Now start your development instance. In the development container, open the Command Palette, select **Tasks: Run Task**, then **Run Home Assistant Core**. Go to `http://localhost:8123`, and under **Settings** > **Devices & services**, select **Add integration** and search for **Example Air**. Enter the address of your monitor, and you should see a new device with three sensors.

Things not working? Turn on debug logging for your integration and your library in `config/configuration.yaml`, and restart:

```yaml
logger:
  default: info
  logs:
    homeassistant.components.example_air: debug
    exampleair: debug
```

Integration not in the list? Check the log for errors first, then do a hard refresh of your browser: the frontend caches aggressively. [Your first contribution](/core/first-contribution/#4-make-the-change) has more on running and debugging your code, including how to reach devices on your network from the development container.

## 9. Write the tests

Every new integration in core comes with tests, and the config flow needs full coverage. Tests run without the real device: you mock the library, and let Home Assistant run for real. [Writing tests](/core/development/tests/) explains the ideas behind this.

Start with the shared fixtures, in `tests/components/example_air/conftest.py`:

```python
"""Common fixtures for the Example Air tests."""

from collections.abc import Generator
from unittest.mock import AsyncMock, MagicMock, patch

from exampleair import Status
import pytest

from homeassistant.components.example_air.const import DOMAIN
from homeassistant.const import CONF_HOST

from tests.common import MockConfigEntry


@pytest.fixture
def mock_setup_entry() -> Generator[AsyncMock]:
    """Override async_setup_entry."""
    with patch(
        "homeassistant.components.example_air.async_setup_entry",
        return_value=None,
    ) as mock_setup_entry:
        yield mock_setup_entry


@pytest.fixture
def mock_example_air_client() -> Generator[MagicMock]:
    """Mock the Example Air client."""
    with (
        patch(
            "homeassistant.components.example_air.ExampleAirClient",
            autospec=True,
        ) as mock_client,
        patch(
            "homeassistant.components.example_air.config_flow"
            ".ExampleAirClient",
            new=mock_client,
        ),
    ):
        client = mock_client.return_value
        client.get_status.return_value = Status(
            serial_number="EA123456",
            name="Living room",
            firmware="1.2.0",
            temperature=21.5,
            humidity=45.0,
            pm25=8,
        )
        yield client


@pytest.fixture
def mock_config_entry() -> MockConfigEntry:
    """Return the config entry of a monitor."""
    return MockConfigEntry(
        domain=DOMAIN,
        title="Living room",
        unique_id="EA123456",
        data={CONF_HOST: "192.168.1.50"},
    )
```

The client is patched where your integration imports it: once in `__init__.py`, once in `config_flow.py`.

### Test the config flow

Replace `test_config_flow.py`. Test the happy path, every error, and the duplicate check. Every error test ends with a created entry, to prove the flow recovers:

```python
"""Test the Example Air config flow."""

from unittest.mock import MagicMock

from exampleair import ExampleAirConnectionError
import pytest

from homeassistant.components.example_air.const import DOMAIN
from homeassistant.config_entries import SOURCE_USER
from homeassistant.const import CONF_HOST
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

from tests.common import MockConfigEntry


@pytest.mark.usefixtures("mock_setup_entry", "mock_example_air_client")
async def test_user_flow(hass: HomeAssistant) -> None:
    """Test adding a monitor."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {}

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_HOST: "192.168.1.50"}
    )

    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Living room"
    assert result["data"] == {CONF_HOST: "192.168.1.50"}
    assert result["result"].unique_id == "EA123456"


@pytest.mark.usefixtures("mock_setup_entry")
@pytest.mark.parametrize(
    ("exception", "error"),
    [
        pytest.param(
            ExampleAirConnectionError, "cannot_connect", id="cannot_connect"
        ),
        pytest.param(Exception, "unknown", id="unknown"),
    ],
)
async def test_user_flow_errors(
    hass: HomeAssistant,
    mock_example_air_client: MagicMock,
    exception: type[Exception],
    error: str,
) -> None:
    """Test errors, and that the flow recovers from them."""
    mock_example_air_client.get_status.side_effect = exception

    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_HOST: "192.168.1.50"}
    )

    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": error}

    mock_example_air_client.get_status.side_effect = None

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_HOST: "192.168.1.50"}
    )

    assert result["type"] is FlowResultType.CREATE_ENTRY


@pytest.mark.usefixtures("mock_example_air_client")
async def test_already_configured(
    hass: HomeAssistant, mock_config_entry: MockConfigEntry
) -> None:
    """Test that the same monitor cannot be added twice."""
    mock_config_entry.add_to_hass(hass)

    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_HOST: "192.168.1.60"}
    )

    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"
```

These tests together are the [config-flow-test-coverage](/core/quality-scale/config-flow-test-coverage/) rule:

- The happy path checks the created entry, including its unique ID. When the way the unique ID is built ever changes by accident, this test catches it.
- Every error the form can show has a test, and every one of those tests ends with a created entry. That proves a user can fix the problem and finish the setup. Pylint warns about an error test that never finishes the flow.
- The duplicate test enters a different host for a monitor with the same serial number, and expects the flow to abort with `already_configured`. Every test ends in a final result: a created entry or an abort.
- Together, they run every line of `config_flow.py`. You check that with the coverage report below.

### Test the setup

In `test_init.py`, test that the integration loads and unloads, and that setup is retried when the monitor is offline:

```python
"""Test the setup of the Example Air integration."""

from unittest.mock import MagicMock

from exampleair import ExampleAirConnectionError
import pytest

from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant

from tests.common import MockConfigEntry


@pytest.mark.usefixtures("mock_example_air_client")
async def test_load_unload(
    hass: HomeAssistant, mock_config_entry: MockConfigEntry
) -> None:
    """Test loading and unloading a config entry."""
    mock_config_entry.add_to_hass(hass)

    await hass.config_entries.async_setup(mock_config_entry.entry_id)
    await hass.async_block_till_done()

    assert mock_config_entry.state is ConfigEntryState.LOADED

    await hass.config_entries.async_unload(mock_config_entry.entry_id)
    await hass.async_block_till_done()

    assert mock_config_entry.state is ConfigEntryState.NOT_LOADED


async def test_setup_retry_when_offline(
    hass: HomeAssistant,
    mock_example_air_client: MagicMock,
    mock_config_entry: MockConfigEntry,
) -> None:
    """Test that setup is retried when the monitor is offline."""
    mock_example_air_client.get_status.side_effect = (
        ExampleAirConnectionError
    )
    mock_config_entry.add_to_hass(hass)

    await hass.config_entries.async_setup(mock_config_entry.entry_id)
    await hass.async_block_till_done()

    assert mock_config_entry.state is ConfigEntryState.SETUP_RETRY
```

### Test the sensors

In `test_sensor.py`, a snapshot test checks every sensor at once: its state, unit, device class, and registry entry:

```python
"""Test the Example Air sensors."""

import pytest
from syrupy.assertion import SnapshotAssertion

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from tests.common import MockConfigEntry, snapshot_platform


@pytest.mark.usefixtures("mock_example_air_client")
async def test_sensors(
    hass: HomeAssistant,
    mock_config_entry: MockConfigEntry,
    entity_registry: er.EntityRegistry,
    snapshot: SnapshotAssertion,
) -> None:
    """Test the sensors of a monitor."""
    mock_config_entry.add_to_hass(hass)

    await hass.config_entries.async_setup(mock_config_entry.entry_id)
    await hass.async_block_till_done()

    await snapshot_platform(
        hass, entity_registry, snapshot, mock_config_entry.entry_id
    )
```

### Run them

The first run of a snapshot test creates the snapshot. Then run all tests with a coverage report:

```shell
pytest tests/components/example_air --snapshot-update
pytest tests/components/example_air \
  --cov=homeassistant.components.example_air \
  --cov-report term-missing
```

Open `tests/components/example_air/snapshots/test_sensor.ambr` and read it: a snapshot only proves something when you checked that it is right. The coverage report shows the lines no test reaches. `config_flow.py` must be at 100%. [Running the tests](/core/development/testing/) has more ways to run them.

## 10. Add the brand and the documentation

Seven Bronze rules are not about the code in core at all. They are met in two other repositories, with pull requests that go with yours. Start them now: they get reviewed separately, and your core pull request is easier to review when they are already there.

### The brand

The icon and logo of your integration go in the [brands repository](https://github.com/home-assistant/brands), in a folder named after your domain: `core_integrations/example_air/`. Add at least `icon.png` and `icon@2x.png`, and a logo if the brand has a wide one. [Brands and brand images](/core/integrations/brands/#brand-images-for-core-integrations) lists every file and the image requirements. That is the [brands](/core/quality-scale/brands/) rule.

### The documentation

Every integration has a page on [home-assistant.io](https://www.home-assistant.io/). Write it in a pull request to the [home-assistant.io repository](https://github.com/home-assistant/home-assistant.io), against the `next` branch, starting from the integration page template. [Document an integration](/writing/guides/integration/) walks you through it, step by step.

For Bronze, the page needs three things, each a rule of its own:

- **A description of the product**, in the first lines, with a link to the manufacturer. That is [docs-high-level-description](/core/quality-scale/docs-high-level-description/).
- **Setup steps**, with anything users have to do before they start, as prerequisites. That is [docs-installation-instructions](/core/quality-scale/docs-installation-instructions/).
- **How to remove the integration**, including anything left behind outside Home Assistant. That is [docs-removal-instructions](/core/quality-scale/docs-removal-instructions/).

For Example Air, those parts of `source/_integrations/example_air.markdown` could look like this:

```markdown
The **Example Air** {% term integration %} connects Home Assistant to
the air quality monitors of [Example](https://www.example.com). It shows
the temperature, humidity, and fine dust that your monitor measures.

## Prerequisites

1. Set up your monitor with the **Example** app, and connect it to your
   network.
2. In the app, look up the IP address of your monitor.

{% include integrations/config_flow.md %}

## Removing the integration

This integration follows standard integration removal. No extra steps
are required.

{% include integrations/remove_device_service.md %}
```

The other three docs rules of Bronze, [docs-actions](/core/quality-scale/docs-actions/), [docs-triggers](/core/quality-scale/docs-triggers/), and [docs-conditions](/core/quality-scale/docs-conditions/), are about documenting actions, triggers, and conditions of the integration. Example Air has none of them, so those rules are exempt.

## 11. Fill in the quality scale

Open `quality_scale.yaml`. The scaffold listed every rule as `todo`. Hassfest requires every rule of the quality scale to be in the file, and every Bronze rule to be `done`, or `exempt` with a comment that says why. Your integration now meets all of them:

| Rule | Status | Where |
| --- | --- | --- |
| [action-setup](/core/quality-scale/action-setup/) | Exempt | No actions, [step 6](#6-set-up-the-config-entry) |
| [appropriate-polling](/core/quality-scale/appropriate-polling/) | Done | One minute, [step 5](#5-fetch-the-data-with-a-coordinator) |
| [brands](/core/quality-scale/brands/) | Done | [Step 10](#the-brand) |
| [common-modules](/core/quality-scale/common-modules/) | Done | `coordinator.py` and `entity.py`, steps 5 and 7 |
| [config-flow](/core/quality-scale/config-flow/) | Done | [Step 4](#4-build-the-config-flow) |
| [config-flow-test-coverage](/core/quality-scale/config-flow-test-coverage/) | Done | [Step 9](#test-the-config-flow) |
| [dependency-transparency](/core/quality-scale/dependency-transparency/) | Done | Steps [1](#1-start-with-the-library) and [3](#3-check-the-manifest) |
| [docs-actions](/core/quality-scale/docs-actions/) | Exempt | No actions |
| [docs-conditions](/core/quality-scale/docs-conditions/) | Exempt | No conditions |
| [docs-high-level-description](/core/quality-scale/docs-high-level-description/) | Done | [Step 10](#the-documentation) |
| [docs-installation-instructions](/core/quality-scale/docs-installation-instructions/) | Done | [Step 10](#the-documentation) |
| [docs-removal-instructions](/core/quality-scale/docs-removal-instructions/) | Done | [Step 10](#the-documentation) |
| [docs-triggers](/core/quality-scale/docs-triggers/) | Exempt | No triggers |
| [entity-event-setup](/core/quality-scale/entity-event-setup/) | Exempt | Only the coordinator, [step 7](#7-add-the-entities) |
| [entity-unique-id](/core/quality-scale/entity-unique-id/) | Done | [Step 7](#7-add-the-entities) |
| [has-entity-name](/core/quality-scale/has-entity-name/) | Done | [Step 7](#7-add-the-entities) |
| [runtime-data](/core/quality-scale/runtime-data/) | Done | [Step 6](#6-set-up-the-config-entry) |
| [test-before-configure](/core/quality-scale/test-before-configure/) | Done | [Step 4](#4-build-the-config-flow) |
| [test-before-setup](/core/quality-scale/test-before-setup/) | Done | [Step 6](#6-set-up-the-config-entry) |
| [unique-config-entry](/core/quality-scale/unique-config-entry/) | Done | [Step 4](#4-build-the-config-flow) |

Replace the file with:

```yaml
rules:
  # Bronze
  action-setup:
    status: exempt
    comment: "The integration does not register actions."
  appropriate-polling: done
  brands: done
  common-modules: done
  config-flow-test-coverage: done
  config-flow: done
  dependency-transparency: done
  docs-actions:
    status: exempt
    comment: "The integration does not register actions."
  docs-conditions:
    status: exempt
    comment: "The integration does not provide conditions."
  docs-high-level-description: done
  docs-installation-instructions: done
  docs-removal-instructions: done
  docs-triggers:
    status: exempt
    comment: "The integration does not provide triggers."
  entity-event-setup:
    status: exempt
    comment: "Entities only subscribe to the coordinator."
  entity-unique-id: done
  has-entity-name: done
  runtime-data: done
  test-before-configure: done
  test-before-setup: done
  unique-config-entry: done

  # Silver
  action-exceptions: todo
  config-entry-unloading: todo
  docs-configuration-parameters: todo
  docs-installation-parameters: todo
  entity-unavailable: todo
  integration-owner: todo
  log-when-unavailable: todo
  parallel-updates: todo
  reauthentication-flow: todo
  test-coverage: todo

  # Gold
  devices: todo
  diagnostics: todo
  discovery-update-info: todo
  discovery: todo
  docs-data-update: todo
  docs-examples: todo
  docs-known-limitations: todo
  docs-supported-devices: todo
  docs-supported-functions: todo
  docs-troubleshooting: todo
  docs-use-cases: todo
  dynamic-devices: todo
  entity-category: todo
  entity-device-class: todo
  entity-disabled-by-default: todo
  entity-translations: todo
  exception-translations: todo
  icon-translations: todo
  reconfiguration-flow: todo
  repair-issues: todo
  stale-devices: todo

  # Platinum
  async-dependency: todo
  inject-websession: todo
  strict-typing: todo
```

The Silver, Gold, and Platinum rules stay `todo` for now. Some of them are already within reach, but leave them for later pull requests. Only mark a rule `done` when it really is: a rule that is `done` turns on extra checks in hassfest and pylint, and reviewers check the rest.

The docs and brand rules are `done` in this file, but they are met in the other pull requests. Reviewers check those pull requests, so link them in yours.

### Check it yourself

Do not take this page's word for it. Validate your integration the way CI does:

```shell
python3 -m script.hassfest \
  --integration-path homeassistant/components/example_air
pytest tests/components/example_air \
  --cov=homeassistant.components.example_air \
  --cov-report term-missing
```

Hassfest now runs the validators of the rules you marked `done`, like `config-flow`, `runtime-data`, `test-before-setup`, and `unique-config-entry`. The coverage report must show 100% for `config_flow.py`. The [list of all rules](/core/quality-scale/rules/) explains each rule in a line, and [check it yourself](/core/quality-scale/raise-tier/#check-it-yourself) explains what each check proves, and what it does not.

## 12. Open the pull request

Publishing in the Marketplace first? Follow [publish a custom integration](/marketplace/guides/integrations/) instead, and come back to this step once your integration has matured and has a user base.

Before you push, run the linters on everything, and run hassfest one last time without skipping anything. Include every file they change, also outside your integration folder:

```shell
prek run --all-files
python3 -m script.hassfest
```

Your pull request now contains your integration, its tests, the generated files, and the updated requirement files. Commit it on the branch you created at the start, push it to your fork, and open a pull request against the `dev` branch of [home-assistant/core](https://github.com/home-assistant/core). [Submitting a pull request](/core/development/submitting/) walks through the template. For a new integration:

- Select **New integration** as the type of change.
- Explain what the device or service is, and link to the source repository of your library, its release workflow, and the tag of the release you depend on.
- Link the pull requests for the documentation and the brand.
- Keep it to what you built here: one platform, and nothing more. Diagnostics, actions, reauthentication, and options come later, one pull request at a time.

Then the wait starts. Reviews of new integrations take time, sometimes weeks. While you wait, review other pull requests: it is the best way to learn, and it makes the queue move for everyone. [After you open a pull request](/core/development/review-process/) explains what happens next.

## What is next

Your integration is in. Now make it better, one small pull request at a time:

- [Raise the tier](/core/quality-scale/raise-tier/) to Silver: handle an offline device gracefully, add reauthentication if your device needs credentials, and reach more than 95% test coverage.
- Add [diagnostics](/core/integrations/diagnostics/), so users can share what the integration sees when they report a bug.
- Support [discovery](/core/integrations/discovery/), so Home Assistant finds the monitor by itself.
- Add a second platform, like a [binary sensor](/core/entities/binary-sensor/) for an air quality alarm.

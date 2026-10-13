---
title: Running the tests
description: Run the tests of Home Assistant Core with pytest, check your coverage, update snapshots, and know what CI runs.
sidebarLabel: Running the tests
sidebarGroup: Write code
order: 4
---

Every change to core is tested. Core uses [pytest](https://docs.pytest.org/), and this page is about running the tests: which commands, which options, and what CI does with them. How to write good tests for an integration, with fixtures, mocks, and snapshots, is on [writing tests](/core/development/tests/).

## Run the tests

Activate your virtual environment first (the development container does that for you). Then run the tests of the integration you changed:

```shell
pytest tests/components/example
```

Outside an activated environment, `uv run --no-sync pytest` does the same.

The full test suite takes a long time. Run it if you changed something that many integrations use, otherwise the tests of your own change are enough.

Some useful options:

```shell
# Stop at the first failure
pytest tests/components/example -x

# Run only tests with a matching name
pytest tests/components/example -k test_setup

# Fail a test that runs longer than 10 seconds
pytest tests/components/example --timeout 10

# Show the 10 slowest tests
pytest tests/components/example --durations=10
```

> [!NOTE]
> Tests load the English text from the generated `translations/en.json`, not from `strings.json`. After you change `strings.json`, run `python3 -m script.translations develop --integration example` before you run the tests.

## Check your coverage

To see which lines your tests do not cover yet:

```shell
pytest tests/components/example \
  --cov=homeassistant.components.example \
  --cov-report term-missing
```

The report lists every module of the integration, with the lines no test reaches. The quality scale asks for full coverage of `config_flow.py` from Bronze, and more than 95% for every module from Silver.

CI reports coverage to Codecov, and for some files Codecov wants every changed line tested. In any integration, the lines your pull request changes in these files need 100% coverage, or the Codecov check fails:

- `backup.py`
- `config_flow.py`
- `device_action.py`
- `device_condition.py`
- `device_trigger.py`
- `diagnostics.py`
- `group.py`
- `intent.py`
- `logbook.py`
- `media_source.py`
- `recorder.py`
- `scene.py`

The list lives in [`codecov.yml`](https://github.com/home-assistant/core/blob/dev/codecov.yml) in the core repository.

## Update snapshots

Snapshot tests compare the result of your code with a stored `.ambr` file. Create or update the snapshots of an integration with:

```shell
pytest tests/components/example --snapshot-update
```

Commit the snapshot files with your change, and read their diff. See [snapshot tests](/core/development/tests/#snapshot-tests).

## New dependencies

If you changed the requirements of an integration, update the requirement files and install the new packages:

```shell
python3 -m script.gen_requirements_all
uv pip install -r requirements_all.txt -r requirements_test.txt
```

## In Visual Studio Code

The development container has tasks for all of this. Open the Command Palette, select **Tasks: Run Task**, and pick **Pytest**, **Pytest (changed tests only)**, **Code Coverage**, or **Update syrupy snapshots**. See [tasks](/core/development/environment/#tasks).

## What CI runs

CI runs the tests on every pull request. When a pull request only touches integrations, it runs the tests of those integrations. It runs the full suite when you change core files, or when a maintainer adds the `ci-full-run` label. See [linters, hassfest, and CI](/core/development/checks/).

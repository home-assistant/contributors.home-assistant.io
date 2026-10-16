---
title: Type hints
description: How Home Assistant Core uses type hints and mypy, and how to opt a module in to strict checking.
sidebarGroup: Write code
order: 3
---

Type hints make code easier to understand for the next person, and they let [mypy](https://mypy.readthedocs.io/) find bugs before your users do. Core checks every module with mypy, in the Git hooks and in CI.

## What is required

Type hints are not required in every integration yet, but they are strongly encouraged, and the goal is full coverage. In tests, reviewers do expect them: give every parameter of a test function a type, and prefer concrete types like `HomeAssistant` or `MockConfigEntry` over `Any`.

```python
async def test_setup(
    hass: HomeAssistant,
    mock_config_entry: MockConfigEntry,
) -> None:
    """Test setting up the integration."""
```

Python 3.14 evaluates annotations lazily, so you can refer to a class that is defined further down the file without quotes.

## Adding hints to untyped code

Typing a module that has no hints at all is a lot of work. [MonkeyType](https://pypi.org/project/MonkeyType/) can do a first pass: it watches the calls while the tests run, and suggests hints from the types it saw. Core has a script for it. MonkeyType is not installed by default, so install it first with `uv pip install monkeytype`.

1. Run the tests of your module under MonkeyType:

   ```shell
   script/monkeytype tests/components/example/test_sensor.py
   ```

2. Look at the hints it suggests, with `monkeytype stub homeassistant.components.example.sensor`.
3. If they look reasonable, apply them with `monkeytype apply homeassistant.components.example.sensor`.
4. Check the diff and fix what it got wrong. It only knows the types the tests happened to use.

This works best on modules without any hints. Applying it to a module that already has some can fail.

## Strict checking

By default, mypy accepts code that is only partly typed. A module that is fully typed can opt in to strict checking, which also fails on missing hints and `Any` creeping in.

To opt in, add the module to the `.strict-typing` file in the root of the repository, in alphabetical order. For an integration, that is a line like `homeassistant.components.example.*`. Then run hassfest to update `mypy.ini`:

```shell
python3 -m script.hassfest -p mypy_config
```

Commit both files. Integrations on the Platinum tier of the [integration quality scale](/core/quality-scale/) must be strictly typed.

## Helping the type checker

Sometimes you know more than the type checker. For example, a value that can be `None` in general, but never at this point in the code. Narrow the type with an `assert` inside a `TYPE_CHECKING` block, so it exists for the type checker only and never runs:

```python
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    assert self.coordinator.data is not None
```

Only do this when changing the annotations themselves is impossible or very cumbersome.

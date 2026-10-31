---
title: Code style
description: The style rules for Python in Home Assistant Core. Formatting, docstrings, logging, error handling, and the conventions reviewers look for.
sidebarGroup: Write code
order: 2
---

Core is a big codebase with thousands of contributors. A consistent style makes it readable for all of them. Most of the rules are enforced by tools, so you do not have to remember them. The rest are conventions that reviewers will point out.

## Formatting and linting

You don't format code by hand, and there is no style guide to memorize: the tools decide.

- [Ruff](https://docs.astral.sh/ruff/) formats all code, and its linter catches most problems, including the order of your imports. Docstrings follow the Google convention, which Ruff checks too.
- [Pylint](https://pylint.readthedocs.io/), with a set of checks written for Home Assistant, catches the patterns Ruff cannot see.

Both run when you commit, and again in CI. A pull request that does not pass them is not merged. See [Linters, hassfest, and CI](/core/development/checks/) for how to run them yourself.

Core requires Python 3.14 or newer, so use what it offers. You do not need `from __future__ import annotations` (Ruff even blocks it), and forward references in annotations do not need quotes.

## Docstrings and comments

Every module, class, and function has a docstring. The docstring at the top of a file says what the file is about:

```python
"""Support for Example sensors."""
```

Type hints document the parameters of a function. When a function needs more explanation, use the [Google style](https://google.github.io/styleguide/pyguide.html#383-functions-and-methods), and leave the types out: they are already in the signature.

```python
def calculate_dew_point(temperature: float, humidity: float) -> float:
    """Calculate the dew point.

    Args:
        temperature: The temperature in degrees Celsius.
        humidity: The relative humidity, in percent.

    Raises:
        ValueError: If the humidity is not between 0 and 100.
    """
```

Comments are full sentences that end with a period. Keep them short, and use them to explain *why*, never *what*: the code already says what it does. Do not leave commented out code behind. Git remembers it.

## Order and constants

- Keep constants, and the contents of lists and dictionaries, in alphabetical order where the order does not matter.
- Constants used by multiple modules go in `const.py`, and are imported from there. A constant only one module uses stays in that module.
- Replace magic strings with constants.

## Logging

The logger already adds the name of the integration, so do not repeat it in the message. Like syslog messages, log messages do not end with a period.

```python
_LOGGER.error("No route to device: %s", self._resource)
```

```text
ERROR [homeassistant.components.example] No route to device: 10.0.0.8
```

- Use `_LOGGER.debug` for anything that is not meant for the user. Be careful with `_LOGGER.info`.
- Use `_LOGGER.error` only for things the user should act on, and `_LOGGER.warning` when something works, but not fully. A device that is offline is expected, not an error.
- Never log API keys, tokens, usernames, or passwords. Not even wrong ones.

## String formatting

Use f-strings, not `%` or `str.format`:

```python
name = f"{device_name} {sensor_name}"
```

Logging is the exception. Pass the values as arguments, so the message is only formatted when it is actually logged:

```python
_LOGGER.info("Can't connect to %s at %s", service, host)
```

## Error handling

- Catch only the exceptions you expect, like the connection and API errors of your library. Do not use `except Exception:`. The one accepted place is the last `except` of a config flow step, which logs the unexpected error with `_LOGGER.exception` and shows the `unknown` error, like the scaffold generates.
- Keep `try` blocks small. Only put the lines in them that can raise the exception you catch.
- Prefer early returns over deep nesting: `if not condition: return`.
- When validation guarantees that a key exists, use `data["key"]`, not `data.get("key")`. A missing key is a bug, and it should show.
- Do not add checks for input that an action schema already validated.

When an action fails, raise `HomeAssistantError`, or `ServiceValidationError` when the input was wrong, so the user sees the error in the interface. Do not log it as well, the message is already logged.

```python
async def async_turn_on(self, **kwargs: Any) -> None:
    """Turn on the switch."""
    try:
        await self.device.turn_on()
    except DeviceConnectionError as err:
        raise HomeAssistantError(f"Failed to turn on: {err}") from err
```

## Using assert

Python removes `assert` statements when it runs with `-O`, so they are not for checks at runtime. Use them in tests, and to help the type checker narrow a type. In that case, put them in a `TYPE_CHECKING` block, so they never run:

```python
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    assert self.client is not None
```

## Structure

- Use a dataclass to pass related values around, instead of a tuple or a dictionary.
- Do not store the same value in two places.
- Entities use the `_attr_` attributes, like `_attr_native_value`, instead of properties, unless the value has to be computed when it is read.
- Actions that change configuration or have security impact require an admin. Register them with `async_register_admin_service`.
- Integrations do not contain `.gitignore` files.

Not sure how something should look? Look at an integration on the Platinum or Gold tier of the [integration quality scale](/core/quality-scale/). The tier is in its `manifest.json`.

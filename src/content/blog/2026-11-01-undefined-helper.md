---
title: Undefined sentinel changes
description: Deprecate UNDEFINED and UndefinedType in favor of Undefined
date: 2026-11-01
authors:
  - Marc Mueller
areas:
  - core
---

As of Home Assistant Core 2026.12, the `UNDEFINED` and `UndefinedType` helpers are deprecated in favor of just `Undefined`.

```python
# old
from homeassistant.helpers.typing import UNDEFINED, UndefinedType

def some_function(
    variable: str | UndefinedType | None = UNDEFINED,
) -> None:
    ...
```

```python
# new
from homeassistant.helpers.typing import Undefined

def some_function(
    variable: str | Undefined | None = Undefined,
) -> None:
    ...
```

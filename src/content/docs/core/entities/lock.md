---
title: Lock entity
description: Build a lock entity for smart locks that lock, unlock, and optionally open a door.
sidebarLabel: Lock
sidebarGroup: Openings and security
---

A lock entity controls a lock: it locks, unlocks, and on some locks, opens the door by pulling back the latch. It can ask for a code. Inherit from `LockEntity` in `homeassistant.components.lock`.

For how the frontend shows a lock, see the [lock more-info view](/design/more-info/lock/).

## Properties

Lock entities have these properties on top of the [generic entity properties](/core/entities/entity-class/). Every property can be set with its `_attr_` attribute, like `_attr_is_locked`.

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `is_locked` | `bool \| None` | `None` | Whether the lock is locked. |
| `is_locking` | `bool \| None` | `None` | Whether the lock is in the process of being locked. |
| `is_unlocking` | `bool \| None` | `None` | Whether the lock is in the process of being unlocked. |
| `is_open` | `bool \| None` | `None` | Whether the lock is unlocked and has released its latch. |
| `is_opening` | `bool \| None` | `None` | Whether the lock is in the process of releasing its latch. |
| `is_jammed` | `bool \| None` | `None` | Whether the lock tried to move, to lock, unlock, or open, but got stuck before it finished. |
| `code_format` | `str \| None` | `None` | A regular expression the code must match, like `^\d{4}$`. `None` means the lock needs no code. |
| `changed_by` | `str \| None` | `None` | Who or what changed the lock last, like a user name or a keypad. |

## Codes

When `code_format` is set, Home Assistant checks the code in a lock, unlock, or open action against it before it calls your method, and raises a validation error when it does not match. That check also runs for an action without a code: an empty code must match `code_format` too, so a pattern like `^\d{4}$` makes a code required for every action. Your methods receive the code as `ATTR_CODE` in `kwargs`, and only when there is one, so read it with `kwargs.get(ATTR_CODE)` when it is optional.

Users can store a default code in the entity settings. When an action comes without a code, Home Assistant uses that default code. A default code that does not match `code_format` is ignored. You do not have to do anything for it: it reads the setting from the [entity registry options](/core/entities/registry/) and adds the code for you.

## Supported features

Set the `LockEntityFeature` flags as `supported_features`. See [supported features](/glossary/supported-features/).

| Value | Description |
| ----- | ----------- |
| `OPEN` | The lock can open the door latch. Implement `open`. |

## Methods

Implement the sync or the async variant of each method, not both.

| Method | Async variant | Description |
| ------ | ------------- | ----------- |
| `lock(**kwargs: Any)` | `async_lock` | Lock the lock. |
| `unlock(**kwargs: Any)` | `async_unlock` | Unlock the lock. |
| `open(**kwargs: Any)` | `async_open` | Open the door latch. Requires `OPEN`. |

## States

The state is a `LockState`, picked from the first property that is `True`, in this order:

| Value | From | Description |
| ----- | ---- | ----------- |
| `LockState.JAMMED` | `is_jammed` | The lock tried to move but got stuck before it finished. |
| `LockState.OPENING` | `is_opening` | The lock is releasing its latch. |
| `LockState.LOCKING` | `is_locking` | The lock is being locked. |
| `LockState.OPEN` | `is_open` | The lock is not secured and has released its latch. |
| `LockState.UNLOCKING` | `is_unlocking` | The lock is being unlocked. |
| `LockState.LOCKED` | `is_locked` is `True` | The lock is locked. |
| `LockState.UNLOCKED` | `is_locked` is `False` | The lock is not locked. |

When none of them apply and `is_locked` is `None`, the state is `unknown`.

`OPEN` needs both: the lock is not secured, *and* its latch is released. A released latch while the lock is still secured is not the open state.

## Example

```python
from typing import Any

from homeassistant.components.lock import LockEntity


class MyLock(LockEntity):
    """A smart lock with a four digit code."""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_code_format = r"^\d{4}$"

    def __init__(self, device: MyDevice) -> None:
        """Set up the lock."""
        self._device = device
        self._attr_unique_id = device.serial

    @property
    def is_locked(self) -> bool:
        """Return if the lock is locked."""
        return self._device.locked

    @property
    def is_jammed(self) -> bool:
        """Return if the lock is jammed."""
        return self._device.jammed

    async def async_lock(self, **kwargs: Any) -> None:
        """Lock the lock."""
        await self._device.lock()

    async def async_unlock(self, **kwargs: Any) -> None:
        """Unlock the lock."""
        await self._device.unlock(kwargs["code"])
```

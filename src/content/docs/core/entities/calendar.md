---
title: Calendar entity
description: Expose a calendar with events that have a start and an end, and optionally let users create, update, and delete them.
sidebarLabel: Calendar
sidebarGroup: Sensors and status
---

A calendar entity represents a set of events, each with a start and an end date or time. Its state shows whether an event is going on right now, which makes it useful in automations. Inherit from `CalendarEntity`, imported from `homeassistant.components.calendar`.

Calendar integrations follow the iCalendar standard, [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545). If your integration supports recurring events, it expands them itself: return every occurrence in a series as its own event.

## Properties

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `event` | `CalendarEvent \| None` | Required | The event going on now, or the next upcoming one. `None` when there is none. |
| `initial_color` | `str \| None` | `None` | A hex color, like `"#16a765"`, for the calendar in the frontend. |

You are responsible for picking the right `event`: order events correctly, and treat all day events as starting at midnight in the Home Assistant time zone. Use `homeassistant.util.dt.now()` to get the current time in that time zone.

`initial_color` is stored in the entity options of the [entity registry](/core/entities/registry/) when the entity is first added. After that, the user owns the color and can change it in the entity settings. Invalid colors are ignored.

The generic properties every entity has, like `name` or `available`, are on [the entity class](/core/entities/entity-class/).

## Supported features

Combine the `CalendarEntityFeature` flags with `|`, and implement the method that goes with each one.

| Feature | Method to implement |
| --- | --- |
| `CREATE_EVENT` | `async_create_event` |
| `DELETE_EVENT` | `async_delete_event` |
| `UPDATE_EVENT` | `async_update_event` |

Integrations that change events must handle RFC 5545 fields with care: keep fields they do not know about, and support recurring events.

## The `CalendarEvent` class

A `CalendarEvent` is one event on the calendar. It validates itself when you create it.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `start` | `datetime \| date` | Required | The start of the event, inclusive. |
| `end` | `datetime \| date` | Required | The end of the event, exclusive. |
| `summary` | `str` | Required | The title of the event. |
| `description` | `str \| None` | `None` | A longer description. |
| `location` | `str \| None` | `None` | Where the event takes place. |
| `uid` | `str \| None` | `None` | A unique ID for the event. Required to update or delete it. |
| `recurrence_id` | `str \| None` | `None` | Identifies one occurrence of a recurring event. Required to change a single occurrence. |
| `rrule` | `str \| None` | `None` | The recurrence rule, like `FREQ=DAILY`. |
| `status` | `CalendarEventStatus \| None` | `None` | `CONFIRMED` or `TENTATIVE`. |

`start` and `end` are both dates, for an all day event, or both datetimes with the same time zone. An all day event uses a `date`, never a datetime at midnight. If an all day event has the same start and end, the end is moved one day later.

Only set `status` when the calendar reports one. An event without a status is not the same as a confirmed event. Calendar entities do not return cancelled events at all: filter them out instead of reporting a status for them.

## Methods

### Get events

```python
async def async_get_events(
    self,
    hass: HomeAssistant,
    start_date: datetime.datetime,
    end_date: datetime.datetime,
) -> list[CalendarEvent]:
```

Required. Return the events in a time range, in order, with recurring events expanded. `start_date` is compared to the end of an event, and `end_date` to the start, both exclusive. Both are in the local Home Assistant time zone.

This method powers the calendar panel, the `calendar.get_events` action, and live updates. The frontend subscribes to the events in a range with the `calendar/event/subscribe` WebSocket command. Every time the entity writes its state, the base class calls this method and pushes the result to the subscribers, debounced so a burst of updates leads to one fetch. You do not implement anything for that. Creating, updating, or deleting an event does not write the state. When events change outside a state write like that, call `self.async_update_event_listeners()` to push the new events.

### Create events

```python
async def async_create_event(self, **kwargs: Any) -> None:
```

Add an event. The keyword arguments are the RFC 5545 fields, like `summary`, `dtstart`, and `dtend`. Needs `CREATE_EVENT`.

### Delete events

```python
async def async_delete_event(
    self,
    uid: str,
    recurrence_id: str | None = None,
    recurrence_range: str | None = None,
) -> None:
```

Needs `DELETE_EVENT`. For recurring events:

- Only `uid`: delete the whole series.
- `uid` and `recurrence_id`: delete one occurrence.
- `uid`, `recurrence_id`, and `recurrence_range`: delete a range of occurrences, starting at `recurrence_id`. RFC 5545 only allows the [range](https://www.rfc-editor.org/rfc/rfc5545#section-3.2.13) `THISANDFUTURE`.

### Update events

```python
async def async_update_event(
    self,
    uid: str,
    event: dict[str, Any],
    recurrence_id: str | None = None,
    recurrence_range: str | None = None,
) -> None:
```

Needs `UPDATE_EVENT`. `uid`, `recurrence_id`, and `recurrence_range` work the same as for deleting.

## States

The base class sets the state from `event`. Do not set `state` yourself.

| State | Meaning |
| --- | --- |
| `on` | An event is going on now. |
| `off` | No event is going on now. |

The `message`, `all_day`, `start_time`, `end_time`, `location`, and `description` attributes describe the current or next event. The base class also schedules a state update for the moment that event starts or ends.

## Example

A read-only calendar:

```python
import datetime

from homeassistant.components.calendar import CalendarEntity, CalendarEvent
from homeassistant.core import HomeAssistant


class ExampleCalendar(CalendarEntity):
    """Calendar from an example service."""

    _attr_has_entity_name = True
    _attr_name = None

    def __init__(self, client: ExampleClient, calendar_id: str) -> None:
        """Initialize the calendar."""
        self._client = client
        self._attr_unique_id = calendar_id
        self._event: CalendarEvent | None = None

    @property
    def event(self) -> CalendarEvent | None:
        """Return the current or next upcoming event."""
        return self._event

    async def async_update(self) -> None:
        """Fetch the current or next event."""
        self._event = await self._client.get_next_event()

    async def async_get_events(
        self,
        hass: HomeAssistant,
        start_date: datetime.datetime,
        end_date: datetime.datetime,
    ) -> list[CalendarEvent]:
        """Return the events in a time range."""
        return await self._client.get_events(start_date, end_date)
```

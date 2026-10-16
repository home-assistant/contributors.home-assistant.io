---
title: Inside Home Assistant Core
description: A tour of the Python application at the heart of Home Assistant, with the way to the details of every part.
order: 10
sidebarLabel: Inside Core
---

[Home Assistant Core](/glossary/core/) is a single Python application. Every installation runs it, whatever runs around it. It holds the state of the home, runs the integrations, and answers the frontend, the apps, and voice assistants.

This page is the tour: what the parts are, and how they work together. The details of each part live in the [Core and integrations](/core/) area, linked below.

## The parts

| Part | In one sentence | The details |
| --- | --- | --- |
| The event loop | Runs everything, one piece at a time, on one thread | [Async in Home Assistant](/core/internals/asyncio/), [blocking operations](/core/internals/blocking-operations/) |
| The `hass` object | The one object that everything else hangs off | [The hass object](/core/internals/hass/) |
| The state machine | Holds the current state of every entity | [States](/core/internals/states/) |
| The event bus | Tells everyone what just happened | [Events](/core/internals/events/) |
| The action registry | Knows everything Home Assistant can do | [Actions](/core/internals/actions/) |
| The registries | Remember entities, devices, and areas, and what users changed | [Registries and storage](/architecture/core/registries/) |
| Integrations | Connect it all to the outside world | [Building integrations](/core/integrations/) |
| Entities | Where integrations meet the rest of Home Assistant | [Entities](/core/entities/) |
| The recorder | Keeps the history | [History and statistics](/architecture/core/history/) |

## How they work together

Take a lamp that turns on by its own switch:

1. The integration for the lamp hears about it, from the network.
2. The lamp's [entity](/glossary/entity/) writes its new state to the state machine.
3. The state machine fires a `state_changed` event on the event bus.
4. Everyone who listens reacts: the frontend shows the lamp as on, the recorder writes it to the history, and an automation that waits for it performs an action.
5. That action goes back through the action registry to an integration, which tells another device what to do.

None of these parts know about each other. They meet in the state machine and on the event bus. That is why a new integration works with every dashboard, automation, and voice assistant from day one.

## Kinds of integrations

Integrations do different jobs, and most do one of these:

- **Define a kind of device**: an entity integration like `light` decides what a light is in Home Assistant, which data it has and in what format, and which actions control it. A new one starts as a proposal in the [architecture discussions](https://github.com/home-assistant/architecture/discussions), with the data it holds, how it is controlled, and examples from several brands.
- **Connect devices and services**: an integration like `hue` talks to Philips Hue, and makes its lights available as `light` entities. These integrations generally don't use the state of entities from other integrations. The exception is entities with a location, like those of `zone` and `device_tracker`.
- **Provide virtual or computed data**: `input_boolean` is a switch that only exists in Home Assistant. `template` and `utility_meter` compute their entities from other data in Home Assistant.
- **Automate**: `automation` runs the automations of users, and a more specific one, like `flux`, adjusts lights to the position of the sun.

## The lifecycle of Home Assistant itself

- [From start to running](/architecture/core/startup/): how Home Assistant starts in stages, so a broken integration can't stop the house, and how it shuts down.
- [Getting data](/architecture/core/data-updates/): how integrations learn about changes, by push or by polling, and what a coordinator does.
- [Registries and storage](/architecture/core/registries/): what Home Assistant remembers between restarts.
- [History and statistics](/architecture/core/history/): how the past is kept, and for how long.

## The repository

Home Assistant Core lives in the [home-assistant/core](https://github.com/home-assistant/core) repository:

| Folder | Holds |
| --- | --- |
| `homeassistant/` | The core itself: `core.py`, `bootstrap.py`, `config_entries.py`, `loader.py` |
| `homeassistant/components/` | Every built-in integration, one folder each |
| `homeassistant/helpers/` | Shared building blocks: entities, registries, the coordinator, storage |
| `homeassistant/util/` | Small utilities without Home Assistant in them: dates, units, colors |
| `tests/` | The tests, in the same layout |
| `script/` | Tools, like hassfest, which checks every integration |

It is Python 3.14 or newer, typed, and checked with tools like Ruff, mypy, and pylint on every pull request. Schemas, for configuration and actions, are written with [probatio](https://pypi.org/project/probatio/).

## Work on this

- New to Core? Start with [your first contribution to Core](/core/first-contribution/).
- [Building integrations](/core/integrations/): connect a device or service.
- [How core works](/core/internals/): the details of each part on this page.

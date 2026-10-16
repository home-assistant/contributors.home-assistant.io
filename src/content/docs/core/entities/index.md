---
title: Entities
description: How entities work in Home Assistant Core, and a reference for every entity platform, from sensors and lights to voice and AI.
order: 20
sidebarGroups:
  - Basics
  - Sensors and status
  - Lights and climate
  - Openings and security
  - Media
  - Remotes and signals
  - Voice and AI
  - Appliances
  - Inputs and helpers
---

An [entity](/glossary/entity/) is the smallest thing in Home Assistant that has a state: one temperature reading, one light, one lock. Users build their automations, dashboards, and voice commands out of entities, so they are the most visible part of any integration you write.

Entities come in domains, like `sensor`, `light`, or `climate`. Each domain is an entity platform: a base class with its own properties, features, and states, that every integration implements in the same way. That shared shape is what makes a light from one brand work exactly like a light from another one, in the interface, in automations, and in voice assistants.

These pages are for developers who build or maintain an integration, or work on an entity platform itself. They assume you know Python and have a [development environment](/core/development/) running. To learn how an integration sets up its platforms and creates entities in the first place, start with [integrations](/core/integrations/).

## How an entity works

1. Your integration creates entity objects in a platform module, like `sensor.py`, and passes them to `async_add_entities`.
2. Home Assistant registers each entity in the [entity registry](/core/entities/registry/), links it to its device, and gives it an entity ID.
3. The entity keeps its data up to date, by [polling or push](/core/entities/state-updates/), and writes its state to the state machine.
4. Users control it through actions, which call methods on your entity, like `async_turn_on`.
5. When the integration unloads, the entity is removed, and [cleans up after itself](/core/entities/lifecycle/).

## Basics

Read these first. They apply to every entity, whatever its domain.

- [The entity class](/core/entities/entity-class/): the base class, the three ways to set properties, and the generic properties.
- [Naming entities](/core/entities/naming/): `has_entity_name`, translated names, friendly names, and entity IDs.
- [Updating state](/core/entities/state-updates/): polling, push, writing the state, and availability.
- [Entity lifecycle](/core/entities/lifecycle/): the hooks that run when an entity is added, changed, and removed.
- [State and attributes](/core/entities/state-attributes/): what ends up in the state object, and what to keep out of it.
- [Icons](/core/entities/icons/): icon translations and the icon property.
- [The entity registry](/core/entities/registry/): unique IDs, devices, entity categories, and disabled entities.

## Entity platforms

Every platform page has the same structure: what the entity represents, its properties, its supported features, the methods you implement, its states, and an example. Where the frontend shows a domain in its own way, the page links to its more-info view in the [Design area](/design/more-info/).

### Sensors and status

- [Sensor](/core/entities/sensor/): a measured or read value, like a temperature or a power reading.
- [Binary sensor](/core/entities/binary-sensor/): something that is on or off, like an open door or detected motion.
- [Event](/core/entities/event/): something that happens, like a button press or a doorbell ring.
- [Weather](/core/entities/weather/): current conditions and forecasts.
- [Device tracker](/core/entities/device-tracker/): where a device is, or whether it is home.
- [Geolocation](/core/entities/geo-location/): events with a location from an external feed.
- [Calendar](/core/entities/calendar/): events with a start and an end.
- [Air quality](/core/entities/air-quality/): deprecated, use sensors instead.

### Lights and climate

- [Light](/core/entities/light/)
- [Climate](/core/entities/climate/)
- [Fan](/core/entities/fan/)
- [Humidifier](/core/entities/humidifier/)
- [Water heater](/core/entities/water-heater/)

### Openings and security

- [Cover](/core/entities/cover/): blinds, shades, garage doors, and gates.
- [Valve](/core/entities/valve/): water and gas valves.
- [Lock](/core/entities/lock/)
- [Alarm control panel](/core/entities/alarm-control-panel/)
- [Siren](/core/entities/siren/)

### Media

- [Media player](/core/entities/media-player/): speakers, TVs, and receivers.
- [Camera](/core/entities/camera/): still images and live streams.
- [Image](/core/entities/image/): a still image that changes now and then.

### Remotes and signals

- [Remote](/core/entities/remote/): send commands to other devices.
- [Infrared](/core/entities/infrared/): shared infrared transmitters and receivers.
- [Radio frequency](/core/entities/radio-frequency/): shared RF transmitters.

### Voice and AI

- [Conversation](/core/entities/conversation/): agents that understand and answer what people say to Assist.
- [Speech-to-text](/core/entities/stt/)
- [Text-to-speech](/core/entities/tts/)
- [Wake word detection](/core/entities/wake-word/)
- [Assist satellite](/core/entities/assist-satellite/): devices that listen and talk back.
- [AI task](/core/entities/ai-task/): generate data or images with a model.

### Appliances

- [Vacuum](/core/entities/vacuum/)
- [Lawn mower](/core/entities/lawn-mower/)
- [Update](/core/entities/update/): firmware and software updates.

### Inputs and helpers

- [Switch](/core/entities/switch/): turn something on or off.
- [Button](/core/entities/button/): trigger a single action.
- [Number](/core/entities/number/), [select](/core/entities/select/), and [text](/core/entities/text/): set a value on a device.
- [Date](/core/entities/date/), [date and time](/core/entities/datetime/), and [time](/core/entities/time/): set a moment on a device.
- [Scene](/core/entities/scene/): activate a scene stored on a device.
- [To-do list](/core/entities/todo/): a list of items with a status.
- [Notify](/core/entities/notify/): send a message.

## Picking the right platform

Choose the platform that matches what the thing really is, not the one that is easiest to implement. A pump that turns on and off is a switch, but a valve is a valve, and a light is a light, even if both only turn on and off. The right platform gives users the right controls, gives voice assistants the right device type, and gives you the right features as the device grows. Each platform page says when it is, and isn't, the right fit.

If no platform fits, or a platform misses something many devices have, don't work around it with attributes. Propose a change in the [architecture discussions](https://github.com/home-assistant/architecture/discussions) first. See [proposing changes to an entity model](/core/entities/entity-class/#proposing-changes-to-an-entity-model).

## Who to talk to

- Questions while building an entity? Ask in the **#core** channel on the [Home Assistant Discord](https://www.home-assistant.io/join-chat/).
- Want to add a feature, state, or device class to a domain? Open a discussion in the [architecture repository](https://github.com/home-assistant/architecture/discussions). When a decision is made, it is recorded there as an architecture decision record.
- Found a bug in an entity platform? Open an issue in the [core repository](https://github.com/home-assistant/core/issues).

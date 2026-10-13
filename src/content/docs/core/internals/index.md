---
title: How core works
description: The inside of Home Assistant Core. The hass object, events, states, asyncio, authentication, the APIs, and the voice and AI building blocks.
order: 40
sidebarGroups:
  - The core
  - Async
  - Authentication
  - APIs
  - Voice and AI
---

Every integration talks to the same small set of building blocks: an event bus, a state machine, an action registry, and the configuration. They all hang off one object, `hass`, and they all run on one asyncio event loop. Once you know how those pieces behave, most of core stops being magic.

This part of the area is for developers who want to understand what happens under an integration, who work on core itself, or who build a client that talks to Home Assistant from the outside. For the big picture of how core, the frontend, the Supervisor, and the operating system fit together, see the [Architecture](/architecture/) area.

## Where to start

If you are new to core, read these three first. They explain things you run into in every integration:

1. [The hass object](/core/internals/hass/): what `hass` is, and what hangs off it.
2. [Async in Home Assistant](/core/internals/asyncio/): why almost everything is `async`, and which functions you may call from where.
3. [Events](/core/internals/events/) and [states](/core/internals/states/): how things happen, and how Home Assistant remembers them.

## The core

- [The hass object](/core/internals/hass/): the central object, and the core configuration on `hass.config`.
- [Events](/core/internals/events/): firing and listening on the event bus.
- [States](/core/internals/states/): the state machine and the state object.
- [Actions](/core/internals/actions/): the action registry, calling actions, and response data.

## Async

- [Async in Home Assistant](/core/internals/asyncio/): the event loop, coroutines, callbacks, and the executor.
- [Thread safety](/core/internals/thread-safety/): which API to use when your code runs outside the event loop.
- [Blocking operations](/core/internals/blocking-operations/): keeping I/O out of the event loop, imports included.

## Authentication

- [How authentication works](/core/internals/auth/): users, credentials, tokens, auth providers, and multi-factor modules.
- [Permissions](/core/internals/permissions/): policies, and checking them in your code.
- [Authentication API](/core/internals/auth-api/): letting an app log in to a Home Assistant instance with OAuth 2.

## APIs

- [REST API](/core/internals/rest-api/): the HTTP endpoints under `/api/`.
- [WebSocket API](/core/internals/websocket-api/): the API the frontend uses, and how to add your own commands.
- [Instance discovery](/core/internals/instance-discovery/): how apps find Home Assistant on the network.
- [Modbus devices](/core/internals/modbus/): libraries for Modbus devices, and sharing one connection.
- [LoRaWAN devices](/core/internals/lorawan/): registering a network server, and exposing the devices on it.

## Voice and AI

- [Intents](/core/internals/intents/): handling and firing intents.
- [Built-in intents](/core/internals/built-in-intents/): the intents Home Assistant handles out of the box.
- [Conversation API](/core/internals/conversation-api/): sending text to a conversation agent and reading the response.
- [Assist pipelines](/core/internals/assist-pipelines/): running speech to text, intent recognition, and text to speech over the WebSocket API.
- [LLM API](/core/internals/llm-api/): exposing tools to large language models, and building your own API.

Building a conversation agent, a speech-to-text provider, or a text-to-speech provider? Those are entities, see [conversation](/core/entities/conversation/), [speech-to-text](/core/entities/stt/), and [text-to-speech](/core/entities/tts/). Writing sentences so Assist understands your language is translation work: see [translate voice commands](/translate/voice/).

## Who to talk to

- The **#core** channel on the [Home Assistant Discord](https://www.home-assistant.io/join-chat/) is the place for questions about core internals.
- Much of the voice work, like the sentences and the wake word engines, happens in the [OHF-Voice](https://github.com/OHF-Voice) organization on GitHub. The integrations themselves, like `conversation` and `assist_pipeline`, live in core.
- Proposals to change how core works start as a discussion in the [architecture repository](https://github.com/home-assistant/architecture/discussions).

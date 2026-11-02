---
title: Core and integrations
description: Python, core, and the integration platform. Everything you need to build and improve integrations, and to work on Home Assistant Core itself.
---

Home Assistant Core is the Python application at the heart of every Home Assistant installation. It runs the state machine, the event bus, automations, and the thousands of integrations that connect Home Assistant to devices and services. All of it lives in one repository: [home-assistant/core](https://github.com/home-assistant/core).

Most contributions to core are about [integrations](/glossary/integration/): adding support for a new device, fixing a bug in an existing one, or bringing an integration up to a higher level of quality. Some contributions go deeper, into the helpers and APIs that every integration builds on.

This area is for you if you write Python, or want to. You do not need to know the whole codebase. Most people start with one integration they use at home, and grow from there.

## What you can work on

- **Fix a bug**: pick up an issue in an integration you use, reproduce it, and fix it.
- **Improve an integration**: add tests, add type hints, or work toward the next tier of the [integration quality scale](/core/quality-scale/).
- **Add an integration**: connect Home Assistant to a device or service it does not support yet.
- **Review**: test and review pull requests from others. It is one of the most valuable things you can do.

## Start here

Pick the path that matches what you want to do:

1. **Fix something first.** Never contributed to core? Start with [your first contribution](/core/first-contribution/): set up your environment, fix a small bug, and open your first pull request. A small fix teaches you the whole process, also if you want to build an integration later.
2. **Build a new integration.** Read [how an integration fits in](/core/integrations/concepts/), then follow the [tutorial](/core/integrations/tutorial/). It builds a small integration from the scaffold to a pull request that meets the Bronze tier. For your own device or service, the project recommends starting in the [Marketplace](/marketplace/): see [does it belong in core](/core/integrations/create/#does-it-belong-in-core).

Then use the rest of this area as your reference: the [development workflow](/core/development/) for the tools and the pull request process, and the guides below for everything else.

## Guides and reference

- [Building integrations](/core/integrations/): the files of an integration, config flows, fetching data, and everything else an integration is made of.
- [Entities and platforms](/core/entities/): sensors, lights, climate devices, and every other entity type, with the properties and features each one supports.
- [Integration quality scale](/core/quality-scale/): the tiers and rules that describe how good an integration is, and what reviewers look for.
- [How core works](/core/internals/): asyncio, the `hass` object, events, states, authentication, the APIs, intents, and LLM support.

## Related areas

- [Translations](/translate/guides/developers/): how to write strings in `strings.json` that translators can work with.
- [Writing documentation](/writing/): every integration has a page on [home-assistant.io](https://www.home-assistant.io/), and you write it together with your code.
- [Frontend](/frontend/): when your change needs something new in the interface.
- [Architecture](/architecture/): the decisions behind how Home Assistant is built.
- [Marketplace](/marketplace/): publish a custom integration, so others can install it from the Marketplace.

## Who to talk to

- On the [Home Assistant Discord](https://www.home-assistant.io/join-chat/), general development questions, like whether an integration belongs in core, fit **#developers**. For a technical question, start a thread in **#support**. The **#core** channel is where the core team discusses Core itself, not the place for questions. Can't see the channels? Under **Channels & Roles**, choose **I want to contribute dev skills to Home Assistant**.
- Bugs and pull requests live in the [core repository](https://github.com/home-assistant/core). Feature ideas go to [GitHub discussions](https://github.com/orgs/home-assistant/discussions).
- Bigger changes to how core works are discussed in the [architecture repository](https://github.com/home-assistant/architecture/discussions) first.

When you ask for help, push your work to a branch and share the link. People can help you much faster when they can see the code, and a link keeps the channel readable.

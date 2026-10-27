---
title: The gallery and the demo
description: Two ways to run the real frontend without a Home Assistant. The gallery for components and cards, the demo for the whole app.
order: 3
---

Not every change needs a running Home Assistant. The [frontend repository](https://github.com/home-assistant/frontend) has two apps that run the real frontend code against fake data: the gallery and the demo.

## The gallery

The gallery shows components, dashboard cards, and more-info views on their own, in every state that matters: on, off, unavailable, loading, in light and dark, and right to left. It is a development tool: run it locally to build and check a component without a Home Assistant.

Run it locally on port 8100:

```shell
pnpm dev:gallery
```

The gallery lives in the `gallery/` folder:

- `gallery/src/pages/<category>/<page>.markdown`: the description of a page, with optional front matter for `title` and `subtitle`.
- `gallery/src/pages/<category>/<page>.ts`: the live demo of the same page. It defines a custom element named after the page, like `demo-components-ha-button` for `components/ha-button`.
- `gallery/sidebar.js`: the sections of the sidebar and the order of pages in them.
- `gallery/src/data/` and `gallery/src/components/`: fake `hass` objects, sample states, and helpers like `demo-cards` and `demo-more-infos` that render a list of card configurations or entities.

Gallery pages use the real components from `src/`, not copies. When your change alters how a documented component behaves, update its gallery page in the same pull request. Maintainers can add the `needs design preview` label to deploy a preview of the gallery for your pull request.

> [!NOTE]
> The published design guidance lives in the [Design](/design/) area of this site, not in the gallery. It replaces design.home-assistant.io. The [components](/design/components/), [dashboard cards](/design/dashboards/), and [more-info views](/design/more-info/) each have a page there, with usage, specs, accessibility, and live examples. When your change alters how a component looks or behaves, update its page there too, with a pull request to [this site](https://github.com/home-assistant/contributors.home-assistant.io).

## The demo

The demo is the complete Home Assistant frontend, running against a mocked backend in your browser. It is published at [demo.home-assistant.io](https://demo.home-assistant.io/). It is the easiest way to load the full app without a server, for example to check a dashboard or take screenshots.

Run it locally on port 8090:

```shell
pnpm dev:demo
```

The demo has several homes to choose from. Select one with the `demo` query parameter, and a page with the part after the `#`:

```text
http://localhost:8090/?demo=<slug>#/energy
```

The slugs are in `demo/src/configs/demo-configs.ts`. Each home has its own folder in `demo/src/configs/`, with its entities, dashboard, and theme. The mocked WebSocket and REST APIs live in `demo/src/stubs/`.

The gallery imports some of those stubs too. When you change a stub, check both the demo and the gallery pages that use it.

Some demo data is generated from Core: the action descriptions in `src/fake_data/demo_services.ts`, and the trigger and condition descriptions in `demo/src/stubs/`. Don't edit those by hand. Run `script/gen_demo_core_data` to regenerate them from the `dev` branch of Core.

## Embed cards on other sites

The demo also builds `embed.js`, which puts dashboard cards on any web page with the `<ha-embed-provider>` and `<ha-embed-card>` elements. Card authors use it for [live demos of their cards](/frontend/custom-ui/demo/). Its code is in `demo/src/embed/`, and `demo/src/html/components.html.template` is the page that documents it, at `/components.html` of the demo.

The provider registers its own set of mocks. Most come from the stubs in `demo/src/stubs/`, and a few, like energy, are defined in `ha-embed-provider.ts`. A fix to a stub the provider imports reaches the demo, the embed, and the gallery pages that import it. For a new stub, import it in `ha-embed-provider.ts` and call it in the constructor too.

The script loads its other files from the site it came from, so it works on other sites too. Map cards are the exception: they only work on the demo site itself for now.

## Translations in the gallery and the demo

Both start in English. Add `--fetch-translations` to load the latest translations, like `pnpm dev:demo --fetch-translations`. Both also accept the [background flags](/frontend/development/run/#keep-a-server-running-in-the-background).

---
title: Live dashboard demos on any web page
description: The Home Assistant demo now publishes elements that put real cards, sections, views, and whole dashboards on any web page, running against a mocked backend in the browser.
date: 2026-11-06
authors:
  - Aidan Timson
areas:
  - frontend
---

Screenshots show what a card looks like. A live demo shows how it works: people can turn on a light, move a slider, and watch the other cards follow. The [Home Assistant demo](https://demo.home-assistant.io/) now publishes a script that does this on any web page, like the README site of your custom card, your blog, or these docs. Everything runs against a mocked backend in the browser, so no Home Assistant server is needed.

## The elements

- `<ha-embed-provider>` holds the mocked backend, with its entities and devices.
- `<ha-embed-card>` renders one card, built-in or custom.
- `<ha-embed-section>` renders one section, or a [section strategy](/frontend/custom-ui/strategy/#a-section-strategy).
- `<ha-embed-view>` renders one view with its badges, a [view strategy](/frontend/custom-ui/strategy/#a-view-strategy), or one view of a dashboard.
- `<ha-embed-dashboard>` renders a whole dashboard with its tabs, or a [dashboard strategy](/frontend/custom-ui/strategy/#a-dashboard-strategy).

The script follows the frontend of the release, so `https://demo.home-assistant.io/embed.js` always has the cards of the current release.

## Load the script

Every element comes from one script. Add it to your page once, and it loads its other files from the demo site:

```html
<script
  type="module"
  src="https://demo.home-assistant.io/embed.js"
></script>
```

## Add a card

Put the entities in a provider and the card configuration in a card. Both take JSON or YAML in a script tag, and the card configuration is the same as in a dashboard:

```html
<ha-embed-provider>
  <script type="text/yaml">
    - entity_id: light.kitchen
      state: "on"
      attributes:
        friendly_name: Kitchen
        supported_color_modes:
          - brightness
        color_mode: brightness
        brightness: 180
  </script>
  <ha-embed-card>
    <script type="text/yaml">
      type: tile
      entity: light.kitchen
      features:
        - type: light-brightness
    </script>
  </ha-embed-card>
</ha-embed-provider>
```

All cards in the same provider share their entities, so changing the light in one card changes it in the others. To show your own card, load its script after the script of the demo and use its `custom:` type. A custom strategy loads the same way.

## Sections, views, and dashboards

The same provider drives bigger layouts too. With the provider from above, this shows a dashboard with two tabs:

```html
<ha-embed-dashboard style="height: 480px">
  <script type="text/yaml">
    views:
      - title: Home
        path: home
        cards:
          - type: tile
            entity: light.kitchen
      - title: Kitchen
        path: kitchen
        cards:
          - type: light
            entity: light.kitchen
  </script>
</ha-embed-dashboard>
```

A dashboard keeps its own current view, so the address of your page stays the same, and two dashboards on one page don't follow each other. Links to its own views, subviews and their back button, and links to anchors on your page all work. There is no edit mode.

## Tip: one site for all your projects

If you maintain several cards or strategies, you don't need a demo site for each. Give each project a demo config, with the entities in `entities` and what to show in `cards`, `sections`, `views`, or `dashboard`. The configs can all live in the host site, or each project can keep its own, like a `demo.yml` next to its code:

```yaml
entities:
  - entity_id: light.kitchen
    state: "on"
    attributes:
      friendly_name: Kitchen
cards:
  - type: custom:my-card
    entity: light.kitchen
```

The site then renders each config: the entities go into a provider, and each card, section, view, or dashboard into its element, as YAML in their script tags. Load the script of each card after the script of the demo, and every project gets a live demo from one site. See [Show several projects on one site](/frontend/custom-ui/demo/#show-several-projects-on-one-site) for more.

## How it works

The embed is built from the same code as the demo, in `demo/src/embed/` of the [frontend repository](https://github.com/home-assistant/frontend/tree/dev/demo/src/embed).

### One script, loaded from anywhere

`embed.js` sets the public path of the bundle from its own URL, so its chunks, translations, and icons all load from the demo site, not from your page. Browsers only start workers from the page's own origin, so workers from the demo site, like the one of the markdown card, start from a small blob that imports the real script. The demo serves its files with CORS.

### A mocked `hass` per provider

`<ha-embed-provider>` creates the same mocked `hass` object as the demo and the gallery, and registers the stubs of `demo/src/stubs/` on it: actions, history and statistics made up from the current states (a few energy sensors of the demo get statistics of their own), weather forecasts, to-do lists, calendar events, energy, and the area, device, and entity registries. Lights, climate, covers, and other domains have specialized mocks, so their actions change their state the way Home Assistant would. The provider passes `hass` to its elements through a Lit context.

### Elements find their provider

A card, section, view, or dashboard uses the provider around it, looking through shadow roots, so it works inside your own components. Outside a provider, it uses the first one on the page, or the `provider` attribute picks one by ID. That means one provider at the top of a page can feed cards anywhere in the text below it.

### Real dashboard code

Cards render through `hui-card`, sections through `hui-section`, views through `hui-view`, and dashboards through `hui-root`, the same elements and strategy code as the dashboard panel. Cards take the width they would have in a section, so a 12 column grid lays out like a dashboard. The cards keep their styles in their shadow roots and follow the light or dark mode of the browser, or the `color-scheme` attribute of the provider.

### Your page stays in charge

The provider has a `hass.mockEntities` API to change entities from your page, and fires `states-changed` when they change. The elements read their script tags when they are set up, so you can also wait to load the script until a demo scrolls into view.

## Where you see it

These docs use the embed already. Many [entity pages](/core/entities/light/) show cards for their entity type, most [dashboard card pages](/design/dashboards/tile-card/) show their card live, and the docs for live demos show sections, views, and a dashboard you can explore.

## Read more

- [Show a live demo of your card](/frontend/custom-ui/demo/): every element and option, with live examples.
- [Areas, devices, calendars, and energy](/frontend/custom-ui/demo/#areas-devices-calendars-and-energy): data for cards that need more than entities.
- [Change and watch entities from your page](/frontend/custom-ui/demo/#change-and-watch-entities-from-your-page): drive a demo from your own script.
- [What the mocked backend can do](/frontend/custom-ui/demo/#what-the-mocked-backend-can-do): the limits to keep in mind.
- [The gallery and the demo](/frontend/development/gallery-and-demo/#embed-cards-on-other-sites): where the embed lives in the frontend, and how to add a mock your card needs.

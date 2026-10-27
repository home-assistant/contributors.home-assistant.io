---
title: Show a live demo of your card
description: Embed working dashboard cards, including your own custom card, on any web page, with the mocked backend of the Home Assistant demo.
sidebarLabel: Live demos
order: 9
---

Screenshots show what a card looks like. A live demo shows how it works: people can turn on a light, move a slider, and see the other cards follow. The [Home Assistant demo](https://demo.home-assistant.io/) publishes two elements that put real dashboard cards on any web page, like your README site or your blog. They run against a mocked backend in the browser, so no Home Assistant server is needed.

- `<ha-embed-provider>` holds the mocked backend and its entities.
- `<ha-embed-card>` renders one card, with the backend of a provider.

All cards in the same provider share their entities. When you change an entity in one card, the other cards show the change.

The [components page](https://demo.home-assistant.io/components.html) of the demo shows all of this working, with every option.

## Load the script

Add the script of the demo to your page. It loads all its other files from the demo site too:

```html
<script
  type="module"
  src="https://demo.home-assistant.io/embed.js"
></script>
```

## Add a card

Put the entities in a script tag inside the provider, and the card configuration in a script tag inside the card. Both take JSON with `type="application/json"`, or YAML with `type="text/yaml"`. The card configuration is the same as in a dashboard.

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

Each entity has an `entity_id`, a `state`, and `attributes`. The optional keys `area_id`, `device_id`, and `platform` set its entry in the entity registry.

YAML needs its indentation. If your site minifies HTML, make sure the minifier keeps the whitespace in script tags, or use JSON. The `entities` attribute of the provider and the `config` attribute of the card take JSON too.

## Show your custom card

Load the script of your card on the page, and use its `custom:` type, the same as in a dashboard:

```html
<script
  type="module"
  src="https://example.com/my-card.js"
></script>

<ha-embed-card>
  <script type="text/yaml">
    type: custom:my-card
    entity: light.kitchen
  </script>
</ha-embed-card>
```

Your card gets the same mocked `hass` object as the built-in cards, and `window.loadCardHelpers()` works for the [card helpers](/frontend/custom-ui/card/#card-helpers). When the script of your card is on another site than your page, that site needs to send CORS headers for it.

## Place cards anywhere on the page

A card does not have to be inside a provider. A card outside a provider uses the first provider on the page. Put one provider with all entities at the top of the page, and the cards anywhere below it, between your text. If the page has no provider, the card adds an empty one.

To use another provider, set the `provider` attribute of the card to the ID of that provider:

```html
<ha-embed-provider id="living-room">…</ha-embed-provider>

<ha-embed-card provider="living-room">…</ha-embed-card>
```

Set `provider` before the card is added to the page. The card picks its provider when it is added, and does not follow a later change.

## Light and dark

The cards follow the light or dark mode of the browser. When your site has its own switch for dark mode, set the `color-scheme` attribute of the provider to `light` or `dark`. The cards keep their styles inside, and do not change the styles of your page.

## Areas, calendars, and energy

Some cards need data that is not an entity. To set it, put an object in the script tag of the provider instead of the list. The object has the list in `entities`, and any of these keys:

- `areas`: a list of areas, each with an `area_id` and a `name`. Without it, each `area_id` of the entities becomes an area.
- `calendars`: the events of calendar entities, by entity ID. Each event has a `summary`, a `start`, and an `end`. Calendars without events here get sample events around today.
- `energy`: the energy settings, the same as the `energy/get_prefs` response. Without it, energy is not set up.

```yaml
entities:
  - entity_id: calendar.family
    state: "off"
    attributes:
      friendly_name: Family
areas:
  - area_id: kitchen
    name: Kitchen
calendars:
  calendar.family:
    - summary: Dentist
      start: "2026-11-02T15:30:00+00:00"
      end: "2026-11-02T16:15:00+00:00"
```

Weather entities get a forecast made up from their condition and temperature, or from their `forecast` attribute when they have one. Set `supported_features` to show forecasts.

## Change and watch entities from your page

The `entities` property of the provider replaces all entities. To change one entity, start from the current states in `provider.hass.states`:

```js
const provider = document.querySelector("ha-embed-provider");

provider.entities = Object.values(provider.hass.states).map(
  (entity) =>
    entity.entity_id === "sensor.outside_temperature"
      ? { ...entity, state: "18.1" }
      : entity
);
```

To use an action of an entity, call it. The provider updates the state and the cards:

```js
provider.hass.callService("switch", "toggle", {
  entity_id: "switch.coffee_maker",
});
```

The provider fires a `states-changed` event when the state of one or more entities changes. Its detail has `states`, the states of all entities by entity ID.

## What the mocked backend can do

The mocked backend only knows a part of the Home Assistant API. Keep these limits in mind when you pick what to show:

- The actions of lights, switches, climate, covers, fans, locks, media players, and more change the state of the entity.
- History and statistics are made up from the current state of each entity.
- Templates are not rendered. They come back as they are.
- The logbook is empty.
- Actions that open a dialog, like `more-info`, do nothing.
- Map cards only work on the demo site itself, not embedded on another site.
- Other requests get an error.

The mocks live in `demo/src/stubs/` of the [frontend repository](https://github.com/home-assistant/frontend). If your card needs a request they do not know, see [the gallery and the demo](/frontend/development/gallery-and-demo/#embed-cards-on-other-sites) for where to add it.

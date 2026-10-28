---
title: Custom strategies
description: Generate a whole dashboard, a view, or a section from code, and offer it in the dashboard editor.
order: 6
---

A [strategy](/glossary/strategy/) is code that writes a dashboard configuration. Instead of a list of cards, the dashboard says "use this strategy", and the strategy generates the cards from what is in the home, every time the dashboard loads. The **Overview** dashboard Home Assistant builds for you, the areas dashboard, the map, and the energy dashboard are all strategies.

There are three kinds:

- A **dashboard strategy** generates the whole dashboard, with all its views.
- A **view strategy** generates one view.
- A **section strategy** generates one section in a sections view.

They work together. A dashboard strategy often generates a list of views that each use a view strategy, so each view is only built when someone opens it.

## How a strategy works

A strategy is a custom element with a static `generate()` method. It gets the strategy configuration and `hass`, and returns the configuration of what it generates: a dashboard, a view, or a section.

The tag name decides the kind: `ll-strategy-dashboard-<name>`, `ll-strategy-view-<name>`, or `ll-strategy-section-<name>`. The `<name>` is what follows `custom:` in the configuration. Everything in the `strategy` section, including your own options, is passed to `generate()` as `config`.

Load your strategy as a [resource](/frontend/custom-ui/resources/), like a custom card.

The [built-in strategies](https://github.com/home-assistant/frontend/tree/dev/src/panels/lovelace/strategies) are good examples. The [map dashboard strategy](https://github.com/home-assistant/frontend/blob/dev/src/panels/lovelace/strategies/map/map-dashboard-strategy.ts) is a small one.

## A dashboard strategy

A dashboard strategy returns a whole dashboard configuration:

```js
class MyDemoDashboardStrategy extends HTMLElement {
  static async generate(config, hass) {
    const name = hass.config.location_name || "Home Assistant";

    return {
      title: config.title || "My demo dashboard",
      views: [
        {
          title: "Home",
          path: "home",
          cards: [
            { type: "markdown", content: `# Welcome to ${name}` },
            { type: "entities", entities: ["sun.sun"] },
          ],
        },
      ],
    };
  }
}

customElements.define(
  "ll-strategy-dashboard-my-demo",
  MyDemoDashboardStrategy
);
```

Use it as the configuration of a dashboard:

```yaml
strategy:
  type: custom:my-demo
  title: Generated dashboard
```

[Register it](#register-your-strategy) with `strategyType: "dashboard"`, and users can pick it under **Community dashboards** in the dialog to add a dashboard.

### Suggest a title and icon

A dashboard strategy can suggest the title and icon of the new dashboard with a static `getCreateSuggestions(hass)`. Users can still change both before they create it.

```js
static getCreateSuggestions(hass) {
  return { title: "My demo dashboard", icon: "mdi:view-dashboard" };
}
```

## A view strategy

A view strategy returns the configuration of one view. Use it in a view of any dashboard:

```yaml
views:
  - strategy:
      type: custom:my-area
      area: living_room
```

The view strategy below shows the entities of one area. The dashboard strategy above it creates a view with that view strategy for every area. `hass.areas`, `hass.devices`, and `hass.entities` hold the registries, so neither has to fetch anything.

```js
class MyAreaDashboardStrategy extends HTMLElement {
  static async generate(config, hass) {
    return {
      title: config.title || "Areas",
      views: Object.values(hass.areas).map((area) => ({
        title: area.name,
        path: area.area_id,
        strategy: { type: "custom:my-area", area: area.area_id },
      })),
    };
  }
}

class MyAreaViewStrategy extends HTMLElement {
  static async generate(config, hass) {
    const areaId = config.area;
    const areaDevices = new Set(
      Object.values(hass.devices)
        .filter((device) => device.area_id === areaId)
        .map((device) => device.id)
    );

    const cards = Object.values(hass.entities)
      .filter(
        (entity) =>
          entity.area_id === areaId ||
          (!entity.area_id && areaDevices.has(entity.device_id))
      )
      .map((entity) => ({ type: "tile", entity: entity.entity_id }));

    return { cards: [{ type: "grid", cards }] };
  }
}

customElements.define(
  "ll-strategy-dashboard-my-area",
  MyAreaDashboardStrategy
);
customElements.define("ll-strategy-view-my-area", MyAreaViewStrategy);
```

Both use the name `my-area`: one as a dashboard strategy, one as a view strategy. That is fine, because the kind is part of the tag name.

## A section strategy

A section strategy returns the configuration of one section, with its cards. Use it in a sections view, next to regular sections:

```yaml
views:
  - type: sections
    sections:
      - strategy:
          type: custom:my-domain
          domain: light
```

The section strategy below shows a tile for every registered entity of one domain, like all the lights:

```js
class MyDomainSectionStrategy extends HTMLElement {
  static async generate(config, hass) {
    const cards = Object.keys(hass.entities)
      .filter((entityId) => entityId.startsWith(`${config.domain}.`))
      .map((entityId) => ({ type: "tile", entity: entityId }));

    return { type: "grid", cards };
  }
}

customElements.define(
  "ll-strategy-section-my-domain",
  MyDomainSectionStrategy
);
```

[Register it](#register-your-strategy) with `strategyType: "section"`, and users can pick it under **Community sections** when they create a section and choose **Automatic section**. After they pick it, the section editor opens with your [settings](#settings).

### Show a preview

The dialog shows each section strategy as a tile with a live preview. To get one, add a static `getStubConfig(hass)` that returns a strategy configuration with good defaults. It can be async. The dialog passes it to `generate()` to render the preview, and the new section starts with it.

```js
static getStubConfig(hass) {
  return { type: "custom:my-domain", domain: "light" };
}
```

Include `custom:` in the `type`, like in the configuration. Without `getStubConfig()`, or when it throws, the tile shows no preview. Pick defaults that show something in most homes.

## Register your strategy

Register your strategy in `window.customStrategies`, and users can pick it in the dashboard editor without writing any YAML:

```js
window.customStrategies = window.customStrategies || [];
window.customStrategies.push({
  type: "my-demo",
  strategyType: "dashboard",
  name: "My demo dashboard",
  description: "A starter dashboard generated from JavaScript.",
  documentationURL: "https://example.com/my-demo-dashboard",
});
```

| Key | Required | Meaning |
| --- | --- | --- |
| `type` | Yes | The name of the strategy, without `custom:`. |
| `strategyType` | Yes | `"dashboard"` or `"section"`. |
| `name` | | The name in the dialog. |
| `description` | | A short description below the name. |
| `documentationURL` | | A link to your documentation. The frontend does not show it anywhere yet. |

View strategies can't be picked in the editor yet, so there is no need to register them.

The resource has to be loaded for the dialog to see it. After adding or updating it, reload the page and open the dialog again.

## When to generate again

A strategy runs when the dashboard loads. By default, it runs again when the entity, device, area, or floor registry changes, so a new device shows up without a reload. State changes don't trigger it.

To change that, add a static `registryDependencies` with the registries your strategy depends on: any of `entities`, `devices`, `areas`, `floors`, `labels`, and `panels`. Use an empty list for a strategy that never needs to run again. For full control, add a static `shouldRegenerate(config, oldHass, newHass)` that returns `true` when the strategy should run again.

```js
class MyDemoDashboardStrategy extends HTMLElement {
  static registryDependencies = ["areas"];

  static async generate(config, hass) {
    // ...
  }
}
```

## Settings

A strategy can have a visual editor for its options. Return an editor element from the static `getConfigElement()`. It works like a [card editor](/frontend/custom-ui/card-editor/#a-visual-editor-of-your-own): Home Assistant calls `setConfig()` with the strategy configuration and sets `hass`, and the editor fires `config-changed` with the new configuration.

Give every section strategy an editor: it is the first thing users see after they pick your section in the dialog. Without one, they only get a YAML editor.

```js
class MyDomainSectionStrategy extends HTMLElement {
  static getConfigElement() {
    return document.createElement("my-domain-strategy-editor");
  }

  static async generate(config, hass) {
    // ...
  }
}
```

A dashboard strategy has two more static options:

- `configRequired = true`: the strategy can't work without settings. Home Assistant shows the editor before it creates the dashboard.
- `noEditor = true`: the strategy has no settings to edit.

## Tips

- Keep `generate()` fast. It runs on every load, and the dashboard waits for it.
- `hass` already has the areas, devices, and entities, in a short form. For data it doesn't have, like the full entity registry entries, use `hass.callWS()`. Do that once, in the dashboard strategy, and pass the result to your view strategies through their configuration.
- A strategy can use any card, including your own custom cards.
- Write tests for strategies. They are pure functions from data to configuration, which makes them easy to test.

---
title: Card editor and picker
description: Give your custom card a visual editor, a sensible default configuration, and a place in the card picker and its suggestions.
order: 3
---

People expect to add and set up a card without writing YAML. Your custom card can take part in that: it can show up in the card picker, start with a working configuration, and have a visual editor.

## Show up in the card picker

Add an entry to `window.customCards` in your module:

```js
window.customCards = window.customCards || [];
window.customCards.push({
  type: "state-card-example",
  name: "State card",
  description: "Shows the state of one entity.",
  preview: true,
  documentationURL: "https://example.com/state-card",
});
```

| Key | Required | Meaning |
| --- | --- | --- |
| `type` | Yes | The tag name of your card, without `custom:`. |
| `name` | | The name in the picker. |
| `description` | | A short description below the name. |
| `preview` | | Show a live preview of the card in the picker. Defaults to `false`. |
| `documentationURL` | | Adds a help link to the card editor. |
| `getEntitySuggestion` | | Suggest your card for an entity. See below. |

Your cards appear in the picker in a section for community cards.

## A default configuration

When someone picks your card, Home Assistant asks the static `getStubConfig()` for a configuration to start with. Return it without the `type`:

```js
static getStubConfig(hass, entities, entitiesFallback) {
  const light = entities.find((id) => id.startsWith("light."));
  return { entity: light ?? "sun.sun" };
}
```

`entities` holds the entities that are not on the dashboard yet, and `entitiesFallback` the ones that are. Both leave out entities that are unavailable or unknown, so either list can be empty: keep a fallback, like `sun.sun` in the example. Without `getStubConfig()`, the card starts with only its type.

## Suggest your card for an entity

When someone picks an entity in the card picker, Home Assistant suggests cards for it. Your card can join those suggestions, in a section for community cards below the built-in ones, with `getEntitySuggestion` on its `window.customCards` entry:

```js
getEntitySuggestion: (hass, entityId) => {
  if (!entityId.startsWith("light.")) {
    return null;
  }
  return {
    config: { type: "custom:state-card-example", entity: entityId },
  };
},
```

Return `null` when your card does not fit the entity, one suggestion, or a list of them for several variants. A suggestion has:

- `config` (required): the configuration of the card, including the type with `custom:`.
- `label`: a short name for the variant, shown after the name of the card. Only set it when you return more than one.

Only suggest your card where it makes sense. Check the domain, the device class, or the supported features of the entity. A card suggested for every entity makes the picker noisy for everyone.

## A visual editor with a form

For most cards, a form is enough. Return a schema from the static `getConfigForm()`, and Home Assistant renders the form with the same controls as the built-in cards:

```js
static getConfigForm() {
  return {
    schema: [
      { name: "entity", required: true, selector: { entity: {} } },
      {
        type: "grid",
        name: "",
        schema: [
          {
            name: "name",
            selector: { entity_name: {} },
            context: { entity: "entity" },
          },
          {
            name: "icon",
            selector: { icon: {} },
            context: { icon_entity: "entity" },
          },
        ],
      },
      { name: "theme", selector: { theme: {} } },
    ],
    computeLabel: (schema) =>
      schema.name === "icon" ? "Special icon" : undefined,
    computeHelper: (schema) =>
      schema.name === "entity" ? "The entity to show" : undefined,
    assertConfig: (config) => {
      if (config.other_option) {
        throw new Error("'other_option' is not supported.");
      }
    },
  };
}
```

| Key | Required | Meaning |
| --- | --- | --- |
| `schema` | Yes | The fields of the form. |
| `computeLabel(schema, localize)` | | Returns the label of a field. Return `undefined` for the default: Home Assistant knows labels for common names like `entity`. |
| `computeHelper(schema, localize)` | | Returns a longer help text, shown below a field. |
| `assertConfig(config)` | | Called on every change. Throw an error to turn off the visual editor, for example when someone writes YAML the form can't show. The visual editor is available again once the error is gone. |

### Schema fields

A field has a `name`, the key in the configuration, and usually a `selector`. [Selectors](/glossary/selector/) are the same ones that blueprints and the automation editor use, like `entity`, `number`, `boolean`, `select`, `icon`, and `theme`. The [selectors documentation](https://www.home-assistant.io/docs/blueprint/selectors/) lists them all. Other options of a field:

- `required`: the field must have a value.
- `default`: the value when the field is left empty.
- `context`: links the field to another field. In the example, the icon selector shows the icon of the entity picked in the `entity` field.
- `visible`: show the field only under a condition, like `{ field: "mode", value: "advanced" }`.

Fields can be grouped:

- `type: "grid"` puts its `schema` side by side. Set `column_min_width`, like `"200px"`, to control when it wraps.
- `type: "expandable"` puts its `schema` in a section that opens and closes, with a `title`.

Both have a `name`, and a `flatten` option. With `flatten: true`, or an empty `name`, the values of the group go into the main configuration. Otherwise they go into a sub-object under that name. The full set of options is in [`src/components/ha-form/types.ts`](https://github.com/home-assistant/frontend/blob/dev/src/components/ha-form/types.ts).

### Entity names

The `entity_name` selector in the example lets people pick how the entity is named: by its own name, its device, area, or floor, or with their own text. Its value is exactly what `hass.formatEntityName()` accepts, so pass it straight through:

```js
const name = this._hass.formatEntityName(stateObj, this._config.name);
```

The selector has two options of its own:

- `entity_id`: a fixed entity to preview the names with, instead of the one from `context.entity`.
- `default_name`: the value shown while the field has no configured value (`undefined`). It takes the same shapes as the value: a string, one name item, or a list of them.

See the [hass object reference](/frontend/reference/hass-object/#formatentityname) for what it can do.

## A visual editor of your own

When a form is not enough, write your own editor element, and return it from the static `getConfigElement()`:

```js
static getConfigElement() {
  return document.createElement("state-card-example-editor");
}
```

Home Assistant calls `setConfig()` on the editor with the configuration, and sets `hass` on it, just like on a card. If your editor has a `lovelace` property, Home Assistant sets that too, with information about the dashboard. A plain element without that property doesn't get it. When the user changes something, fire a `config-changed` event with the complete new configuration:

```js
class StateCardExampleEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
  }

  set hass(hass) {
    this._hass = hass;
  }

  _changed(newConfig) {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: newConfig },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define(
  "state-card-example-editor",
  StateCardExampleEditor
);
```

When a card has both, `getConfigElement()` is used.

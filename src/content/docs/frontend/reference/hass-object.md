---
title: The hass object in the frontend
description: The properties, methods, and formatters of the hass object that every card, panel, and component gets.
order: 2
sidebarLabel: The hass object
---

The `hass` object holds the state of Home Assistant in the frontend, and the functions to talk to Core. Custom cards, badges, features, views, strategies, and panels all get it. The full type is `HomeAssistant` in [`src/types.ts`](https://github.com/home-assistant/frontend/blob/dev/src/types.ts).

A new `hass` object is made on every change, but parts that did not change keep their identity. Compare with `!==` to see whether something changed:

```js
if (newHass.states[entityId] !== oldHass.states[entityId]) {
  // This entity changed
}
```

To see what is in a live `hass` object, open it in the developer tools of your browser, as [Run the frontend](/frontend/development/run/#look-at-the-hass-object) shows.

Inside the frontend itself, leaf components use [contexts](/frontend/architecture/hass-and-contexts/) instead of `hass`.

## Properties

| Property | What it is |
| --- | --- |
| `states` | The states of all entities, keyed by entity ID. |
| `entities` | The entity registry, keyed by entity ID, with the fields the interface needs, like the name, icon, area, and device. |
| `devices` | The device registry, keyed by device ID. |
| `areas` | The area registry, keyed by area ID. |
| `floors` | The floor registry, keyed by floor ID. |
| `services` | The available [actions](/glossary/action/), by domain. |
| `config` | The configuration of Core: location, units, time zone, version, and loaded components. |
| `user` | The logged-in user, with `name`, `is_admin`, and `is_owner`. |
| `language` | The language of the interface. |
| `locale` | Number, date, and time format settings of the user. |
| `themes` and `selectedTheme` | The available themes, and the one in use. |
| `panels` | The registered panels. |
| `connection` | The WebSocket connection, from `home-assistant-js-websocket`. |
| `connected` | Whether the connection is up. |

A state object looks like this:

```json
{
  "entity_id": "light.ceiling",
  "state": "on",
  "attributes": {
    "brightness": 180,
    "friendly_name": "Ceiling",
    "supported_features": 32
  },
  "last_changed": "2026-10-10T13:46:59.129248+00:00",
  "last_updated": "2026-10-10T13:46:59.129248+00:00",
  "context": {
    "id": "01J9Z4V8M0R3XGQ2W4E5T6Y7U8",
    "parent_id": null,
    "user_id": null
  }
}
```

## Calling Core

All of these return a promise.

### callService

```js
hass.callService("light", "turn_on", { brightness_pct: 50 }, {
  entity_id: "light.kitchen",
});
```

Performs an [action](/glossary/action/). The arguments are the domain, the action, its data, and an optional [target](/glossary/target/). Two more optional arguments: `notifyOnError` (default `true`) shows a message when the action fails, and `returnResponse` asks for the response of actions that return data.

### callWS

```js
const areas = await hass.callWS({ type: "config/area_registry/list" });
```

Sends a WebSocket command and resolves with its result. Rejects with the error when Core sends one. To keep receiving updates, use `hass.connection.subscribeMessage()` instead. See [the data layer](/frontend/architecture/data/).

### callApi

```js
const result = await hass.callApi("GET", "history/period");
```

Calls the REST API under `/api/`, with the authentication of the user. The arguments are the method, the path, and optional data. New features use WebSocket commands. `callApiRaw()` does the same, but returns the raw `Response`.

### fetchWithAuth

Fetches any URL of Home Assistant with the access token of the user, and returns the `Response`.

### hassUrl

`hass.hassUrl("/api/camera_proxy/camera.front")` returns the full URL of a path on Home Assistant.

## Text

### localize

`hass.localize(key, values)` returns a translated string of the frontend, or of an integration whose translations are loaded. See [Translations in the frontend](/frontend/architecture/translations/).

### loadBackendTranslation

`hass.loadBackendTranslation(category, integrations)` loads translations from Core, like `"title"` or `"entity"`, and resolves with a `localize` function that knows them.

## Formatters

The formatters turn states, attributes, and names into text, in the language, number format, date format, time zone, and units of the user. Use them instead of showing raw values. Each takes a state object, like `hass.states["light.kitchen"]`.

### formatEntityState

```js
hass.formatEntityState(stateObj); // "On"
hass.formatEntityState(stateObj, "off"); // "Off"
```

Formats the state of the entity, or another state you pass as the second argument.

### formatEntityAttributeValue

```js
hass.formatEntityAttributeValue(stateObj, "current_temperature");
// "20.5 °C"
hass.formatEntityAttributeValue(stateObj, "current_temperature", 18);
// "18 °C"
```

Formats the value of an attribute, or another value you pass as the third argument.

### formatEntityAttributeName

```js
hass.formatEntityAttributeName(stateObj, "current_temperature");
// "Current temperature"
```

Formats the name of an attribute.

### Parts

`formatEntityStateToParts()` and `formatEntityAttributeValueToParts()` take the same arguments, and return the result in parts, each with a `type` of `value`, `unit`, or `literal`. Use them to style the number and the unit differently.

### formatEntityName

```js
hass.formatEntityName(stateObj, name, options);
```

Formats the name of an entity from its registry context: the entity, its device, the parent device, the area, and the floor. The built-in cards use it, so a custom card that does too names entities the same way. `name` can be:

- Left out: the friendly name of the entity.
- A string: returned as it is. Use this for a name the user typed.
- One name item, like `{ type: "entity" }`, or a list of them, joined with a space or the `separator` in `options`.

The item types are `entity`, `device`, `parent_device`, `area`, `floor`, and `text` with a `text` of your own. Items that resolve to nothing are left out.

For the temperature sensor of a thermostat called **Thermostat**, in the **Living room** on the **Ground floor**:

```js
hass.formatEntityName(stateObj);
// "Thermostat Temperature"
hass.formatEntityName(stateObj, { type: "area" });
// "Living room"
hass.formatEntityName(
  stateObj,
  [{ type: "device" }, { type: "entity" }],
  { separator: " · " }
);
// "Thermostat · Temperature"
hass.formatEntityName(stateObj, [
  { type: "text", text: "Floor:" },
  { type: "floor" },
]);
// "Floor: Ground floor"
```

`parent_device` is only filled in for entities of a sub-device, like one outlet of a power strip. That makes `[{ type: "parent_device" }, { type: "device" }, { type: "entity" }]` a safe choice for a full name: for an outlet it gives "Power strip Outlet 1 Switch", and for other entities the parent is left out. This list is also the default of the frontend for composed names.

To let users pick the name in a card editor, use the `entity_name` selector. Its value is what `hass.formatEntityName()` accepts, so pass the configuration straight through. See [Card editor and picker](/frontend/custom-ui/card-editor/#entity-names).

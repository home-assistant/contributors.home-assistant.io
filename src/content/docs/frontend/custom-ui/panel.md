---
title: Custom panels
description: Add a full page of your own to Home Assistant, with a link in the sidebar and live access to the state of the home.
order: 8
---

A [panel](/glossary/panel/) is a full page in Home Assistant, like a dashboard, the map, or the settings. A custom panel is your own page: a custom element that gets the same `hass` object as everything else, and fills the whole screen next to the sidebar. Integrations use them for their own interfaces, and users can add them in YAML.

## An example

Create `www/example-panel.js` in your configuration folder:

```js
class ExamplePanel extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  set narrow(narrow) {
    this._narrow = narrow;
    this._render();
  }

  set panel(panel) {
    this._panel = panel;
    this._render();
  }

  _render() {
    if (!this._hass || !this._panel) {
      return;
    }
    const count = Object.keys(this._hass.states).length;
    this.innerHTML = `
      <p>There are ${count} entities.</p>
      <p>The screen is ${this._narrow ? "" : "not "}narrow.</p>
      <pre>${JSON.stringify(this._panel.config, null, 2)}</pre>
    `;
  }
}

customElements.define("example-panel", ExamplePanel);
```

Then register the panel in `configuration.yaml`, and restart Home Assistant:

```yaml
panel_custom:
  - name: example-panel
    url_path: example
    sidebar_title: Example panel
    sidebar_icon: mdi:server
    module_url: /local/example-panel.js
    config:
      hello: world
```

The panel opens at `/example`, with a link in the sidebar.

## Configuration options

| Option | Meaning |
| --- | --- |
| `name` | The tag name of your element. Required. |
| `url_path` | The URL of the panel. Defaults to `name`. Must be unique. |
| `sidebar_title` | The text in the sidebar. Without it, the panel is not in the sidebar. |
| `sidebar_icon` | The icon in the sidebar. Defaults to `mdi:bookmark`. |
| `module_url` | The URL of your JavaScript module. Set this one, `js_url`, or both: without either, the panel is not registered. |
| `js_url` | The URL of a classic JavaScript file. When you set both, the legacy build of the frontend uses this one, and the modern build `module_url`. |
| `config` | Anything you want to pass to the panel. It shows up as `panel.config`, next to a `_panel_custom` key that Home Assistant adds with the panel settings. |
| `require_admin` | Only show the panel to administrators. Defaults to `false`. |
| `embed_iframe` | Render the panel in an iframe, isolated from the rest of the frontend. Defaults to `false`. |
| `trust_external_script` | Load a script from another host without asking. Defaults to `false`, and then users are asked to confirm, because the script gets full access to Home Assistant. |
| `handle_safe_area` | Set to `true` when your panel handles the safe areas of a phone screen, like the notch, itself. Home Assistant then doesn't add its own padding around the panel. Defaults to `false`. |

An integration registers a custom panel from Python with `async_register_panel()` from the `panel_custom` integration. It takes the same options, but a few have other names: `webcomponent_name` for `name`, `frontend_url_path` for `url_path`, and `trust_external` for `trust_external_script`.

## What a panel gets

Home Assistant sets these properties on your element:

| Property | What it is |
| --- | --- |
| `hass` | The full state of Home Assistant. Set again on every change. See the [hass object reference](/frontend/reference/hass-object/). |
| `narrow` | `true` when the panel should use a layout for narrow screens. |
| `route` | The current route: `prefix` is the URL of the panel, and `path` the rest of the URL. Use it for pages inside your panel. |
| `panel` | The panel information. The `config` option is in `panel.config`, together with the `_panel_custom` key. |

Your panel is responsible for its whole page, including a header and a way to open the sidebar on a narrow screen.

## Write standard classes

The frontend loads custom panels in both its modern and legacy builds. Define your element with a standard JavaScript class. Elements transpiled to ES5 functions are not supported.

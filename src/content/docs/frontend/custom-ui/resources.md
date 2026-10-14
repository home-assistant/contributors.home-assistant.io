---
title: Register resources
description: Make your JavaScript file available to Home Assistant and load it into every dashboard.
order: 1
---

Before a dashboard can use your card, badge, feature, view, or strategy, Home Assistant has to load its JavaScript. That takes two steps: serve the file, then register it as a resource.

## Serve the file

Create a folder called `www` in your Home Assistant configuration folder, next to `configuration.yaml`. Files in it are served at `/local/`, so `www/my-card.js` becomes `/local/my-card.js`.

Home Assistant only picks up the `www` folder at startup. If you just created it, restart Home Assistant once.

> [!WARNING]
> Files in `www` are served without authentication. Anyone who can reach your Home Assistant can download them. Don't put secrets there.

You can also load a resource from any other URL, like a file published by your project.

## Register it

Resources are managed in the UI by default:

1. Go to **Settings** > **Dashboards**.
2. In the top-right menu, select **Resources**.
3. Select **Add resource**, enter the URL, like `/local/my-card.js`, and choose **JavaScript module**.

Resources are loaded for all dashboards. After you change a resource, reload the page in your browser. Your browser may cache the old file: adding a version to the URL, like `/local/my-card.js?v=2`, forces a fresh copy.

### In YAML

To manage resources in YAML instead, set `resource_mode` to `yaml` in the `lovelace` section of `configuration.yaml`, and list them there:

```yaml
lovelace:
  resource_mode: yaml
  resources:
    - url: /local/my-card.js
      type: module
```

With `resource_mode: yaml`, the **Resources** page in the UI no longer manages them. After a change, run the `lovelace.reload_resources` [action](/glossary/action/), or restart Home Assistant, then reload the page in your browser.

## Resource types

| Type | Use for |
| --- | --- |
| `module` | A JavaScript module. Use this for everything new. |
| `css` | A stylesheet. |
| `js` | A classic JavaScript file, without `import` and `export`. Deprecated. |
| `html` | An HTML import. Deprecated, and no longer loaded by the frontend. |

The UI only offers `module` and `css` for a new resource. It shows `js` and `html` only for an existing resource that already has that type.

In safe mode, Home Assistant loads no resources at all, so custom cards don't show up there.

## Registering pickers

Some registrations only work once the resource is loaded: a card in the card picker, a feature in the feature picker, or a dashboard in the new dashboard dialog. If yours does not show up, check that the resource loads (look for errors in the browser console), then reload the page and open the dialog again.

---
title: Components and Lit
description: Web components, Lit, and the shared ha-* components that wrap Web Awesome. The building blocks of every screen.
order: 1
---

Every piece of the interface is a custom element: a class registered under a tag name, with its own template and styles in a shadow root. The frontend writes them with [Lit](https://lit.dev/), a small library that adds reactive properties and efficient templates to standard web components.

## A component

A typical component looks like this:

```ts
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";

@customElement("ha-example-row")
export class HaExampleRow extends LitElement {
  @property() public label?: string;

  @state() private _expanded = false;

  protected render() {
    if (!this.label) {
      return nothing;
    }

    return html`
      <button @click=${this._toggle}>${this.label}</button>
      ${this._expanded ? html`<slot></slot>` : nothing}
    `;
  }

  private _toggle() {
    this._expanded = !this._expanded;
  }

  static styles = css`
    :host {
      display: block;
      padding: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-example-row": HaExampleRow;
  }
}
```

- `@property()` is public API, set by whoever uses the element. `@state()` is internal. Changing either one schedules a render.
- `render()` returns a template. Lit only updates the parts of the DOM that changed.
- Styles are scoped to the component by the shadow root.
- The `HTMLElementTagNameMap` declaration gives other code the type of the element.

The [Lit documentation](https://lit.dev/docs/) covers the rest: lifecycle, directives, and reactive controllers.

## Naming

Tag names tell you where a component belongs:

- `ha-*`: shared Home Assistant components in `src/components/`, like `ha-button` or `ha-entity-picker`.
- `hui-*`: dashboard components in `src/panels/lovelace/`, like `hui-tile-card`. The prefix comes from the old name of dashboards, Lovelace, which still shows up in code.
- `dialog-*`: dialogs.
- `more-info-*` and `state-card-*`: the views of the more-info dialog and the state cards, one per domain.

## Shared components and Web Awesome

The shared components in `src/components/` are the building blocks of every screen: buttons, inputs, dialogs, pickers, and controls. Many of them, like `ha-button`, `ha-dialog`, `ha-dropdown`, `ha-switch`, `ha-slider`, and `ha-tooltip`, wrap a component from [Web Awesome](https://webawesome.com/). The frontend uses its own build of Web Awesome, `@home-assistant/webawesome`.

A wrapper extends the Web Awesome class, and adds the theme and the behavior Home Assistant needs:

```ts
import Button from "@home-assistant/webawesome/dist/components/button/button";

@customElement("ha-button")
export class HaButton extends Button {
  // Home Assistant variants, styles, and theme variables
}
```

Always use the `ha-*` element, never the Web Awesome element directly. The wrapper is where the theme, the translations, and fixes for Home Assistant live, and it is what keeps every screen consistent.

The frontend no longer uses Material Web Components (`mwc-*`). Don't add them back. Some `--mdc-*` CSS properties are still read for theming, but new code uses the `--ha-*` ones.

Each shared component has a page in the [Design area](/design/components/), with usage guidance, live examples, and its attributes. Look there before you build something new.

## Mixins and controllers

Some behavior is shared through mixins and reactive controllers instead of base classes:

- `SubscribeMixin` from `src/mixins/subscribe-mixin.ts` manages WebSocket subscriptions for a component. See [the data layer](/frontend/architecture/data/).
- `DialogMixin` from `src/dialogs/dialog-mixin.ts` handles opening and closing for new dialogs.
- `src/common/decorators/` has decorators to consume contexts, like `@consume` and `@consumeEntityState`, and to transform them, like `@transform`. See [the hass object and contexts](/frontend/architecture/hass-and-contexts/).

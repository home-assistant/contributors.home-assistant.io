---
title: Coding guidelines
description: How frontend code is written, from TypeScript and Lit to events, dialogs, styling, and text. What reviewers look for in every pull request.
order: 4
---

These are the conventions of the [frontend repository](https://github.com/home-assistant/frontend). Linters enforce some of them. The rest is what reviewers ask for, so following them saves you a round of review.

## TypeScript

- TypeScript runs in strict mode. Avoid `any`: use the existing Home Assistant types, or write a narrow one.
- Use `import type` for imports that are only types. ESLint enforces it.
- Shape types after the source that owns the data, like the WebSocket command in Core, not after how one component happens to use it.
- Put a shared type in the data module that owns it, under `src/data/`, and import it from there.
- Don't use `console` in production code. Show the user an error, or use the existing logging.

## Lit components

- Elements are named with a prefix: `ha-` for shared Home Assistant components, `hui-` for dashboard ("Lovelace") components, and `dialog-` for dialogs.
- Use `@property()` for the public API of a component and `@state()` for its internal state.
- The project uses Lit's TypeScript decorators with `useDefineForClassFields: false`. Match the existing declarations. Don't use the `accessor` keyword.
- Use `@query()` for elements in your own template, instead of querying the DOM by hand.
- Compute cheap values in `render()`. Use `willUpdate()` for values that other lifecycle steps need, and `memoizeOne` only when it saves real work.
- In lifecycle methods, type the changed properties as `PropertyValues<this>`, or plain `PropertyValues` when you read private properties.

## Data access

Leaf components consume the narrowest [Lit context](/frontend/architecture/hass-and-contexts/) that covers what they read, instead of taking the whole `hass` object. A component that reads `hass` rerenders on every state change in the home, even when nothing it shows changed. Containers that own `hass` and pass it on may keep it.

Import `consume` from `src/common/decorators/consume`, not from `@lit/context`. ESLint enforces that too.

## Events

- Fire events with `fireEvent()` from `src/common/dom/fire_event.ts`. Events bubble and cross shadow roots by default.
- Declare every custom event and its detail type by extending the `HASSDomEvents` interface, so `fireEvent()` checks the payload.
- Type event handlers with the helpers from the same file: `HASSDomEvent<T>` for the `detail`, `HASSDomCurrentTargetEvent<T>` to read the element the listener is on, `HASSDomTargetEvent<T>` for the element that fired it. Use `ValueChangedEvent<T>` from `src/types.ts` for `value-changed`.

```ts
fireEvent(this, "item-selected", { id: item.id });

declare global {
  interface HASSDomEvents {
    "item-selected": { id: string };
  }
}
```

## Components to use

Build with the shared components in `src/components/` before you write your own. Many of them, like `ha-button`, `ha-dialog`, `ha-switch`, and `ha-tooltip`, wrap [Web Awesome](https://webawesome.com/) components. Don't add `mwc-*` Material components: the frontend no longer uses them.

- **Dialogs**: use `ha-dialog` with the `DialogMixin` from `src/dialogs/dialog-mixin.ts`. Open a dialog by firing `show-dialog` with the tag, an import function, and the parameters. Put actions in `ha-dialog-footer`, in the `primaryAction` and `secondaryAction` slots.
- **Buttons**: `ha-button` has a `variant` (`brand`, `neutral`, `danger`, `warning`, `success`), an `appearance` (`accent`, `filled`, `outlined`, `plain`), and a `size`. Use `appearance="plain"` for cancel, and `variant="danger"` for destructive actions.
- **Forms**: `ha-form` renders a form from a schema of [selectors](/glossary/selector/). Use `computeLabel`, `computeHelper`, and `computeError` to give it translated text.
- **Messages**: `ha-alert` with `alert-type` `error`, `warning`, `info`, or `success`.
- **Keyboard shortcuts**: `ShortcutManager` from `src/common/keyboard/shortcuts.ts`.

Each component has a page in the [Design area](/design/components/) that explains when to use it and how.

## Styling

- Use the theme variables and [design tokens](/frontend/architecture/theming/), never hardcoded colors. Use the `--ha-space-*` tokens for spacing.
- Scope styles to the component. Don't rely on global styles for the inside of a component.
- Design for mobile first, then add what wider screens need.
- Keep layouts right-to-left safe. Prefer logical properties, like `margin-inline-start` over `margin-left`.
- Make touch targets big enough, and give every control clear hover, focus, active, and disabled states.
- Keep motion subtle, and use the `--ha-animation-duration-*` tokens. They respect the reduced motion setting.

## User-facing text

- Every string people see goes through the translation system. Add it to `src/translations/en.json`, and use `localize` in the code. [Translations in the frontend](/frontend/architecture/translations/) shows how.
- Use whole sentences with placeholders. Never glue translated fragments together.
- Write in American English, in sentence case, in the active voice. Write "Home Assistant" in full.
- Use "Remove" for something that can be added back, and "Delete" for something that is gone for good. Use "Add" for something that exists, and "Create" for something new.

The [UI text](/design/ui-text/) section of the Design area has the complete guidance.

## States and cleanup

- Handle loading, error, unavailable, and missing entities. Check that an entity exists before you read from it.
- Remove event listeners, timers, observers, and subscriptions when the component disconnects.
- Make every control usable with a keyboard and a screen reader.

## Commits and dependencies

A pre-commit hook runs ESLint, Prettier, and the Lit analyzer on the files you commit, and fixes what it can. Only edit English text, in `src/translations/en.json`. The other languages are translated in [Lokalise](/glossary/lokalise/) and downloaded at build time, and the hook refuses commits that change those downloaded files.

Keep dependency updates in their own pull request.

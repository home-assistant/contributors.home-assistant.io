---
applyTo: "src/components/**,src/layouts/**,src/lib/**,src/pages/**,src/styles/**,scripts/**,demo-runtime/**,astro.config.ts,src/content.config.ts"
---

# Reviewing the site code

The site rules are in `.github/copilot-instructions.md` ("The tech behind the website") and `README.md`. For an in-depth review, follow the `review` skill in `.github/skills/review/`. Flag these, with the line:

## Accessibility

- An interactive element without an accessible name, at every viewport. A label hidden on a phone still needs a name there.
- A control that is not reachable or usable with the keyboard, or focus that is lost or trapped after it opens or closes something.
- A missing visible focus style. Use `--site-focus`.
- Text contrast below 4.5:1 (3:1 for large text and UI parts). Calculate it after `opacity` and blending, in light and dark, not from the token alone.
- Generated HTML with duplicate `id`s, or a visual heading that is not a heading element.
- A popup or tooltip that closes when you move the pointer toward it.

## Styling

- `rem` or `em` sizes in site CSS. The site uses px, because the demos set the root font size (see `src/styles/global.css`).
- Raw `--ha-*` color tokens or hard-coded colors in components. Use the `--site-*` aliases from `src/styles/global.css`. Spacing, radii, and shadows have no alias for most values: `--ha-space-*`, `--ha-border-radius-*`, and `--ha-box-shadow-*` are fine.
- Styles that only work in one theme. Check light, dark, and the system setting.
- Layout that breaks at a breakpoint combined with another state: a collapsed sidebar on a tablet, a long title on a phone.

## Behavior

- A comment that promises behavior the code does not deliver: a fallback, "only loads", "a specific commit", "never". The comment and the code must agree.
- State transitions that were not handled: repeated activation, overlapping requests, theme changes after load, blocked `localStorage`.
- A new request to an external service at runtime. Fonts, search, and scripts are served by the site itself. The only outside call is the analytics in `src/components/PlausibleAnalytics.astro`.
- A UI framework. Interactive parts are small web components or native elements like `<dialog>` and `<details>`.
- An `is:inline` script that grows beyond a few lines. Move it to a module.

## Generated files

- A hand edit to a generated file. Edit the generator, run it, and commit the output:
  - `src/styles/tokens.css`: `pnpm tokens`
  - `public/components/`, `public/static/`: `scripts/build-components.ts`, `pnpm components`
  - `src/content/docs/apps/bashio/` (all but `index.md`): `scripts/bashio/`, `pnpm bashio`
  - `public/_redirects`, `public/redirect-fragments.json`: `redirects/`, built by `pnpm redirects`
- A new component used in a `<Demo>` that is not in `COMPONENTS` or `EXTRA_ELEMENTS` of `scripts/build-components.ts`.
- A change to `PATCHES` in `scripts/build-components.ts` that no longer makes the build fail when a pattern stops matching.

## Checks and docs

- A change that `pnpm check`, `pnpm structure`, or `pnpm links` would catch, or that weakens one of those checks.
- A new script, generator, or maintenance step without a row in the "Scripts" table of `README.md`.
- A new front matter field in `src/content.config.ts` that is not described in `.github/copilot-instructions.md`.
- Em dashes or en dashes in code comments. Comments explain why, in plain American English.

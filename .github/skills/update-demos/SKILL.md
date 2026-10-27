---
name: update-demos
description: Use this to rebuild the live frontend component demos of the Home Assistant contributors website from a newer frontend, to add a component to the demos, or to fix the build when a frontend change breaks it.
---

# Update the demos

The Design pages show real frontend components, bundled from the [frontend](https://github.com/home-assistant/frontend) source by `scripts/build-components.ts`. The bundle is committed in `public/components/` and `public/static/`, so building the site never needs the frontend. This skill rebuilds that bundle. How the parts fit together is in "Live demos" in `README.md`.

Never edit files in `public/components/` or `public/static/` by hand. They are generated.

A workflow, `.github/workflows/update-demos.yml`, rebuilds the demos from the frontend `dev` branch every Monday, and opens or updates a pull request labeled `demos`. The header of that workflow has the details, and the repository settings it needs. When that pull request is open, review it with step 4 below instead of building again. Run this skill by hand to build another commit, to add a component, or when the workflow fails.

## 1. Get the frontend

You need a frontend checkout next to this repository, at the commit you want to build, with its dependencies installed for that commit:

```shell
git -C ../frontend fetch origin dev
git -C ../frontend checkout origin/dev
pnpm --dir ../frontend install
```

The script exports the commit to a temporary folder, but takes `node_modules` from the checkout. So install at the same commit. The script warns when the lockfile of the commit differs from the checkout's, and records it as `lockfileMatchesCheckout` in `public/components/manifest.json`. A bundle with `false` there was built with other dependencies than its commit: build it again after a fresh install.

## 2. Check before you build

```shell
pnpm components --check
```

This type-checks `demo-runtime/` against the commit, and checks that every patch in `PATCHES` matches exactly once. It needs no token, takes under a minute, and changes nothing in `public/`.

When it fails:

- **A type error in `demo-runtime/`**: the frontend changed an API the fake Home Assistant uses. Fix `demo-runtime/` to match the frontend. `pnpm check:demos` runs only this part.
- **A patch that matches 0 times, or more than once**: the frontend changed the code a patch rewrites. Find the new code in the file the error names, read it on the frontend `dev` branch, and update the `pattern` (and the `replacement`, if needed) in `PATCHES` of `scripts/build-components.ts`. Keep the rule that a patch matches exactly once. Never make a patch optional to get the build through: a bundle with an unpatched worker or import fails in the browser, not in the build.

Run `pnpm components --check` again until it passes.

## 3. Build

Log in to the GitHub CLI (`gh auth login`), or set `GITHUB_TOKEN`. Without a token, the demos get the frontend strings, but no translations of integrations.

```shell
pnpm components
```

Build another commit with `--ref <branch, tag, or commit>`, or another checkout with `--from <path>`. The script builds in temporary folders, and only replaces `public/components/` and `public/static/` when everything worked. A failed run leaves the previous demos in place.

Check `public/components/manifest.json`: the commit, the ref, `lockfileMatchesCheckout`, and the translations artifact.

## 4. Check every demo in the browser

A build that passes can still show broken demos. Find the pages with demos:

```shell
grep -rlE '<Demo|<DoDont' src/content/docs/
```

Run `pnpm dev`, and open each of them. For each demo:

- It renders, without errors in the browser console.
- It looks right in the light and the dark theme. Switch the theme of the site after the page loaded too: the demos must follow.
- It works with the keyboard, and at phone width.
- Pickers and forms in `<Demo hass>` show the devices and entities of the fake home.
- The specs and behavior on the page still match what the component does. A frontend change can make a page wrong without breaking the demo. Fix the page, or list it in the pull request.

Then compare the "In code" sections of the pages with the frontend you built from:

```shell
pnpm check:component-docs --ref <the commit in public/components/manifest.json>
```

Fix what it lists under "Documented, but not in the source", with the [`design-component-page` skill](../design-component-page/SKILL.md), or list it in the pull request. A weekly workflow also keeps an issue labeled `area: design` with this list.

Then run the site checks:

```shell
pnpm check
pnpm build
pnpm links
```

## 5. Commit together

Commit `public/components/`, `public/static/`, and any change to `demo-runtime/` and `scripts/build-components.ts` in one pull request. Mention the frontend commit from the manifest.

## Add a component

1. Add its path to `COMPONENTS` in `scripts/build-components.ts`: the path in `src/components/` of the frontend, without the extension. Components that need Home Assistant go at the end of the list, under the comment that says so. Elements from outside `src/components/` go in `EXTRA_ELEMENTS`, with their path from the root of the frontend.
2. If a demo needs a device or an entity the fake home does not have, add it to `demo-runtime/demo-home.ts`.
3. Run steps 2 to 5 above.
4. Use it in a `<Demo>`. See the [`design-component-page` skill](../design-component-page/SKILL.md).

Watch the size. A component can pull in a large part of the app through its imports. Compare the total size the script prints at the end with the previous run, and look at what the new chunk imports when it jumps.

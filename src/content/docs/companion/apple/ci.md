---
title: Apple continuous integration
description: The GitHub Actions workflows of the Apple project. What runs on your pull request, after a merge, and on a schedule.
sidebarLabel: Continuous integration
order: 7
source: https://github.com/home-assistant/iOS/tree/main/.github/workflows
lastVerified: 2026-10-14
---

The Apple project uses GitHub Actions together with Fastlane for linting, testing, building, translations, and distribution. CI checks more than whether the code compiles: style, strings, and coverage are part of the review too.

## On your pull request

The `ci.yml` workflow runs on every pull request and every push to `main`.

**Lint** runs on Linux, so it is fast: Yamllint, RuboCop, SwiftLint, and SwiftFormat. See [code style](/companion/apple/code-style/).

**Test** runs on macOS with the current Xcode. It resolves the Swift packages and runs `bundle exec fastlane test`. It uploads:

- Code coverage.
- The test results and logs.
- A simulator build of the app, `ios-simulator`, which you can use to [test frontend changes](/companion/apple/get-started/#only-testing-the-frontend) without building the app.

**Patch coverage** checks that at least 90% of the lines you changed are covered by tests. See [patch coverage](/companion/apple/testing/#patch-coverage).

Two more checks look at your diff. On pull requests from a branch in the repository itself, they leave a comment when they find something:

- A new `swiftlint:disable` in your diff.
- Localized strings that are no longer used, found by `Tools/detect_unused_strings.py`. The comment lists the keys, ready for the **Lokalise: Delete Keys** workflow, which deletes them from Lokalise and opens a pull request that removes them from the app.

## Other workflows

| Workflow | Runs | Does |
| --- | --- | --- |
| `distribute.yml` | On every push to `main`, or manually by a maintainer | Builds and signs the iOS and Mac apps, and uploads them to App Store Connect. See [releases](/companion/apple/releases/) |
| `tag_macos_release.yml`, `release_macos.yml` | Manually, or on a `release/*/*` tag | Publish a Mac build as a GitHub release |
| `e2e.yml` | Daily at 05:00 UTC, or manually | Runs the [end-to-end test](/companion/apple/testing/#end-to-end-test) against a real Home Assistant |
| `push_ci.yml` | On changes to `Sources/PushServer` | Runs `swift test` for the push server |
| `push_deploy.yml` | Manually | Builds the push server image and publishes it to the GitHub Container Registry |
| `download_localized_strings.yml` | Daily at 06:00 UTC, or manually | Uploads new strings to Lokalise, downloads the translations, and opens a pull request |
| `delete_lokalise_keys.yml`, `auto_delete_unused_strings.yml` | Manually | Delete unused strings from Lokalise and the app |
| `update_frontend_colors.yml`, `update_brand_icons.yml`, `update_material_design_icons.yml` | Weekly, or manually | Regenerate the frontend colors, brand icons, and Material Design Icons, and open a pull request when they changed |
| `set_version.yml` | Manually | Updates the version in `Configuration/Version.xcconfig` and opens a pull request |

The macOS runners have no Docker, so the end-to-end test installs Home Assistant with pip, in a virtual environment on the runner. By default, it installs Core from its `dev` branch. A manual run can pick the latest release or a specific version from PyPI instead.

---
title: Development workflow
description: How code gets from your machine into a Home Assistant release. The environment, the tools, the checks, and the review process.
order: 2
sidebarGroups:
  - Write code
  - Pull requests
  - Changing behavior
---

Every change to Home Assistant Core follows the same path. You write code in a development environment, the tests and linters check it, you open a pull request against the `dev` branch, someone reviews it, and once it is merged, it ships in the first monthly release whose beta is cut from `dev` after that.

This section covers that path. It applies to everything in core, from a one line fix to a new integration.

## Write code

- [Development environment](/core/development/environment/): the development container, or a manual setup on Linux, macOS, or Windows.
- [Code style](/core/development/style/): formatting, docstrings, logging, and the conventions reviewers look for.
- [Type hints](/core/development/typing/): how core uses mypy, and how to opt in to strict checking.
- [Running the tests](/core/development/testing/): pytest, coverage, snapshots, and what CI runs.
- [Writing tests](/core/development/tests/): how the tests of an integration are organized, with fixtures, mocks, and snapshots.
- [Linters, hassfest, and CI](/core/development/checks/): the checks that run on every commit and every pull request.
- [Validating input](/core/development/input-validation/): schemas for config flows, actions, and YAML.

## Pull requests

- [Development checklist](/core/development/checklist/): what to check before you commit.
- [Submitting a pull request](/core/development/submitting/): branches, commits, the template, and scoping your change.
- [After you open a pull request](/core/development/review-process/): what happens next, and how to speed it up.
- [Keeping your branch up to date](/core/development/catching-up/): bringing in the latest changes from `dev`.
- [Reviewing pull requests](/core/development/reviewing/): what to look for when you review someone else's work.
- [Tips and tricks](/core/development/tips/): smaller things that make your life easier.

## Changing behavior

- [Deprecating](/core/development/deprecating/): how to remove or change something without breaking people's homes overnight.
- [Versioning](/core/development/versioning/): how Home Assistant versions are built up.
- [Labs preview features](/core/development/labs/): ship a feature people can opt into before it becomes standard.

## The short version

If you only remember one thing from this section: keep pull requests small. One fix, one feature, or one refactor per pull request. Small pull requests get reviewed faster, break less, and are easier for everyone, including you.

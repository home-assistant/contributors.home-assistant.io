---
title: Linters, hassfest, and CI
description: The checks that run on every commit and every pull request to Home Assistant Core, and how to run them yourself.
sidebarGroup: Write code
order: 5
---

Before your code is reviewed, machines look at it. Linters check the style, mypy checks the types, hassfest checks the metadata of integrations, and CI runs it all again, plus the tests. Run them yourself first: a pull request with failing checks is not reviewed.

## The Git hooks

`script/setup` installs Git hooks with [prek](https://prek.j178.dev/), a fast drop in for pre-commit. They run on the files you change, every time you commit. When a hook fixes something, like the formatting, the commit stops: add the changed files and commit again.

The hooks are configured in `.pre-commit-config.yaml`. They include:

- **Ruff**: lints the code and formats it.
- **codespell**: catches common spelling mistakes.
- **yamllint** and **Prettier**: check and format YAML and JSON files.
- **mypy**: checks the [type hints](/core/development/typing/).
- **pylint**: runs the extra checks written for Home Assistant.
- **gen_requirements_all**: updates the requirement files when a `manifest.json` changes.
- **hassfest**: validates integrations and updates generated files.
- **no-commit-to-branch**: stops you from committing to `dev` directly. Work on a branch.

To run all hooks on all files:

```shell
prek run --all-files
```

To run them on your changes only, and see what they changed:

```shell
prek run --show-diff-on-failure
```

In Visual Studio Code, that is the **Prek** task. You can also run a linter on a single file, like `ruff check homeassistant/components/example/sensor.py` or `pylint homeassistant/components/example`.

> [!IMPORTANT]
> The hooks can change files outside your integration, like `CODEOWNERS`, `requirements_all.txt`, or files in `homeassistant/generated/`. These changes belong in your pull request.

## Hassfest

Hassfest is the validator for integrations. It reads the files around your code, like `manifest.json`, `strings.json`, `services.yaml`, `icons.json`, and `quality_scale.yaml`, and checks that they are complete and consistent. It also generates files from them, like `CODEOWNERS` and the lists in `homeassistant/generated/` of config flows, discovery information, and more.

Run it after you change any of those files:

```shell
python3 -m script.hassfest
```

To check one integration only, which is faster:

```shell
python3 -m script.hassfest --integration-path homeassistant/components/example
```

Use `-p` to run only some of its plugins, like `-p mypy_config` after you change `.strict-typing`.

Use `--skip-plugins` to leave some out. A new integration starts with every rule in `quality_scale.yaml` set to `todo`, and the `quality_scale` plugin reports that as an error until every Bronze rule is `done` or `exempt`. Hassfest only writes the generated files when it finds no errors, so while you are still working on those rules, run it like this:

```shell
python3 -m script.hassfest --skip-plugins quality_scale
```

The scaffold script does the same for a new integration. Before you open your pull request, run hassfest once more without skipping anything.

## Pylint

Next to the standard checks, core has its own pylint plugin, in `packages/pylint-home-assistant/`. Its checks cover patterns Ruff cannot see, because they need type inference or read other files, like `manifest.json` and `quality_scale.yaml`. Many of them check the rules reviewers used to point out by hand. The [README of the plugin](https://github.com/home-assistant/core/blob/dev/packages/pylint-home-assistant/README.md) explains every check.

If pylint is wrong about your code, and only then, disable the check for that one line, with the name of the check rather than its code:

```python
hass.data[DOMAIN] = data  # pylint: disable=home-assistant-use-runtime-data
```

Reviewers will ask why, so be ready to explain it.

## CI

When you open a pull request, GitHub Actions runs the CI workflow. It runs the hooks, hassfest, pylint, and mypy, checks the requirements and the licenses of new dependencies, and runs the tests on every supported Python version. For a change to one integration, it only runs the tests of that integration. A change to core itself runs the full suite.

If your GitHub account is new, CI on your first pull request does not start until a maintainer approves it. That is a security measure, not a judgment of your code.

If CI fails because of your change, convert your pull request to a draft, fix it, and mark it ready again. Some tests are flaky. If you are sure a failure has nothing to do with your change, say so in the pull request and wait for a maintainer. Do not keep restarting the run.

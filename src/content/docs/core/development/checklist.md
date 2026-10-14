---
title: Development checklist
description: Check your change against this list before you commit, so your pull request is ready for review.
sidebarGroup: Pull requests
order: 1
---

Go through this list before you commit. The pull request template asks you to confirm it, and reviewers check it.

## Code

- [ ] The code is formatted with Ruff (`ruff format`), and the [Git hooks](/core/development/checks/) pass.
- [ ] The tests pass, and new code has [tests](/core/development/tests/).
- [ ] There is no commented out code.
- [ ] You understand every line, and you can explain it. This also applies to code an AI tool wrote for you.
- [ ] If a module is fully typed, it is listed in `.strict-typing`.

## Libraries and requirements

All communication with devices and services goes through a Python library published on [PyPI](https://pypi.org/). The integration itself contains no protocol code.

- [ ] The library has a source distribution on PyPI, not only prebuilt wheels.
- [ ] The source of the library is public, under an OSI-approved open source license that is compatible with Apache 2.0, the license of core. CI checks that every requirement has an OSI-approved license, with `script/licenses.py`. Compatibility with Apache 2.0 is checked by [reviewers](/core/development/reviewing/).
- [ ] The issue tracker of the library is enabled.
- [ ] New or updated requirements are in `requirements_all.txt`. Run `python3 -m script.gen_requirements_all` to update it.

If you maintain the library mainly for Home Assistant and you own the integration, consider an issue template picker that points users to the [core issue tracker](https://github.com/home-assistant/core/issues), like [zwave-js-server-python](https://github.com/home-assistant-libs/zwave-js-server-python/issues/new/choose) does.

## Metadata

- [ ] The `manifest.json` is complete and correct.
- [ ] New integration owners are in `CODEOWNERS`. Run `python3 -m script.hassfest` to update it.
- [ ] Everything the user sees is in `strings.json`, not in the code. See [making strings translatable](/translate/guides/developers/).

## Users

- [ ] Anything that removes or changes existing behavior follows the [deprecation process](/core/development/deprecating/).
- [ ] Backward-incompatible changes are described in the pull request, for the people who use Home Assistant.
- [ ] If users can see the change, the documentation on [home-assistant.io](https://www.home-assistant.io/) is updated in a pull request of its own. See [writing documentation](/writing/).

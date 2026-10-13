---
title: Test more than 95% of the code
description: "Silver rule test-coverage: the tests cover more than 95% of every module of the integration."
sidebarLabel: test-coverage
sidebarGroup: Silver
order: 10
---

This is a Silver rule. In `quality_scale.yaml`, it is called `test-coverage`.

The tests of the integration must cover more than 95% of the code, in every module of the integration.

## Why it matters

Nobody in the project owns every device that Home Assistant supports. When someone changes shared code, or bumps the library of your integration, the tests are the only thing that notices what broke. Good coverage keeps regressions out, and lets new contributors change the integration with confidence, without the device on their desk.

## Example

Run the tests of the integration with coverage, and look at the lines that are not covered:

```shell
pytest tests/components/my_integration \
  --cov=homeassistant.components.my_integration \
  --cov-report term-missing
```

The report lists every module with its coverage, and the line numbers that no test runs. Write tests through the way Home Assistant uses the integration: set up a config entry, then check states and call actions, instead of calling functions of the integration directly. See [writing tests](/core/development/tests/) for how to write those tests.

## How it is checked

- CI runs the tests with coverage on every pull request, and Codecov reports the coverage of the change in the pull request.
- Codecov requires every changed line to be covered in some modules, like `config_flow.py` and `diagnostics.py`.
- Whether every module of the integration is above 95% is checked in review.

## Exceptions

There are no exceptions to this rule.

## Related rules

- [config-flow-test-coverage](/core/quality-scale/config-flow-test-coverage/): test the config flow fully.

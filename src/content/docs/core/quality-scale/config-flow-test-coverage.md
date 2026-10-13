---
title: Test the config flow fully
description: "Bronze rule config-flow-test-coverage: the config flow has full test coverage, including recovery from errors."
sidebarLabel: config-flow-test-coverage
sidebarGroup: Bronze
order: 6
---

This is a Bronze rule. In `quality_scale.yaml`, it is called `config-flow-test-coverage`.

The tests cover 100% of `config_flow.py`. Every error the flow can show has a test, and that test then fixes the cause and finishes the flow, to prove the user can recover. Tests that create an entry also check its unique ID. The rule covers every flow in the file: the user flow, discovery, import, reauthentication, reconfiguration, and options.

## Why it matters

The config flow is the first thing a user sees of your integration. If it breaks, nobody gets past setup. Most maintainers do not own the device of every integration they touch, so the tests are what tells them a change did not break setup.

Testing recovery matters as much as testing the error. A flow that shows "cannot connect" but then stays stuck, even after the user fixed the problem, is a broken flow. And asserting the unique ID makes sure that a change in how it is derived does not go unnoticed: that would break duplicate detection for every existing user.

Writing these tests is also a good way into testing in core. Once the config flow is covered, testing the rest of the integration is a smaller step. See [writing tests](/core/development/tests/).

## Example

A happy path test runs the user flow from start to finish, and checks the created entry, including its unique ID:

```python
async def test_full_flow(
    hass: HomeAssistant,
    mock_my_client: AsyncMock,
    mock_setup_entry: AsyncMock,
) -> None:
    """Test the full user flow."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_HOST: "192.168.1.2"}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "My device"
    assert result["data"] == {CONF_HOST: "192.168.1.2"}
    assert result["result"].unique_id == "ABC123"
```

An error test makes the client fail, checks the error, then lets the client work again and finishes the flow:

```python
@pytest.mark.parametrize(
    ("exception", "error"),
    [
        (MyConnectionError, "cannot_connect"),
        (MyAuthenticationError, "invalid_auth"),
        (Exception, "unknown"),
    ],
)
async def test_flow_errors(
    hass: HomeAssistant,
    mock_my_client: AsyncMock,
    mock_setup_entry: AsyncMock,
    exception: Exception,
    error: str,
) -> None:
    """Test errors in the user flow, and recovery."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )

    mock_my_client.get_data.side_effect = exception
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_HOST: "192.168.1.2"}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": error}

    mock_my_client.get_data.side_effect = None
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_HOST: "192.168.1.2"}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
```

A reauthentication or reconfigure test starts from an existing entry. Add a `MockConfigEntry` with `entry.add_to_hass(hass)`, then start the flow with `await entry.start_reauth_flow(hass)` or `await entry.start_reconfigure_flow(hass)`. The test finishes when the flow aborts with `reauth_successful` or `reconfigure_successful`.

Do not forget the duplicate check. The happy path usually runs through the code of [unique-config-entry](/core/quality-scale/unique-config-entry/), but add a test that tries to set up the same device twice and expects the flow to abort with `already_configured`.

## How it is checked

- Codecov requires 100% coverage of the changed lines in `config_flow.py` on every pull request.
- Pylint warns when a happy path test in `test_config_flow.py` creates an entry without checking its unique ID (`home-assistant-tests-config-flow-unique-id`).
- Pylint warns when a test in `test_config_flow.py` shows an error, but never finishes the flow afterward (`home-assistant-tests-config-flow-error-recovery`).
- The tests of core fail when a flow shows a translation key that is missing from `strings.json`.

## Exceptions

There are no exceptions to this rule.

## Related rules

- [config-flow](/core/quality-scale/config-flow/): set up from the UI with a config flow.
- [test-before-configure](/core/quality-scale/test-before-configure/): test the connection in the config flow.
- [unique-config-entry](/core/quality-scale/unique-config-entry/): prevent duplicate config entries.
- [discovery](/core/quality-scale/discovery/): support discovery.
- [reauthentication-flow](/core/quality-scale/reauthentication-flow/): reauthenticate from the UI.
- [reconfiguration-flow](/core/quality-scale/reconfiguration-flow/): reconfigure from the UI.

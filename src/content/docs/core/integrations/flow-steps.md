---
title: Forms, menus, and progress
description: The building blocks of config flows, options flows, and repair flows, from forms and sections to menus, external steps, and progress.
sidebarLabel: Forms, menus, and progress
sidebarGroup: Setup and configuration
order: 3
---

Config flows, [options flows](/core/integrations/options-flow/), [subentry flows](/core/integrations/subentries/), and [repair flows](/core/integrations/repairs/) are all built on the same framework: the data entry flow, in `homeassistant.data_entry_flow`. A flow is a series of steps. Each step returns one of the results on this page, and that result decides what the user sees next.

| Result | Method | What the user sees |
| --- | --- | --- |
| Form | `async_show_form` | A form to fill in |
| Menu | `async_show_menu` | A list of next steps to pick from |
| Create entry | `async_create_entry` | Success. The flow is done. |
| Abort | `async_abort` | A message why the flow stopped |
| External step | `async_external_step` | A link to finish something on another website |
| Progress | `async_show_progress` | A spinner while a long task runs |

## Show a form

A form has a step ID, a schema, and optionally errors. Fields appear in the order of the schema. The step method is called again with the input once the user submits valid data.

```python
async def async_step_user(
    self, user_input: dict[str, Any] | None = None
) -> ConfigFlowResult:
    """Ask for the login details."""
    errors: dict[str, str] = {}

    if user_input is not None:
        try:
            await validate_login(self.hass, user_input)
        except InvalidAuth:
            errors["base"] = "invalid_auth"
        else:
            return self.async_create_entry(
                title=user_input[CONF_USERNAME], data=user_input
            )

    return self.async_show_form(
        step_id="user",
        data_schema=probatio.Schema(
            {
                probatio.Required(CONF_USERNAME): str,
                probatio.Required(CONF_PASSWORD): str,
            }
        ),
        errors=errors,
    )
```

### Validation and errors

Your step only gets input that passes the schema. Anything else, like checking that a password works, is up to you. Return the form again with an `errors` dictionary: the key is the field with the problem, or `base` for an error that is not about one field. The value is a key in the `error` section of your translations.

### Multiple steps

To go to the next step, return the result of that step. Keep what you need from earlier steps on the flow object:

```python
if user_input is not None:
    self._host = user_input[CONF_HOST]
    return await self.async_step_credentials()
```

Pass `last_step=False` to `async_show_form` to show **Next** instead of **Submit**.

### Sections

Group fields in collapsible sections with `section`. A section changes how the form looks and how the input is structured: the fields of a section arrive in a nested dictionary. Sections cannot be nested.

```python
from homeassistant.data_entry_flow import section

DATA_SCHEMA = probatio.Schema(
    {
        probatio.Required(CONF_HOST): str,
        probatio.Required("ssl_options"): section(
            probatio.Schema(
                {
                    probatio.Required(CONF_SSL, default=True): bool,
                    probatio.Required(CONF_VERIFY_SSL, default=True): bool,
                }
            ),
            # Show the section collapsed. The default is False.
            {"collapsed": True},
        ),
    }
)
```

The input of that form looks like `{"host": "...", "ssl_options": {"ssl": True, "verify_ssl": False}}`. A section can have an icon, in `icons.json`:

```json
{
  "config": {
    "step": {
      "user": {
        "sections": {
          "ssl_options": "mdi:lock"
        }
      }
    }
  }
}
```

### Labels and descriptions

The text of a form lives in `strings.json`, under the step ID:

| Key | What it is |
| --- | --- |
| `title` | The heading of the form. Do not include the brand name: Home Assistant adds it from the manifest. |
| `description` | Instructions. Optional. Do not link to the documentation, which is linked automatically, and do not state the obvious, like "Here you can set up X". |
| `data` | The labels of the fields. Keep them short, and consistent with other integrations. |
| `data_description` | An explanation shown below each field |
| `sections` | Per section: a `name`, a `description`, and the `data` and `data_description` of its fields |

```json
{
  "config": {
    "step": {
      "user": {
        "description": "Enter the details of your Example hub.",
        "data": {
          "host": "[%key:common::config_flow::data::host%]"
        },
        "data_description": {
          "host": "The hostname or IP address of your hub."
        },
        "sections": {
          "ssl_options": {
            "name": "Security options",
            "data": {
              "verify_ssl": "Verify the SSL certificate"
            }
          }
        }
      }
    }
  }
}
```

See [make your strings translatable](/translate/guides/developers/) for the rules of good strings.

### Defaults and suggested values

There are two ways to pre-fill a field:

- `default` fills the field, and is also used when the user leaves it empty.
- A suggested value fills the field, but the user can still clear it.

```python
probatio.Optional(CONF_PORT, default=80): int
probatio.Optional(
    CONF_NAME, description={"suggested_value": "Living room"}
): str
```

`add_suggested_values_to_schema` fills a static schema with values you already have, which is ideal for options flows:

```python
return self.async_show_form(
    step_id="init",
    data_schema=self.add_suggested_values_to_schema(
        OPTIONS_SCHEMA, self.config_entry.options
    ),
)
```

A select field built with `probatio.In(...)` and no `default` has its first option selected.

### Read-only fields

Some settings cannot change after setup. You can still show them in an options flow, so users remember what they picked: add the field with a selector that has `read_only=True`.

```python
probatio.Optional(CONF_ENTITY_ID): EntitySelector(
    EntitySelectorConfig(read_only=True)
)
```

### Browser autofill

Help browsers and password managers fill in your form. The frontend adds the right `autocomplete` attribute to fields named `username` and `password` by itself. For anything else, use a text selector with `autocomplete`:

```python
probatio.Required(CONF_USERNAME): TextSelector(
    TextSelectorConfig(type=TextSelectorType.EMAIL, autocomplete="username")
),
probatio.Required(CONF_PASSWORD): TextSelector(
    TextSelectorConfig(
        type=TextSelectorType.PASSWORD, autocomplete="current-password"
    )
),
```

### Options that depend on another field

Some selectors narrow their options based on the value of another field in the same form. They take a `context` in their config, which maps a context key to the name of the field that provides its value. The unit of measurement selector, for example, supports `filter_device_class` and `filter_state_class`. They point at a field that uses a device class or a state class selector. The selector config rejects a context key it does not know, and you cannot combine `filter_device_class` with `device_classes`, or `filter_state_class` with `state_classes`:

```python
probatio.Optional(CONF_UNIT_OF_MEASUREMENT): UnitOfMeasurementSelector(
    UnitOfMeasurementSelectorConfig(
        context={
            "filter_device_class": CONF_DEVICE_CLASS,
            "filter_state_class": CONF_STATE_CLASS,
        }
    )
)
```

The context only changes what the frontend offers. The selector does not check the submitted value against the other fields, so your step still has to check that the combination makes sense.

### Advanced options

The `show_advanced_options` property is deprecated and will be removed in Home Assistant 2027.6. Until then it always returns `True`. Put options most users do not need in a collapsed [section](#sections) instead.

## Create an entry

`async_create_entry` finishes the flow. In a config flow, it creates the config entry from a title and `data`, and optionally `options`:

```python
return self.async_create_entry(
    title="Office hub",
    data={CONF_HOST: host, CONF_TOKEN: token},
    options={CONF_SHOW_GUESTS: False},
)
```

Both must be JSON serializable. Put what is needed to connect in `data`, and what users can tweak in `options`. Changing credentials is [reauthentication](/core/integrations/reauth-reconfigure/), which updates `data`.

## Abort

When a flow cannot finish, abort it with a reason. Users see the matching text from the `abort` section of your translations:

```python
return self.async_abort(reason="not_supported")
```

## Show a menu

A menu lets the user pick the next step. Each option is a step ID:

```python
return self.async_show_menu(
    step_id="user",
    menu_options=["discovery", "manual"],
    description_placeholders={"model": "Example model"},
)
```

The labels come from `menu_options` in your translations, and optional descriptions from `menu_option_descriptions`. You can also pass a dictionary of step IDs and labels instead of a list. Pass `sort=True` to sort the options by their label in the language of the user.

```json
{
  "config": {
    "step": {
      "user": {
        "menu_options": {
          "discovery": "Search the network",
          "manual": "Enter the address of the {model}"
        },
        "menu_option_descriptions": {
          "discovery": "Find hubs on your network automatically."
        }
      }
    }
  }
}
```

## External steps

Sometimes the user has to finish something on another website, like logging in. For OAuth 2.0, use the [OAuth 2.0 helper](/core/integrations/oauth2/), which does all of this for you. For anything else:

1. The step returns `async_external_step` with the URL to open. Include the flow ID in it, so the result can find its way back.
2. The user finishes on the other website, which redirects their browser to an endpoint of your integration in Home Assistant.
3. That endpoint calls `hass.config_entries.flow.async_configure(flow_id, data)` and returns `<script>window.close()</script>` to close the window.
4. The step is called again with the data, and returns `async_external_step_done` with the next step.

```python
async def async_step_user(
    self, user_input: dict[str, Any] | None = None
) -> ConfigFlowResult:
    """Send the user to the external website."""
    if not user_input:
        return self.async_external_step(
            step_id="user",
            url=f"https://example.com/link?flow_id={self.flow_id}",
        )

    self._data = user_input

    return self.async_external_step_done(next_step_id="finish")
```

Do the work with the returned data in the next step, not in the endpoint and not before you mark the step done. The user then sees a spinner while it runs, instead of a blank window or a stale form.

## Show progress

For a step that takes a while, like a firmware check, run the work in a task and show progress until it is done:

```python
async def async_step_user(
    self, user_input: dict[str, Any] | None = None
) -> ConfigFlowResult:
    """Wait for the device to pair."""
    if not self._pair_task:
        self._pair_task = self.hass.async_create_task(self._async_pair())

    if not self._pair_task.done():
        return self.async_show_progress(
            step_id="user",
            progress_action="pairing",
            progress_task=self._pair_task,
        )

    return self.async_show_progress_done(next_step_id="finish")
```

Home Assistant calls the step again when the task finishes, but it can also call it earlier, for example when the frontend reloads. So never start a second task: check if one exists. The `progress_action` is the key of the text in the `progress` section of your translations. To show how far along the task is, call `self.async_update_progress(0.5)` with a value between 0 and 1.

## Start a flow from code

Integrations and discovery start flows with a source in the context. The flow then starts at the step with the name of that source, not at `user`:

```python
await hass.config_entries.flow.async_init(
    DOMAIN, context={"source": SOURCE_IMPORT}, data=config
)
```

The flow can check where it came from with `self.source`. To start a flow for a discovered device, use the [discovery flow helper](/core/integrations/discovery/#discovery-by-another-integration) instead.

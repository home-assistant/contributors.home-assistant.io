---
title: Deprecating
description: How to remove or change behavior in Home Assistant Core without breaking homes overnight. Deprecation periods, repair issues, and the helpers for developer facing APIs.
sidebarGroup: Changing behavior
order: 1
---

A [deprecation](/glossary/deprecation/) is a [backward-incompatible change](/glossary/backward-incompatible-change/) scheduled for later. The old behavior keeps working, everyone affected gets a warning, and the removal happens in a later release.

Anything you remove has to be deprecated first. That holds even when you think only a handful of people use it: an entity, an action, or a constant can be used in automations, scripts, dashboards, and custom integrations you cannot see.

## How long

| Who is affected | Minimum period |
| --- | --- |
| Users: YAML configuration, actions, entities, attributes, integrations | 6 months |
| Developers: constants, helpers, entity properties, platform APIs that custom integrations use | 12 months |

A deprecation period can be extended when the ecosystem has not caught up yet, but it is never shortened. Name the release in which the removal happens as `breaks_in_ha_version`, in the [version format](/core/development/versioning/), like `"2027.1.0"`.

Use `IssueSeverity.WARNING` as long as the old behavior still works. Use `IssueSeverity.ERROR` only when it has stopped working: the integration is gone, or a migration failed, and the configuration of the user is no longer in effect. The same split goes for log levels, when you remove a developer facing feature that cannot raise a repair issue.

## User facing deprecations

Every deprecation that needs the user to do something gets a [repair issue](/glossary/repair/). When an integration can be set up more than once, include the config entry in the `issue_id`, or the issues of different entries overwrite each other. After the deprecation period, open a follow up pull request that removes the old behavior and the issue.

Every issue you create under your own domain needs an `issues.<translation_key>` entry in the `strings.json` of the integration. Issues created under `HOMEASSISTANT_DOMAIN`, like `deprecated_yaml`, use text that already exists in core.

### Dropping YAML support

To move an integration from YAML to the UI, add a config flow with an import step. In `async_setup`, import the YAML configuration. When the import succeeds, raise the `deprecated_yaml` issue of core. That issue lives in the `homeassistant` domain, so create it under `HOMEASSISTANT_DOMAIN`, and set `issue_domain` to your own domain:

```python
async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the integration."""
    if DOMAIN not in config:
        return True

    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_IMPORT}, data=config[DOMAIN]
    )
    # On the next start, the import aborts because the entry exists.
    # That is not a failure.
    if result.get("type") is FlowResultType.ABORT and result["reason"] not in (
        "already_configured",
        "single_instance_allowed",
    ):
        # The import failed, so the YAML is not in effect: raise your own
        # issue with ERROR severity here, and stop.
        return True

    ir.async_create_issue(
        hass,
        HOMEASSISTANT_DOMAIN,
        f"deprecated_yaml_{DOMAIN}",
        breaks_in_ha_version="2027.1.0",
        is_fixable=False,
        issue_domain=DOMAIN,
        severity=ir.IssueSeverity.WARNING,
        translation_key="deprecated_yaml",
        translation_placeholders={
            "domain": DOMAIN,
            "integration_title": "Example",
        },
    )
    return True
```

Raise `deprecated_yaml` only after the import succeeded. Otherwise you tell users their configuration was imported when it was not. An abort because the entry already exists counts as a success: that is what happens on every start after the first import. Which reason your import step uses depends on how it checks for an existing entry, so match the reasons to your own config flow.

When the period is over and the YAML code is gone, set the `CONFIG_SCHEMA` to `cv.config_entry_only_config_schema(DOMAIN)`. It logs an error and raises a repair issue for anyone who still has the integration in `configuration.yaml`.

### Single YAML options

To deprecate one option, or a few, raise the issue in `async_setup` where the YAML is read, and only when the option is actually used. The option keeps working until the period is over.

```python
async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the integration."""
    if CONF_IPV6 in config[DOMAIN]:
        ir.async_create_issue(
            hass,
            DOMAIN,
            "deprecated_ipv6",
            breaks_in_ha_version="2027.1.0",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="deprecated_ipv6",
        )
```

When the period is over, do not just drop the option from the schema. Put `cv.removed(CONF_IPV6)` in its place: it tells users the option is gone, instead of failing with a generic validation error.

### Actions

Raise the issue in the handler of the action. To deprecate a single field of an action, raise it only when that field is passed.

```python
async def render_image(call: ServiceCall) -> ServiceResponse:
    """Render an image."""
    ir.async_create_issue(
        call.hass,
        DOMAIN,
        "deprecated_render_image",
        breaks_in_ha_version="2027.1.0",
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key="deprecated_render_image",
    )
```

### Entities and attributes

When an attribute becomes an entity of its own, an entity moves to another platform, or an entity goes away, create the new entity first, and keep the old one working during the period.

Raise an issue for every deprecated entity that still exists and is enabled. Use `automations_with_entity()` and `scripts_with_entity()` to name the automations and scripts that will break. The user acknowledges the deprecation by disabling the entity. Once it is disabled and nothing uses it, remove it from the registry, so it is not created again.

```python
def async_deprecate_entity(
    hass: HomeAssistant,
    entity_registry: er.EntityRegistry,
    description: ExampleSwitchEntityDescription,
) -> bool:
    """Return whether the deprecated entity should still be created."""
    entity_id = entity_registry.async_get_entity_id(
        Platform.SWITCH, DOMAIN, description.unique_id
    )
    if entity_id is None:
        return False

    items = automations_with_entity(hass, entity_id) + scripts_with_entity(
        hass, entity_id
    )
    entry = entity_registry.async_get(entity_id)
    if entry.disabled and not items:
        entity_registry.async_remove(entity_id)
        return False

    placeholders = {
        "entity_id": entity_id,
        "new_entity_id": description.replacement_entity_id,
    }
    if items:
        placeholders["items"] = "\n".join(items)

    ir.async_create_issue(
        hass,
        DOMAIN,
        f"deprecated_entity_{entity_id}",
        breaks_in_ha_version="2027.2.0",
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key=(
            "deprecated_entity_used" if items else "deprecated_entity"
        ),
        translation_placeholders=placeholders,
    )
    return True
```

Call it in `async_setup_entry` of the platform, and let its answer decide which entities are added. An entity that does not exist yet returns `False`, so new users never get the deprecated entity.

```python
async def async_setup_entry(
    hass: HomeAssistant,
    entry: ExampleConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the switch platform."""
    coordinator = entry.runtime_data
    entity_registry = er.async_get(hass)

    entities = [
        ExampleSwitch(coordinator, description) for description in SWITCHES
    ]
    entities.extend(
        ExampleSwitch(coordinator, description)
        for description in DEPRECATED_SWITCHES
        if async_deprecate_entity(hass, entity_registry, description)
    )
    async_add_entities(entities)
```

The issue is not persistent: it is created again on every start, as long as the entity is in use. The message names every place the entity may be used, not only automations and scripts, and tells the user that disabling it is what makes the issue go away:

```json
{
  "issues": {
    "deprecated_entity": {
      "title": "Deprecated switch detected",
      "description": "The switch `{entity_id}` is deprecated because it has been replaced with `{new_entity_id}`.\n\nUpdate your dashboards, templates, automations, and scripts to use the replacement entity, then disable the deprecated switch and restart Home Assistant."
    }
  }
}
```

The code above uses a second key, `deprecated_entity_used`, when the entity is still in use. Add it next to `deprecated_entity`, with the same title, and an `{items}` placeholder in the description: that is where the list of automations and scripts goes. Its description tells the user to update those, along with any dashboards and templates, then disable the deprecated entity and restart.

### Removing an integration

When an integration stops working for good, for example because the vendor shut down its API, remove it. Strip it down to a stub that raises an `ERROR` issue, and keep a minimal `config_flow.py`, so existing entries still load and the user sees what happened. The established translation key is `integration_removed`:

```python
async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up the integration from a config entry."""
    ir.async_create_issue(
        hass,
        DOMAIN,
        DOMAIN,
        is_fixable=False,
        severity=ir.IssueSeverity.ERROR,
        translation_key="integration_removed",
        translation_placeholders={
            "entries": f"/config/integrations/integration/{DOMAIN}",
        },
    )
    return True
```

The `entries` placeholder links to the config entries of the user. Explain in the text why the integration was removed, and that they can remove the entries. Delete the issue again in `async_unload_entry`, once the last config entry of the domain is unloaded.

When the integration is replaced by a successor, it is a deprecation instead: use `WARNING` with a `breaks_in_ha_version`, and abort the config flow with the reason `deprecated`, so nobody can add new entries.

### Documentation and tests

The repair issue and the release notes announce the deprecation. Do not add a deprecation notice to the documentation on [home-assistant.io](https://www.home-assistant.io/): it only describes what works today.

Test with the `issue_registry` fixture that the issue is created, and that it is deleted again when the last config entry unloads.

## Developer facing deprecations

Anything that other integrations import or subclass is a core API: everything in `homeassistant/helpers/`, `homeassistant/const.py`, and entity platforms like `homeassistant/components/sensor/`. Changing one affects authors of [custom integrations](/glossary/custom-integration/), who need time to react. These deprecations get 12 months, and a post on the [blog](/blog/) that names the replacement, if there is one, and the release of the removal.

The helpers below log a warning that names the integration that uses the deprecated code. They do not create a repair issue: users cannot fix the code of a custom integration.

### Constants, aliases, and enum members

Rename the old constant with a `_DEPRECATED_` prefix, wrap it, and add the three module hooks. Reading the old name then works, and warns:

```python
from functools import partial

from homeassistant.helpers.deprecation import (
    DeprecatedConstantEnum,
    all_with_deprecated_constants,
    check_if_deprecated_constant,
    dir_with_deprecated_constants,
)

_DEPRECATED_CONCENTRATION_GRAMS_PER_CUBIC_METER = DeprecatedConstantEnum(
    UnitOfDensity.GRAMS_PER_CUBIC_METER, "2027.8"
)

# Remove these once the module has no deprecated constants left.
__getattr__ = partial(check_if_deprecated_constant, module_globals=globals())
__dir__ = partial(
    dir_with_deprecated_constants, module_globals_keys=[*globals().keys()]
)
__all__ = all_with_deprecated_constants(globals())
```

Use `DeprecatedConstant` for a plain value, `DeprecatedConstantEnum` for an enum member, and `DeprecatedAlias` when a class or function moved. To deprecate one member of an enum you keep, use the `EnumWithDeprecatedMembers` metaclass:

```python
class MediaPlayerState(
    StrEnum,
    metaclass=EnumWithDeprecatedMembers,
    deprecated={
        "STANDBY": (
            "MediaPlayerState.OFF or MediaPlayerState.IDLE",
            "2026.8.0",
        ),
    },
):
    """State of media player entities."""

    OFF = "off"
    IDLE = "idle"
    STANDBY = "standby"
```

Deprecated constants only warn when the code that reads them belongs to an integration. Core code and tests read them silently. That is why the test helpers below go through a custom integration.

### Functions, methods, and classes

```python
@deprecated_function(
    "homeassistant.helpers.sun.get_astral_observer",
    breaks_in_ha_version="2027.7",
)
@callback
def get_astral_location(hass: HomeAssistant) -> tuple[Location, Elevation]:
    """Get an astral location for Home Assistant."""
```

`@deprecated_class` warns when the class is instantiated, and is the way to keep a renamed class around as an alias. Both take the replacement as a string. To deprecate a leading `hass` argument that a function no longer needs, use `@deprecated_hass_argument`. It warns, and drops the argument.

### Patterns

Sometimes the problem is not a name, but a way of using something, like setting a property you want gone, or calling a function that a platform now replaces. Use `report_usage()` from `homeassistant.helpers.frame`:

```python
report_usage(
    "calls system_health.async_register_info, which is deprecated; "
    "add a system_health platform instead",
    breaks_in_ha_version="2027.1",
    core_behavior=ReportBehavior.ERROR,
    exclude_integrations={DOMAIN},
)
```

The first argument is inserted into "Detected that integration 'domain' ...", so write it as a verb phrase.

`report_usage()` finds the responsible integration by walking the call stack. That works when the integration calls the deprecated code itself. It does not work when core reads something the integration set earlier, like a deprecated entity property: by then, the integration is no longer on the stack. In that case, pass `integration_domain`, from an object that knows where it comes from, like `self.platform.platform_name` on an entity.

Three parameters decide who gets what. Each takes a `ReportBehavior`: `IGNORE` says nothing, `LOG` logs once per caller at `level`, and `ERROR` logs and raises a `RuntimeError`.

| Parameter | Applies to | Default |
| --- | --- | --- |
| `core_behavior` | Code in `homeassistant/`, with no integration on the stack | `ERROR` |
| `core_integration_behavior` | A built in integration | `LOG` |
| `custom_integration_behavior` | A custom integration | `LOG` |

The defaults are usually right: core code fails loudly in tests, integrations get a warning. While you are still migrating the built in integrations, set `core_integration_behavior` to `IGNORE`, so authors of custom integrations get the warning without the logs filling up with cases you are already fixing.

### Tests

`tests/common.py` has `import_and_test_deprecated_constant`, `import_and_test_deprecated_constant_enum`, `import_and_test_deprecated_alias`, and `help_test_all` for deprecated names. The `mock_integration_frame` fixture helps you test `report_usage()` warnings.

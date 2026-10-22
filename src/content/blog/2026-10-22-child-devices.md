---
title: "Introducing child devices"
description: Child devices give integrations a first-class way to model the parts of one physical product, like the outlets of a power strip, instead of splitting it into several devices linked with via_device.
date: 2026-10-22
authors:
  - Erik Montnémery
areas:
  - core
---

## Summary

Home Assistant now has a first-class way to model a device that is made up of several logical parts: **child devices**. A child device is a lightweight sub-device that belongs to a single parent device. Think of the individual outlets of a smart power strip, or the individual gangs of a multi-gang wall switch.

Until now, integrations expressed this by splitting the product into several devices and linking the parts back to the parent with `via_device`. That works, but `via_device` was designed to describe _connectivity_: how Home Assistant reaches a device, for example a Zigbee bulb reached through its coordinator, or a Philips Hue lamp reached through a Hue bridge. Using it for _composition_, which physical product a logical part belongs to, overloads the field and prevents Home Assistant from treating the two relationships differently.

Child devices separate the two concepts. **Integrations which currently model sub-devices with a `via_device` should migrate to child devices.** Genuine gateway or hub relationships between separate physical products keep using `via_device_id`.

This is implemented in core [PR #178666](https://github.com/home-assistant/core/pull/178666), and the rationale is described in architecture proposal [home-assistant/architecture#1414](https://github.com/home-assistant/architecture/discussions/1414). Child devices are available since Home Assistant Core 2026.9. The [device registry](/core/integrations/device-registry/#child-devices) page documents them.

## Child devices versus via devices

The two ends of a `via_device` link are **separate physical products**, one acting as a gateway for the other. Deleting the gateway should not delete the devices behind it. They still exist, they are just no longer reachable.

The parts of a child-device relationship are **one physical product**. A power strip is a single product, and its outlets have no meaning on their own. A child device therefore:

- Belongs to its parent and to the same config entry and config subentry as its parent.
- Has no connectivity or hardware identity of its own: no `connections`, `via_device`, `manufacturer`, `model`, firmware versions, or serial number. Those belong to the physical parent.
- Inherits its parent's area unless it is given an area of its own. A power strip in the garage puts all its outlets in the garage by default, but the outlet feeding the garden lamp can be moved to the garden.
- Is deleted when its parent is deleted, and disabled when its parent is disabled.

Child devices are a single level: a child device can't be the parent of another child device.

## Creating a child device

A device is adopted as a child device in one of two ways, mirroring the two ways any device is registered: from an entity, or directly on the device registry. Either way, the child points at its parent with `parent_device_id`. That is the parent's Home Assistant device ID (`DeviceEntry.id`), not its identifiers, so the parent device must already be registered and its ID known.

### From an entity's `device_info`

For devices that are created implicitly by their entities, return a `ChildDeviceInfo` from the entity's `device_info`, with a `parent_device_id` pointing at the parent device. `ChildDeviceInfo` is a lighter counterpart to `DeviceInfo`, carrying only the fields that make sense for a child: `identifiers`, `name`, `parent_device_id`, `suggested_area`, `translation_key`, and `translation_placeholders`. `identifiers` and `parent_device_id` are required. Like `DeviceInfo`, it is a dataclass, see [DeviceInfo is now a dataclass](/blog/2026/10/13/device-info-class/).

```python
from homeassistant.helpers.device_registry import ChildDeviceInfo


class OutletSwitch(SwitchEntity):
    @property
    def device_info(self) -> ChildDeviceInfo:
        """Return the child device info."""
        return ChildDeviceInfo(
            identifiers={(DOMAIN, f"{self._strip_id}_outlet_{self._outlet}")},
            name=f"Outlet {self._outlet}",
            parent_device_id=self._parent_device_id,
        )
```

An entity's `device_info` may return either a `DeviceInfo` or a `ChildDeviceInfo`. Returning a `ChildDeviceInfo` is what routes it to child-device registration.

### Manually with `async_get_or_create_child`

For devices that aren't represented by an entity, register the child directly on the device registry with the `async_get_or_create_child` method:

```python
def async_get_or_create_child(
    self,
    *,
    config_entry_id: str,
    config_subentry_id: str | UndefinedType | None = UNDEFINED,
    disabled_by: DeviceEntryDisabler | UndefinedType | None = UNDEFINED,
    identifiers: set[tuple[str, str]],
    name: str | UndefinedType | None = UNDEFINED,
    parent_device_id: str,
    suggested_area: str | UndefinedType | None = UNDEFINED,
    translation_key: str | None = None,
    translation_placeholders: Mapping[str, str] | None = None,
) -> ChildDeviceEntry:
    """Get child device. Create if it doesn't exist."""
```

`config_entry_id`, `identifiers`, and `parent_device_id` are required. There is deliberately no `via_device_id`, `connections`, `manufacturer`, `model`, or firmware parameter, because a child device does not carry those.

```python
from homeassistant.helpers import device_registry as dr

device_registry = dr.async_get(hass)

# The parent device must be registered first
parent = device_registry.async_get_or_create(
    config_entry_id=entry.entry_id,
    identifiers={(DOMAIN, strip_id)},
    manufacturer="Example",
    name="Power strip",
)

# Register each outlet as a child of the power strip
outlet = device_registry.async_get_or_create_child(
    config_entry_id=entry.entry_id,
    parent_device_id=parent.id,
    identifiers={(DOMAIN, f"{strip_id}_outlet_1")},
    name="Outlet 1",
)
```

When you already hold a `ChildDeviceInfo`, for example one shared with your entities, pass it as it is to `async_get_or_create_child_from_info`, instead of unpacking it.

The parent must already exist (the registry never creates it for you), must be registered by the same config entry, and must belong to the same config subentry. If the parent belongs to a config subentry, pass its `config_subentry_id` explicitly. It is not inherited, and omitting it defaults to no subentry and raises `DeviceInfoError`. The parent must itself be a main device, because a child can't be the parent of another child.

## Converting an existing device to a child

Migrating an integration that already splits products into several devices should preserve the existing device IDs, so that device-based automations keep working. This happens automatically: if the `identifiers` passed to `async_get_or_create_child` (or the `identifiers` of a child's `device_info`) match an existing device of the same config entry, that device is **converted to a child device in place, keeping its ID**. Registering the outlet above with the same identifiers the outlet's standalone device used before turns it into a child of the power strip without changing its ID.

The conversion is rejected with `DeviceInfoError` if the same config entry already registered the device as a main device since the entry was set up. Home Assistant only forgets that registration when the config entry unloads. So when the entry is next set up after the migration, register the part only as a child device, from the `ChildDeviceInfo` of its entities or with `async_get_or_create_child`. Don't register it as a main device first, for example through a `DeviceInfo` left on one of its entities.

When migrating, this is also a good moment to drop any parent-name prefix that used to be baked into the sub-device's name. For example, rename _"Power strip Outlet 3"_ to just _"Outlet 3"_, since the frontend can compose the parent name into the display name when needed.

## A child device can't be converted back to a main device

Converting the other direction, turning a child back into a standalone main device, is **not supported directly**. There is no `parent_device_id` parameter on `async_update_child_device`, reparenting is rejected, and calling `async_get_or_create` with a live child's identifiers raises rather than promoting it.

You can achieve it indirectly by **removing the child device and then recreating it as a main device** with `async_get_or_create`, passing the same identifiers the deleted child had:

```python
# Remove the child device first...
device_registry.async_remove_device(child.id)

# ...then recreate it as a main device with the same identifiers
device_registry.async_get_or_create(
    config_entry_id=entry.entry_id,
    # Same identifiers the child had
    identifiers={(DOMAIN, outlet_id)},
    name="Outlet 1",
)
```

The order matters: the child must be removed before its identifiers are free to be registered as a main device.

This recipe fits a child device without entities. Removing a child device also removes the entity registry entries of its config entry and subentry, and recreating the device doesn't bring them back. They only return when your integration adds the entities again, now with a `DeviceInfo` for the main device. Home Assistant then restores their settings, like the entity ID and name. So for a child device with entities, the migration must also register its entities again.

## Lifecycle

Child devices follow their parent:

- **Deletion cascades.** Removing a parent device removes its child devices with it. A child device has no meaning without the physical device it was split from.
- **Disabling cascades.** Disabling a parent disables its children, and enabling the parent re-enables the children it disabled. A child of a disabled parent can't be enabled on its own.
- **Area is inherited.** A child with no area of its own reports its parent's area. Setting an area on the child overrides that.
- **Labels are not inherited.** They stay explicit per device.
- **A parent with children can't be moved** to another config entry or subentry. A child always lives on the same entry and subentry as its parent.
- **Targeting the parent targets its children.** When a parent device is used as the target of an action, the action resolves to the entities of the parent _and_ of all its child devices. Targeting a child device targets only that child.

## Migration guidance

Integrations which split a product into several devices and link the parts with `via_device` should migrate those parts to child devices:

- Register each part with `parent_device_id` set to the parent's device ID, either from the entity's `device_info` (as `ChildDeviceInfo`) or with `async_get_or_create_child`.
- Keep the part's existing `identifiers`, so the existing device is converted to a child in place and its ID is preserved, keeping automations working.
- Register the part only as a child device. A device that the config entry already registered as a main device during the current setup can't be converted.
- Remove the `via_device` or `via_device_id` link between the part and the parent. The parent relationship is now expressed by `parent_device_id`.
- Drop any parent-name prefix from the child's name.

Another common migration is to break entities out of a single combined device onto per-part child devices. For example, move each channel's entities off one shared device onto a per-channel child device. Keep the original device as the parent, with its ID unchanged, and move each part's entities onto a new child device. Moving an entity onto a child device changes its `device_id`, but device-targeted automations and scripts keep working without user intervention: because targeting a device also targets the entities of its child devices, anything that targets the parent device still acts on the moved entities.

Keep using `via_device_id` for genuine connectivity between separate physical products, such as a hub and the devices it talks to.

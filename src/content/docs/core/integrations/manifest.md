---
title: The integration manifest
description: Every key of manifest.json, what it does, and which values it accepts.
sidebarLabel: Manifest
sidebarGroup: Reference
order: 1
---

Every integration has a [manifest](/glossary/manifest/): a `manifest.json` file in the integration folder that tells Home Assistant what the integration is, what it needs, and how it can be discovered. Home Assistant reads it before it loads any code.

Here is the manifest of the AirGradient integration:

```json
{
  "domain": "airgradient",
  "name": "AirGradient",
  "codeowners": ["@airgradienthq", "@joostlek"],
  "config_flow": true,
  "documentation": "https://www.home-assistant.io/integrations/airgradient",
  "integration_type": "device",
  "iot_class": "local_polling",
  "quality_scale": "platinum",
  "requirements": ["airgradient==0.10.0"],
  "zeroconf": ["_airgradient._tcp.local."]
}
```

Hassfest, the validation script of core, checks every manifest. It requires the keys to be sorted: `domain`, then `name`, then everything else in alphabetical order. Run `python3 -m script.hassfest` to check yours, and it sorts the keys for you.

## Required keys

### domain

The short, unique name of the integration, made of lowercase letters, numbers, and underscores, like `mobile_app`. It must match the name of the folder the manifest is in, and it can never change: config entries, entity IDs, and user automations all refer to it.

### name

The name users see. Use the name of the product or service, and follow these rules:

- If a product or service has both a local and a cloud integration, the cloud one adds "Cloud" to its name, like **LIFX Cloud**.
- The local one (or one that supports both local and cloud) uses the plain name, like **LIFX**. Do not add "Local".
- An integration for a product or service that is cloud based by nature uses its name as is, like **iCloud**, not **iCloud Cloud**.

### codeowners

A list of GitHub usernames or team names, like `["@frenck"]`, of the people responsible for the integration. They are notified of issues and pull requests. Add at least yourself. Integrations at the Silver tier of the quality scale and above must have at least one integration owner.

### documentation

The URL of the documentation. For integrations in core, this is `https://www.home-assistant.io/integrations/<domain>`. A custom integration must point to its own documentation, served over `https`.

### iot_class

The [IoT class](/glossary/iot-class/): how the integration talks to the device or service. Required for every integration that connects to something.

| Value | Meaning |
| --- | --- |
| `local_polling` | Talks directly to the device, and asks for updates at an interval |
| `local_push` | Talks directly to the device, which tells Home Assistant when something changes |
| `cloud_polling` | Goes through the cloud, and asks for updates at an interval |
| `cloud_push` | Goes through the cloud, which tells Home Assistant when something changes |
| `assumed_state` | Home Assistant cannot get the state, so it assumes the state of the last command |
| `calculated` | Does not talk to anything, it calculates its result |

## Setup and type

### integration_type

What the integration is about. Integrations in core with a config flow must set it. When it is missing, Home Assistant treats the integration as a `hub`, but set it anyway.

| Value | Use it for |
| --- | --- |
| `device` | A single device per config entry, like ESPHome |
| `hub` | A gateway to multiple devices or services, like Philips Hue |
| `service` | A single service per config entry, like DuckDNS |
| `helper` | An entity that helps users with automations, like a derivative or group |
| `entity` | A basic entity platform, like `sensor` or `light`. Should generally not be used. |
| `hardware` | A hardware integration, like Raspberry Pi. Should generally not be used. |
| `system` | Reserved for system integrations. Should generally not be used. |
| `virtual` | Not an integration at all, but a pointer to another one. See [virtual integrations](#virtual-integrations). |

The difference between a `hub` and a `device` or `service` is what one config entry represents: a hub gives access to many devices or services, the others provide exactly one.

### categories

The categories people find the integration by, on the integrations page of the website, in the app, and in the Marketplace. Each entry is a category, like `energy`, or a category with a subcategory, like `energy.meters_monitoring`. The first entry is the primary category: the one that says best what the integration is for.

Here are the categories of the Shelly integration:

```json title="manifest.json"
{
  "categories": [
    "plugs_switches",
    "lighting.bulbs_lamps",
    "energy.meters_monitoring"
  ]
}
```

Hassfest checks that:

- There are one to three entries, without duplicates.
- Every entry is a known category or subcategory.
- A category is not listed next to one of its own subcategories, like `energy` with `energy.meters_monitoring`.
- Entity, system, and virtual integrations don't have the key.
- Every other integration in core has the key. For a custom integration, it is optional.

Most of these checks need the list of categories from core, so hassfest only runs them when it validates inside a core checkout. The hassfest GitHub action for custom integrations does. For a custom integration, an unknown category is a warning in hassfest instead of an error, so a category that changes in core doesn't fail hassfest in your repository. The [HACS action](/marketplace/reference/validation/) does fail on an unknown category.

See [integration categories](/core/integrations/categories/) for every category, and for how to choose the right ones.

### connectivity

The protocols Home Assistant uses to reach the devices or service of the integration, like `zigbee`, `network`, or `cloud`. List everything the integration can use, not what one particular setup uses.

ZHA reaches Zigbee devices through a Zigbee radio, so its connectivity is:

```json title="manifest.json"
{
  "connectivity": ["zigbee"]
}
```

Hassfest checks that:

- There is at least one entry, without duplicates.
- Every entry is a known value.
- Entity, system, and virtual integrations don't have the key.

The key is optional for now, both in core and for a custom integration. The check for known values, and the one for entity and system integrations, need the list of values from core, so hassfest only runs them when it validates inside a core checkout. For a custom integration, an unknown value is a warning in hassfest instead of an error, so a value that changes in core doesn't fail hassfest in your repository.

See [integration connectivity](/core/integrations/connectivity/) for every value, and for how to choose the right ones.

### config_flow

Set `"config_flow": true` when the integration has a `config_flow.py`, so users can add it from the UI. See [config flow](/core/integrations/config-flow/).

### single_config_entry

Set `"single_config_entry": true` when the integration supports only one config entry. Home Assistant then stops users from adding a second one.

## Dependencies and requirements

### requirements

A list of Python packages the integration needs, in `pip` format and pinned to an exact version, like `["airgradient==0.10.0"]`. Home Assistant installs them before it loads the integration. If installing fails, the integration does not load.

A custom integration should only list requirements that are not already requirements of Home Assistant itself.

While you work on a library, you can test your integration against a version that is not on PyPI yet. Install it yourself and tell Home Assistant not to replace it. Run this from your core checkout, with the library in a folder next to it:

```shell
uv pip install -e ../my-library
hass --skip-pip-packages my-library
```

To keep Home Assistant from installing or replacing any package at all, start it with `hass --skip-pip` instead.

In the development container, the folder next to your checkout does not exist: see [try your library in Home Assistant](/core/integrations/api-library/#try-your-library-in-home-assistant).

Or point the requirement to a git reference, which can be a branch, tag, or commit:

```json
{
  "requirements": [
    "my-library@git+https://github.com/me/my-library.git@my-branch"
  ]
}
```

Do not submit a pull request with a git requirement. Publish the library on PyPI first.

### dependencies

Other integrations that must be set up before this one loads. Use it when your integration cannot work without the other one, for example because it needs webhooks (`webhook`) or the MQTT connection (`mqtt`). It does not guarantee that the config entries of the other integration are set up yet.

### after_dependencies

Integrations your integration can use, but does not need. If they are configured, Home Assistant sets them up first. Either way, their requirements are installed, so you can safely import from them. For example, `camera` lists `media_player`: if `media_player` is configured, it loads before `camera`, and if not, `camera` loads anyway.

Hassfest checks that an integration you import from is listed in `dependencies` or `after_dependencies`, with exceptions. You can import from entity platform integrations, like `sensor` or `light`, and from a set of internal integrations, like `webhook` or `zone`, without listing them. The full list is `ALLOWED_USED_COMPONENTS` in [`script/hassfest/dependencies.py`](https://github.com/home-assistant/core/blob/dev/script/hassfest/dependencies.py). That only covers the import: if your integration needs one of them set up, like `webhook`, list it anyway. Never list `homeassistant` or `persistent_notification` in `dependencies`. They always load, and hassfest rejects them there. Integrations in core can only list other integrations in core. Custom integrations can also list custom ones.

### loggers

A list of the logger names your requirements use in their `logging.getLogger` calls, like `["aiohue"]`. Home Assistant uses it to connect log messages of a library to your integration, for example when a user enables debug logging for it.

## Quality and status

### quality_scale

The tier of the [integration quality scale](/core/quality-scale/) the integration reaches: `bronze`, `silver`, `gold`, or `platinum`. New integrations must reach at least `bronze`. The values `internal`, `legacy`, `custom`, and `no_score` are reserved for special cases.

### disabled

A short reason that keeps the integration from loading, like `"Library is broken with the latest firmware"`. Home Assistant logs the reason.

### preview_features

Labs preview features the integration offers: experimental features that users turn on themselves before they become a normal part of the integration. Each key is the slug of a feature, with optional links for feedback, more information, and reporting issues. See [Labs](/core/development/labs/) for the full workflow.

```json
{
  "preview_features": {
    "my_preview_feature": {
      "feedback_url": "https://community.home-assistant.io/t/12345",
      "learn_more_url": "https://www.home-assistant.io/integrations/example",
      "report_issue_url": "https://github.com/home-assistant/core/issues"
    }
  }
}
```

## Custom integrations only

These keys are only valid in custom integrations:

- `version`: required. A version that [AwesomeVersion](https://github.com/ludeeus/awesomeversion) understands, like `"1.2.0"` (SemVer) or `"2026.10.1"` (CalVer).
- `issue_tracker`: the URL where users report issues. Integrations in core leave it out, Home Assistant links to the core repository.
- `import_executor`: Home Assistant imports integrations in an executor, so a slow import does not block the [event loop](/glossary/event-loop/). Set it to `false` only if your integration must be imported in the event loop.

## Discovery

These keys tell Home Assistant how to recognize your devices, and start your config flow when one is found. The values must follow a few rules (some lowercase, some uppercase), which hassfest checks. [Discovery](/core/integrations/discovery/) explains what happens next.

### bluetooth

A list of matchers. A device matches when it matches every key of at least one matcher.

| Key | Matches |
| --- | --- |
| `local_name` | The advertised name. Supports wildcards, but not in the first three characters. |
| `service_uuid` | A 128-bit service UUID, in lowercase |
| `service_data_uuid` | A 128-bit service data UUID, in lowercase |
| `manufacturer_id` | The manufacturer ID, as an integer |
| `manufacturer_data_start` | The first bytes of the manufacturer data, as a list of integers from 0 to 255 |
| `connectable` | Set to `false` if the device only needs advertisements. Defaults to `true`. |

```json
{
  "bluetooth": [
    { "local_name": "Prodigio_*" },
    { "manufacturer_id": 76, "manufacturer_data_start": [6] }
  ]
}
```

To match a 16-bit UUID, turn it into a 128-bit one: replace the third and fourth byte of `00000000-0000-1000-8000-00805f9b34fb` with it. The 16-bit UUID `0xfd3d` becomes `0000fd3d-0000-1000-8000-00805f9b34fb`.

### zeroconf

A list of mDNS service types. An item is either a string, or an object with a `type` and filters. Use filters for generic types like `_http._tcp.local.`, so you do not get every web server on the network.

```json
{
  "zeroconf": [
    "_googlecast._tcp.local.",
    { "type": "_http._tcp.local.", "name": "example*" },
    {
      "type": "_axis-video._tcp.local.",
      "properties": { "macaddress": "00408c*" }
    }
  ]
}
```

Filters on `name` and in `properties` must be lowercase, and can use wildcards. The filters `macaddress`, `model`, and `manufacturer` at the top level of an item are deprecated: use `properties` instead.

### ssdp

A list of matchers on the SSDP headers `st`, `usn`, `ext`, and `server` (in lowercase), and on fields of the UPnP device description, like `manufacturer` or `deviceType`. A device matches when it matches every key of at least one matcher.

```json
{
  "ssdp": [
    {
      "st": "roku:ecp",
      "manufacturer": "Roku",
      "deviceType": "urn:roku-com:device:player:1-0"
    }
  ]
}
```

### homekit

Model names of HomeKit devices. A device matches when its full model name, or the first word of it (up to a space or hyphen), is in the list. A model can also be a pattern with wildcards, like `LIFX*`. You do not need to speak the HomeKit protocol: you can talk to the device in any way you like. Once your integration matches a model, the discovery info of a device that is not paired with HomeKit no longer goes to integrations that listen for the HomeKit zeroconf type.

```json
{
  "homekit": {
    "models": ["LIFX"]
  }
}
```

### lorawan

A list of LoRaWAN matchers. Each matcher is a pair of a stack, like `"chirpstack"` or `"tts"`, and the brand ID the network server uses for your vendor, as a string or an integer. Your integration needs `config_flow` set to `true`, and `lorawan` in its `dependencies`.

```json
{
  "config_flow": true,
  "dependencies": ["lorawan"],
  "lorawan": [["chirpstack", 744], ["tts", "sensecap"]]
}
```

A device that matches one of the pairs starts the `integration_discovery` step of your config flow. The matcher only selects your integration: your library decides which models it supports. See [LoRaWAN devices](/core/internals/lorawan/).

### mqtt

A list of MQTT topics to subscribe to for discovery. Add `mqtt` to `dependencies` (or `after_dependencies`) as well.

```json
{
  "mqtt": ["tasmota/discovery/#"]
}
```

Before your integration subscribes to topics itself, wait for the MQTT client with `await mqtt.async_wait_for_mqtt_client(hass)`. It waits while MQTT is being set up, and returns `True` once the client is available, or `False` when MQTT is not set up or does not become available in time.

### dhcp

A list of matchers on DHCP traffic. `hostname` must be lowercase, and `macaddress` (the first part of the MAC address, without colons) must be uppercase and contain a wildcard. Matching uses [Unix filename patterns](https://docs.python.org/3/library/fnmatch.html).

```json
{
  "dhcp": [
    { "hostname": "rachio-*", "macaddress": "009D6B*" },
    { "hostname": "[dp]achio-*", "macaddress": "009D6B*" },
    { "registered_devices": true }
  ]
}
```

A matcher with `"registered_devices": true` matches devices that your integration already registered in the [device registry](/core/integrations/device-registry/) with a MAC address connection. Use it to learn about new IP addresses of known devices when a hostname or MAC prefix match would be too broad.

Prefer `zeroconf` or `ssdp` when your device supports them. They generally give a better experience than DHCP.

### usb

A list of matchers on USB devices: `vid` and `pid` (uppercase), and `serial_number`, `manufacturer`, and `description` (lowercase, wildcards allowed). The [Debian wiki](https://wiki.debian.org/HowToIdentifyADevice/USB) explains how to find these values. `known_devices` is a list of product names the matcher covers. It is not used for matching.

```json
{
  "usb": [
    { "vid": "10C4", "pid": "EA60", "description": "*zigbee*" }
  ]
}
```

> [!WARNING]
> Some VID and PID combinations are used by many unrelated devices. VID `10C4` with PID `EA60` is any Silicon Labs CP2102 USB-to-serial chip. Match on `description` or another value as well, or users get discovery messages for devices that are not yours.

## Virtual integrations

Some products work with an integration that is not named after them. August Bluetooth locks work with the Yale Access Bluetooth integration, and some products only use a standard like Z-Wave. A virtual integration helps users find the right integration: it is only a manifest, without any code, and only integrations in core can provide one.

A virtual integration has a `domain`, a `name`, `"integration_type": "virtual"`, and one of these two keys:

- `supported_by`: the domain of the integration that supports the product.
- `iot_standards`: a list of standards the product uses: `homekit`, `zigbee`, or `zwave`.

```json
{
  "domain": "august_ble",
  "name": "August Bluetooth",
  "integration_type": "virtual",
  "supported_by": "yalexs_ble"
}
```

Users find the product when they add an integration, and Home Assistant sends them to the right config flow. The product also gets a generated page on [home-assistant.io](https://www.home-assistant.io/). Add the logo of the product to the [brands repository](/core/integrations/brands/).

> [!TIP]
> If a brand makes products that use a standard like Zigbee, set the IoT standards on the [brand](/core/integrations/brands/#brand-files) instead. Only use a virtual integration if that would confuse users.

---
title: Integration front matter
description: Every key you can use at the top of an integration page, what it does, and which values it accepts.
order: 5
---

Every integration page starts with front matter: a block of YAML between two `---` lines. It is not just metadata. It drives the [integration overview](https://www.home-assistant.io/integrations/), the setup button, the discovery text, the quality scale badge, and the sidebar of the page.

Many keys mirror the integration manifest in Home Assistant Core. For an integration in core, you don't maintain those keys by hand: a scheduled workflow on home-assistant.io copies the data of every manifest into the documentation, and the build fills in the keys from it. The manifest always wins, and the sync removes those keys from the front matter of the page.

The keys that come from the manifest are `title`, `ha_integration_type`, `ha_codeowners`, `ha_config_flow`, `ha_iot_class`, `ha_quality_scale`, `ha_platforms`, `ha_iot_standard`, `ha_connectivity`, `ha_supporting_domain`, `ha_supporting_integration`, the discovery keys like `ha_zeroconf`, and `ha_categories` once the manifest has `categories`.

Two cases still need them in the front matter:

- A new page, until the first sync after its integration is merged in core. Copy the values from the manifest. The sync removes them later.
- A page for something that is not an integration in core, like most brand pages. Nothing syncs those, so the page keeps its own keys.

## Example

A new page for an integration that is set up from the UI, before its first sync:

```yaml
---
title: Awesome Lights
description: Control your Awesome Lights from Home Assistant.
ha_release: 2026.11
ha_categories:
  - lighting.lighting_systems
ha_iot_class: Local Push
ha_config_flow: true
ha_codeowners:
  - "@your-github-username"
ha_domain: awesome_lights
ha_integration_type: hub
ha_platforms:
  - light
  - sensor
ha_quality_scale: bronze
ha_zeroconf: true
related:
  - docs: /docs/automation/
    title: Automations
  - url: https://www.example.com/awesome-lights/manual
    title: Awesome Lights user manual
---
```

The keys below are grouped by purpose. Keys that do not apply to your integration are left out. Do not set a key to `false` to say "no".

## The basics

These keys belong on every integration page.

- `title`: the name of the integration. Use the `name` from the manifest, as written there.
- `description`: one sentence about what the page covers. Search engines and link previews show it.
- `ha_domain`: the domain of the integration. It must match the `domain` in the manifest, and the file name of the page. For the example above, that is `source/_integrations/awesome_lights.markdown`.
- `ha_release`: the Home Assistant release that first shipped the integration, in the format `YYYY.M`. For a new integration, that is the next release: if the current release is 2026.10, use 2026.11. The site build fails if this key is missing.
- `ha_codeowners`: the GitHub usernames or teams responsible for the integration, each starting with `@`. Match the `codeowners` in the manifest. Quote each entry, because a bare `@` is not valid at the start of a YAML value.

> [!IMPORTANT]
> Quote releases that end in a zero, like `ha_release: "2025.10"`. Without quotes, YAML reads `2025.10` as the number 2025.1, and the page shows the wrong release.

## Classification

These keys describe what the integration is and does. They power the filters on the integration overview.

- `ha_categories`: a list of one to three category identifiers. For an integration with its own Core implementation, use the same identifiers as its manifest's `categories`. Categories describe the product or service, not the entity platforms it provides. The first entry is the primary category.
  - Use a category, like `lighting`, or a subcategory, like `lighting.lighting_systems`.
  - Do not list duplicates or a category together with one of its own subcategories.
  - See [Integration categories](/core/integrations/categories/) for the identifiers and how to choose them.
  - A page without `ha_categories` does not appear in the integration overview. Entity and system pages leave this key out on purpose.
  - The old `ha_category` key is no longer accepted.
- `ha_integration_type`: the type of the integration. It must match `integration_type` in the manifest: `device`, `entity`, `hardware`, `helper`, `hub`, `service`, `system`, or `virtual`. If the manifest does not set one, the type is `hub`.
- `ha_iot_class`: how the integration talks to the device or service. Use `Local Polling`, `Local Push`, `Cloud Polling`, `Cloud Push`, `Assumed State`, or `Calculated`, matching `iot_class` in the manifest. Integrations where it depends on the setup use `Configurable`. The [IoT class blog post](https://www.home-assistant.io/blog/2016/02/12/classifying-the-internet-of-things/) explains each class.
- `ha_platforms`: the entity platforms the integration implements, like `light` and `sensor`. Also list `diagnostics` when the integration supports downloading diagnostics.
- `ha_config_flow`: set to `true` if the integration is set up from the UI. This adds the setup button to the sidebar of the page. Leave the key out otherwise.
- `ha_quality_scale`: the tier of the integration on the quality scale: `bronze`, `silver`, `gold`, or `platinum`. Integrations that are internal to Home Assistant use `internal`, and older integrations that have not been scored yet use `legacy`. For a new integration, use `bronze`. Once the integration is synced, this key comes from `quality_scale` in the manifest.

### Protocols and connectors

Pick the category by what the integration is for. Hubs and radio protocols that bring in many kinds of devices use `hubs_protocols`. Generic connectors for serial ports, Modbus, or web APIs use `diy_makers`. An integration for a specific product uses that product's category, regardless of the protocol it uses. See [how to choose integration categories](/core/integrations/categories/#how-to-choose).

## Discovery

Set these to `true` when the integration can be discovered that way. They must match the discovery entries in the manifest. Leave out the ones that do not apply.

- `ha_bluetooth`: discovered over Bluetooth.
- `ha_dhcp`: discovered through DHCP.
- `ha_homekit`: discovered through HomeKit.
- `ha_mqtt`: discovered through MQTT.
- `ha_ssdp`: discovered through SSDP.
- `ha_zeroconf`: discovered through mDNS, also known as Zeroconf.

When `ha_dhcp`, `ha_homekit`, `ha_mqtt`, `ha_ssdp`, or `ha_zeroconf` is set, the standard configuration text on the page tells readers that Home Assistant can find their device automatically. See [Integration page structure](/writing/reference/integration-page/#reusable-text).

## Related links

`related` adds links to the end of the page. Each entry is one link:

- `docs`: a path to a page on home-assistant.io, like `/docs/automation/`. It may include an anchor. These show up under **Related topics**. The `title` is optional: without one, the title of the linked page is used.
- `url`: a link to another website. These show up under **Related links**, and open in a new tab. Always add a `title`, otherwise the bare URL is shown.

```yaml
related:
  - docs: /voice_control/s3_box_voice_assistant/
    title: Create an ESP32-S3-BOX-3 voice assistant
  - url: https://esphome.io/projects/
    title: ESPHome projects
```

A `docs` entry that points to a page that does not exist is silently dropped, so check your paths.

## Virtual integrations and brands

Some pages do not document an integration with code of its own. They exist so people can find a product by its brand name.

A *virtual integration* is a product that works through another integration. In core, it is only a manifest with `integration_type: virtual`, and it comes in two kinds:

- The "supported by" kind points to the integration that does the work, with `supported_by` in the manifest. For example, August Bluetooth locks work through the Yale Access Bluetooth integration.
- The "IoT standard" kind is a brand whose devices use a standard protocol, with `iot_standards` in the manifest: `zigbee`, `zwave`, or `homekit`. For Zigbee and Z-Wave, the page shows a button that starts adding a device with that standard.

The page of a virtual integration is not generated. Someone writes it by hand, but it can be short, because the build takes everything that describes the integration from the manifest. For the "supported by" kind, that includes the name and domain of the supporting integration, and its codeowners, IoT class, platforms, discovery, and categories, unless the manifest of the virtual integration sets its own. So the front matter only needs `description`, `ha_release`, and `ha_domain`.

For the body, the `integrations/supported_brand.md` include writes the text that sends readers to the supporting integration, with its setup button. A page for a "supported by" virtual integration looks like this:

```markdown title="source/_integrations/august_ble.markdown"
---
description: Connect your August Bluetooth locks with Yale Access Bluetooth.
ha_release: 2022.9
ha_domain: august_ble
---

Integrates [August](https://august.com/) locks over Bluetooth into Home
Assistant.

{% include integrations/supported_brand.md %}
```

A *brand* page groups several integrations or products from the same manufacturer under one name. For example, the Google brand page groups Google integrations, and the Inovelli brand page points to the Zigbee and Z-Wave standards its devices use. A brand is not the same as a virtual integration. Most brand pages have no manifest in core, so they set their keys themselves.

- `ha_brand`: set to `true` if the page represents a brand rather than an actual integration. The page then takes its logo from the brand images instead of the integration images. Leave the key out on regular integration pages.

Pages without a supporting integration, such as Matter, Zigbee, and Z-Wave brands, do not get categories from anywhere else and need their own `ha_categories`.

## Maintainer only

Do not add these keys yourself. A maintainer sets them.

- `works_with`: marks a brand as part of the [Works with Home Assistant](https://works-with.home-assistant.io/) partner program. It adds the program badge, and generates text about the program on the page. Each value is a connectivity method the products are certified for. List more than one when that applies, like both `zigbee` and `matter`.
  - `zwave`: shows as Z-Wave, and adds a Z-Wave badge and onboarding text.
  - `zigbee`: shows as Zigbee, and adds a Zigbee badge and onboarding text.
  - `matter`: shows as Matter, and adds a Matter badge and onboarding text.
  - `bluetooth`: products connect over Bluetooth.
  - `local`: products work locally, for example over the local network.
  - Any other value is shown as written, with a capital first letter.
- `featured`: set to `true` to highlight the integration on the integration overview. Note that this key has no `ha_` prefix.

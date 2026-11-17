---
title: "Top-level zeroconf properties in the manifest are deprecated"
description: "The macaddress, model, and manufacturer filters at the top level of a zeroconf matcher stop working in Home Assistant Core 2027.12. Move them into properties."
date: 2026-11-17
authors:
  - G Johansson
areas:
  - core
---

The `macaddress`, `model`, and `manufacturer` filters at the top level of a `zeroconf` matcher in `manifest.json` are deprecated. They have been deprecated since Home Assistant Core 2022.2, but this was never announced. They will stop working in Home Assistant Core 2027.12. If your custom integration has no `zeroconf` matcher with one of these keys, you don't need to do anything.

Until then, Home Assistant moves each of these keys into the `properties` of the matcher when it loads your integration, and logs a warning:

```text
Matching the zeroconf property "manufacturer" at top-level is deprecated and will stop working in Home Assistant 2027.12.0; it should be moved into a properties dict, check the developer documentation
```

After the removal, Home Assistant no longer moves these keys. A filter that is still at the top level is then not applied, and the matcher matches every device that announces the service type.

## Moving the filters

Put the keys in `properties`. The values must be lowercase, and can use wildcards. For example, this matcher:

```json
"zeroconf": [
  {
    "type": "_axis-video._tcp.local.",
    "macaddress": "00408C*"
  }
]
```

becomes:

```json
"zeroconf": [
  {
    "type": "_axis-video._tcp.local.",
    "properties": { "macaddress": "00408c*" }
  }
]
```

Read the [manifest documentation](/core/integrations/manifest/#zeroconf) for all the matcher options.

## Background

Since Home Assistant Core 2022.2, zeroconf matchers filter on the TXT record of a device through `properties` ([home-assistant/core#62133](https://github.com/home-assistant/core/pull/62133)). The top-level keys were kept so that existing integrations kept working. Integrations in Home Assistant Core already use `properties`.

The change that sets the removal version is [home-assistant/core#191969](https://github.com/home-assistant/core/pull/191969).

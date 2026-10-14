---
title: Integration brands and images
description: Add the icon and logo of your integration, and group integrations of one brand so users find them.
sidebarGroup: Reference
order: 2
---

Home Assistant shows an icon and a logo for every integration. The icon is square and used where space is tight. The logo is wider and used where there is room, like the page of the integration. Both come in light and dark versions.

Brands are a separate thing: a brand file groups several integrations of one company, so users find all of them under one name.

This page is about integration brands: the companies and products Home Assistant connects to. The brand of Home Assistant itself, its personality, name, and logo, has its own area: [Brand](/brand/).

## Brand images for core integrations

Images of integrations in core live in the [brands repository](https://github.com/home-assistant/brands), not in the [core repository](https://github.com/home-assistant/core). Open a pull request there that adds a folder named after your domain to `core_integrations/`. The images for the Philips Hue integration are in `core_integrations/hue/`.

A folder can hold these files:

| File | What it is |
| --- | --- |
| `icon.png` | The square icon |
| `icon@2x.png` | The icon for high-resolution screens |
| `logo.png` | The logo |
| `logo@2x.png` | The logo for high-resolution screens |
| `dark_icon.png`, `dark_logo.png`, and their `@2x` versions | Versions optimized for a dark background, only if needed |

Missing files fall back: a missing logo uses the icon, and a missing dark version uses the light one. If the logo of a brand is square, only add the icon.

The images have to meet these requirements:

- PNG, properly compressed for the web. Lossless and interlaced are preferred.
- A transparent background is preferred. Images for a white background are the default, `dark_` versions are for a dark background.
- Trimmed: no empty space, borders, or padding around the subject.
- The icon is square: 256 by 256 pixels, and 512 by 512 pixels for `@2x`.
- The logo keeps the aspect ratio of the brand logo, preferably landscape. The shortest side is between 128 and 256 pixels, and between 256 and 512 pixels for `@2x`. Larger within that range is better.

Images are cached, so a merged change can take a while to show up.

### Integrations without a brand

Some integrations, like helpers, have no brand to show. Instead of images, add an `icon.txt` file to the folder with the name of a [Material Design Icon](https://pictogrammers.com/library/mdi/), like `mdi:calculator`.

### Images shared with a brand

If a company brand uses the same images as one of its integrations, put the images in `core_brands/<brand>/` and symlink them from the integration folder, to avoid copies. The Samsung TV integration links to the images of the Samsung brand this way. Symlinks are only allowed between domain folders of core integrations and brands.

## Brand images for custom integrations

Since Home Assistant 2026.3, a custom integration ships its own images, in a `brand/` folder inside the integration folder: `custom_components/my_integration/brand/`. Before that, custom integrations added their images to the brands repository too. Local images take precedence over any images in the brands repository.

If you later contribute the integration to core, remove the `brand/` folder and add the images to the brands repository instead. Custom integrations must not use Home Assistant branded images, so users do not mistake them for an official integration.

## How Home Assistant serves the images

Home Assistant serves brand images through its own API, from the same origin as the frontend:

- `/api/brands/integration/{domain}/{image}` for integration icons and logos
- `/api/brands/hardware/{category}/{image}` for hardware images

These endpoints need authentication, either a normal authenticated session or an access token in a `token` query parameter. The frontend gets that token with the `brands/access_token` WebSocket command and adds it for you. If an image does not exist, the endpoints return a placeholder image. Add `?placeholder=no` to get a 404 instead.

## Brand files

A company can have several integrations for different products. Google has `google` for Google Calendar and `google_sheets` for Google Sheets. A company can also make devices that use a standard like Zigbee, without having an integration of its own. A brand file groups these, so users find them all under the name of the brand.

Brand files live in `homeassistant/brands/` in the core repository, one JSON file per brand:

```json
{
  "domain": "google",
  "name": "Google",
  "integrations": ["google", "google_sheets"]
}
```

```json
{
  "domain": "inovelli",
  "name": "Inovelli",
  "iot_standards": ["zigbee", "zwave"]
}
```

| Key | What it is |
| --- | --- |
| `domain` | The unique domain of the brand. It must match the file name. |
| `name` | The name of the brand |
| `integrations` | The domains of the integrations of this brand. If an integration has the same domain as the brand, it must be in this list. |
| `iot_standards` | The standards devices of this brand use: `homekit`, `matter`, `zigbee`, or `zwave` |

A brand needs at least two integrations, or at least one IoT standard. Otherwise there is nothing to group. The images of a brand go in `core_brands/<domain>/` of the brands repository.

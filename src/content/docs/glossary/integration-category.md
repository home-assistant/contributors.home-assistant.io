---
title: "Integration category"
description: "What an integration is for, like Lighting or Energy, so people can find it by what it does, like on the integrations page of the website."
sidebarGroup: "Core and integrations"
term:
  aliases:
    - "integration categories"
  code:
    - "categories"
    - "ha_categories"
  related:
    - "integration"
    - "manifest"
    - "custom-integration"
    - "entity-category"
    - "integration-connectivity"
  autolink:
    - "integration category"
    - "integration categories"
---

An integration lists one to three categories in the `categories` key of its [manifest](/core/integrations/manifest/#categories). Every integration in core has them, except entity, system, and virtual integrations. For a custom integration, they are optional. The documentation page of an integration in core lists the same ones in `ha_categories`, in its [front matter](/writing/reference/front-matter/) on home-assistant.io. A category can have subcategories, like `energy.ev_charging`. [Integration categories](/core/integrations/categories/) has all of them, and how to choose.

Home Assistant uses the word category for other things too. They are not the same:

- The categories created in Home Assistant itself, to organize automations, scripts, scenes, and helpers. Those live in the category registry, and are the same for everyone using that Home Assistant.
- An [entity category](/glossary/entity-category/) marks an entity as configuration or diagnostic.
- In the Marketplace and the HACS action, `category` is the type of repository: an integration, a dashboard plugin, a theme, or a template.

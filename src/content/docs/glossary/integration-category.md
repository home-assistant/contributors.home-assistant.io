---
title: "Integration category"
description: "What an integration is for, like Lighting or Energy, so people can find it: on the integrations page of the website, in the app, and in the Marketplace."
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
  autolink:
    - "integration category"
    - "integration categories"
---

An integration lists one to three categories in the `categories` key of its [manifest](/core/integrations/manifest/#categories), and its documentation page lists the same ones in `ha_categories`. A category can have subcategories, like `energy.ev_charging`. [Integration categories](/core/integrations/categories/) has all of them, and how to choose.

Home Assistant uses the word category for other things too. They are not the same:

- The categories users create themselves, to organize their automations, scripts, scenes, and helpers. Those live in the category registry, and every user picks their own.
- An [entity category](/glossary/entity-category/) marks an entity as configuration or diagnostic.
- In the Marketplace and the HACS action, `category` is the type of repository: an integration, a dashboard plugin, a theme, or a template.

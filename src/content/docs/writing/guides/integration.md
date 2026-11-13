---
title: Document an integration
description: For developers adding a new integration to Home Assistant. What the documentation needs, and how to get it merged together with your code.
order: 3
---

Every integration in Home Assistant has a page on [home-assistant.io](https://www.home-assistant.io/). When you add an integration, its page is part of the work. Users find the integration through that page, and the integration overview is generated from it.

## Before you start

- Target the `next` branch. Your integration is not released yet, so neither is its page.
- Open one documentation pull request per core pull request, and list each under **This PR belongs together with** in the other.
- Add the icon and logo of the integration to the [brands repository](https://github.com/home-assistant/brands), and pair that pull request with the core pull request the same way.

## Create the page

1. Copy the [integration page template](https://github.com/home-assistant/home-assistant.io/blob/current/source/_integrations/_integration_docs_template.markdown) to `source/_integrations/`.
2. Name the file after the domain of your integration, with the `.markdown` extension, like `my_device.markdown`.
3. Fill in the front matter. It drives the integration overview, the quality scale badge, and more. Every key is explained in [Integration front matter](/writing/reference/front-matter/).
4. Write the page, following the structure of the template. [Integration page structure](/writing/reference/integration-page/) explains what each section is for.
5. Add the integration and its integration owners to the `CODEOWNERS` file of the documentation repository. If you own the integration, you own its documentation too: you are asked to review changes to the page, and you are pinged on feedback that readers leave on it.
6. Remove the comments from the template before you mark the pull request as ready for review.

## What a good integration page covers

The template guides you through the sections. Some things reviewers look for:

- **What the integration does**, and what someone can use it for, in the first lines.
- **Supported devices**, and the ones that are known not to work. Mention firmware versions you tested with when that matters.
- **How to get credentials**, like an API key or access token, step by step.
- **No custom integrations or custom cards** in the steps or examples. Everything should work with what Home Assistant ships.
- **Known limitations and troubleshooting**, so users do not have to find out the hard way.

## When features go away

Remove the documentation of a feature as soon as it is deprecated, not when it is removed: remove its section from the integration page, and do not add a deprecation notice. When a whole integration is deprecated or removed, see [Move, rename, or remove a page](/writing/guides/move-or-remove/).

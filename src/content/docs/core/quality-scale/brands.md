---
title: Provide brand assets
description: "Bronze rule brands: the integration has a logo and icon in the brands repository."
sidebarLabel: brands
sidebarGroup: Bronze
order: 3
---

This is a Bronze rule. In `quality_scale.yaml`, it is called `brands`.

The integration has its branding assets, like its icon and logo, in the [brands repository](https://github.com/home-assistant/brands).

## Why it matters

Users recognize an integration by its logo long before they read its name: in the list of integrations, in the setup dialog, and on the integration page of the documentation. Assets that follow the same requirements keep all integrations looking consistent, and make each one easy to spot.

## What to do

Open a pull request on the brands repository that adds the images for your integration, in `core_integrations/`, in a folder named after its domain. The [README of the brands repository](https://github.com/home-assistant/brands/blob/master/README.md) lists the files you need, their sizes, and the image requirements. Do this early: your integration pull request in core is easier to review when its brand is already there.

## How it is checked

Checked in review.

## Exceptions

There are no exceptions to this rule.


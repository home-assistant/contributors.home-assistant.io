---
title: Leave part of your README out of the Marketplace
description: Mark the parts of your README that are only for GitHub, like installation steps and install badges, and the Marketplace leaves them out.
date: 2026-11-25
authors:
  - Aidan Timson
areas:
  - marketplace
---

Your README does two jobs. On GitHub, it's where people find your repository, so it tells them how to install it, often with a [My link](/glossary/my-link/) badge or an install badge. In the Marketplace, it's shown on the page of your repository, right below an install button. There, those installation steps are in the way.

From Home Assistant 2026.12, one README can do both. Put the parts that are only for GitHub between two HTML comments, and the Marketplace leaves them out:

```markdown title="README.md"
# 3D printer dashboard

Keep an eye on every print: progress, temperatures, and the camera...

<!-- ha-marketplace:exclude-start -->
## Installation

Add this repository in the Marketplace, or install it through HACS.
<!-- ha-marketplace:exclude-end -->

...

## Configuration

...
```

GitHub doesn't show HTML comments, so there your README reads as before.

## The details

- A section runs from the start marker to the next end marker. Without an end marker, it runs to the end of the README.
- The spaces inside the markers are optional, so `<!--ha-marketplace:exclude-start-->` works too.
- Markers inside a code block or inline code are text, not markers. That way, a template README can show them as an example.
- You can mark as many sections as you like.

## When it works

Starting with Home Assistant 2026.12 and its beta, the Marketplace leaves the marked sections out. Older versions show the whole README, as they do today, so you can add the markers now.

## Read more

- [Leave part of your README out of the Marketplace](/marketplace/reference/repository-structure/#leave-part-of-your-readme-out-of-the-marketplace): the reference, next to everything else your repository needs.
- [The change in the frontend](https://github.com/home-assistant/frontend/pull/55571): how the Marketplace finds the markers.

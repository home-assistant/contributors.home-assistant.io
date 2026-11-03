---
title: Foundations
description: Color, typography, spacing, motion, and accessibility. The design tokens and rules behind everything in Home Assistant.
order: 10
---

The foundations are the smallest decisions in the design: which colors exist, which sizes text can have, how much space goes between things, how fast things move. They are defined as [design tokens](/glossary/design-token/) in the [Home Assistant frontend](https://github.com/home-assistant/frontend/tree/dev/src/resources/theme), and every component is built from them.

The color, typography, and spacing pages read the tokens directly. What you see there is what the frontend uses.

- [Color](/design/foundations/color/): the palettes, and the semantic colors built on them.
- [Typography](/design/foundations/typography/): the type scale and font weights.
- [Spacing](/design/foundations/spacing/): the spacing scale and corner radius.
- [Layout](/design/foundations/layout/): content widths and the gutter at the sides of a page.
- [Accessibility](/design/foundations/accessibility/): contrast, focus, keyboard, labels, target size, and screen readers. What WCAG asks, and how the frontend does it.
- [Motion](/design/foundations/motion/): the animation durations, and how reduced motion works.

> [!TIP]
> Designing something new? Stay on the tokens. A custom color or spacing value is a sign that something is missing in the foundations, and that is worth a discussion in the **Design system** category of the [UX design discussions](https://github.com/OpenHomeFoundation/ux-design/discussions).

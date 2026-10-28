---
title: How we design
description: Where design work happens, how an idea becomes part of Home Assistant, who decides, and how research shapes it.
order: 2
---

Design at Home Assistant happens in the open. Proposals, feedback, research, and decisions are public, and anyone can join in: designers, researchers, writers, accessibility experts, and developers. This page shows where that happens, and how an idea travels from a first thought to something people use every day.

## Where design happens

### UX design discussions

The [UX design repository](https://github.com/OpenHomeFoundation/ux-design) of the [Open Home Foundation](/glossary/open-home-foundation/) is the home of design work, for Home Assistant and the other projects of the foundation. Its [discussions](https://github.com/OpenHomeFoundation/ux-design/discussions) are where proposals are shared, reviewed, and decided on. Pick the category that fits what you have:

- **Ideation**: early ideas, problems, and possible improvements, before there is a concrete design.
- **Design review**: designs or work in progress that you want feedback on.
- **Design system**: shared components, patterns, tokens, and guidelines.
- **Accessibility**: inclusive design, accessibility issues, and improvements.
- **UX research and insights**: user research, usability findings, analytics, and other evidence for design decisions.
- **UX strategy and vision**: the long term direction of the experience across the foundation.

The [project board](https://github.com/orgs/OpenHomeFoundation/projects/7) lists the design tasks that are active and planned.

### Discord

The **#designers** channel on the [Home Assistant Discord](https://www.home-assistant.io/join-chat-design) is for quick questions and early feedback. Product and UX discussions happen in **#product-and-ux**. Can't see the channel? Pick the right role under **Channels & Roles**.

### Figma

The [Home Assistant Design Kit](https://www.figma.com/community/file/1697311104929761103/home-assistant-design-kit) on Figma Community is the official Figma library for the Home Assistant interface, maintained by the Open Home Foundation. Its variables, text styles, and components are generated from the [frontend](https://github.com/home-assistant/frontend) source, so what you design matches what ships. It includes light and dark modes, the [components](/design/components/) documented in this area, and usage guidelines with links to the docs and source for each one. Mockups that start from it stay close to what can be built.

### The frontend repository

The [frontend repository](https://github.com/home-assistant/frontend) is where designs become code. Concrete problems in the interface are issues there, with the [`UX`](https://github.com/home-assistant/frontend/labels/UX) or [`Accessibility`](https://github.com/home-assistant/frontend/labels/Accessibility) label. Pull requests that need input from the design team get the [`Needs UX`](https://github.com/home-assistant/frontend/labels/Needs%20UX) label.

## From idea to implementation

Design work follows these steps:

1. **Idea.** Someone notices a problem or has an idea. Start in the **Ideation** category, or check the project board for a task that is already planned.
2. **Discussion.** The idea is discussed in the open, with feedback and research from others.
3. **Proposal.** A concrete design, with mockups or a prototype. Share it in **Design review**, early, and ask for feedback. You don't need a finished design to start.
4. **Review.** Designers, developers, and users react to the proposal, and it changes based on what they say.
5. **Decision.** The direction is settled. Major decisions are summarized and linked to the board item they belong to.
6. **Implementation.** The design is built, usually in the frontend, and the matching page in this area is updated. The discussion links to the pull requests that implement it.

Before you design something new, check the [components](/design/components/) and [patterns](/design/patterns/). Consistency is part of good design.

## Write a proposal

Proposals in the **Design review** category usually follow the same outline. Start from this:

```markdown
## Problem

Who runs into it, when, and why it matters.

## Proposal

What you propose. Add mockups, a prototype, or a short video.
Explain the choices you made.

## Open questions

What you are unsure about, and want feedback on.

## Related

The board item, related discussions, and issues.
```

Lead with the problem. A clear problem keeps the discussion focused, and often makes the solution obvious. Link your discussion to the board item it belongs to, if there is one.

## Who decides

Proposals are reviewed in the UX design discussions, and that is where the direction of a design is settled. Major decisions are summarized there and linked to the board item they belong to.

For code, the frontend reviewers decide. A fix that keeps the established experience normally stays with them. A new card, badge, screen, or interaction pattern is a design decision as much as a code change. When its direction is not settled yet, a reviewer adds the `Needs UX` label and asks the design team for input. Discussing a bigger idea before you write the code saves a rewrite. See [Review and release](/frontend/development/review-and-release/) for how frontend review works.

### Where a component is specified

The Design area on this site is the reference for design guidance: how [components](/design/components/) look and behave, when to use them, their specs, and their accessibility. The same goes for the [foundations](/design/foundations/), the [patterns](/design/patterns/), and the [brand](/brand/). This area replaces design.home-assistant.io.

To change a component:

1. Start with a discussion in the **Design system** category, and settle the direction there.
2. Open a pull request in the [frontend repository](https://github.com/home-assistant/frontend) that changes the component.
3. Open a pull request to [this site](https://github.com/home-assistant/contributors.home-assistant.io) that updates the page of the component.

Found a page that no longer matches the component? One of the two needs a fix. Open an issue or a pull request on this site, or start a discussion when you are not sure which one is right.

## Research

Research keeps design decisions based on what people actually do, not on what the people building Home Assistant assume. The [user research repository](https://github.com/OpenHomeFoundation/user-research) of the Open Home Foundation is the home of that work, and is open to community researchers too.

### Methods

- **User tests.** Before the configuration menu was reorganized into **Settings**, a prototype made in Figma was tested online for ten days, with six questions and three tasks. Anyone could join, and people were recruited on the [forum](https://community.home-assistant.io/), Reddit, and Twitter. 915 people took part and left 407 comments. The conclusions included adding a search bar, and renaming **Configuration** to **Settings**.
- **Surveys.** The 2024 community survey had over 8,600 responses. The anonymized dataset and the questions are published as [open data](https://github.com/OpenHomeFoundation/user-research/tree/main/community-survey24), under CC BY 4.0, for anyone to use.
- **Studies.** The repository also holds a privacy study, with its paper and poster.

Research shows up in the product. For example, research kept showing that people open the dashboard editor with a device or an entity in mind, not a type of card. That is why the dialog to add a card now starts from your devices and entities.

### Taking part

The foundation asks the community to take part in research, like the community survey that was announced on the [blog](https://www.home-assistant.io/blog/2024/12/16/community-survey-2024/), and user tests shared on the forum and social media. Research with participants follows the [User Research Agreement](https://www.openhomefoundation.org/user-research-agreement/) of the Open Home Foundation.

Want to run or analyze research yourself? Share your plan or your findings in the **UX research and insights** category, and see the [research project board](https://github.com/OpenHomeFoundation/user-research/projects). To talk with the people doing user research, join **#user-researchers** on the [Home Assistant Discord](https://www.home-assistant.io/join-chat/).

## Who we design for

Every design decision considers the [three types of users](/design/users/): people who outgrow other smart home platforms, people who love to tinker, and people who want more but need help to get there.

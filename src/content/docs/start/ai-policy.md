---
title: AI policy
description: The Open Home Foundation AI policy. You can use AI tools when you contribute, but you are responsible for every change you submit, and autonomous agents are not allowed.
order: 7.5
---

This is the AI policy of the [Open Home Foundation](/glossary/open-home-foundation/). It applies to every contribution to Home Assistant and the other projects of the foundation: code, documentation, design, issues, pull requests, comments, and reviews.

## In short

- You can use AI tools to help you contribute.
- You are responsible for everything you submit. You must understand it, and be able to explain every change in your own words.
- Autonomous agents are not allowed. Pull requests and issues created by them are closed.
- Answer questions from maintainers yourself, not with AI.

## Why this policy exists

We support using AI, like large language models, as a tool when you contribute. But you are responsible for the contributions you submit, and we are responsible for the contributions we merge and release. We hold a high bar for all of them.

Maintainers spend their time and expertise on reviewing contributions. Submitting AI-generated content that you haven't reviewed and understood yourself wastes that time, and it won't be accepted.

## Autonomous agents

We don't allow autonomous agents to contribute to our projects. We close pull requests and issues that we believe were created autonomously, and we may mark automated comments as spam. That includes contributions that bypass the issue or pull request templates.

## Issues, pull requests, and reviews

You can use AI tools to help you write. But don't let a tool post content on your behalf that you haven't reviewed. Keep your responses to what is needed to make your point. We may hide comments that we believe are unreviewed AI output.

When you open a pull request, you must be able to explain the proposed changes in your own words. That includes the description and your answers to questions. If AI helped you write the description, check it for technical accuracy.

Don't use AI to answer questions from maintainers. You should understand your own work and be able to explain it. Using AI to improve grammar or clarity is fine, but the substance of your answers must be your own.

Want to include something from a conversation with an AI? Put it in a quote block, using `>`, and say where it came from. Add your own comment that explains why it matters. Don't share long snippets.

## Non-native English speakers

AI is useful when English isn't your first language. Using it to improve the grammar or clarity of text you wrote yourself is fine.

If you use AI to translate your comments, make sure the translation says what you mean. Consider adding your original text in a details block, like this:

```markdown
<details>
<summary>Original text</summary>

Your text in your own language.

</details>
```

It shows the effort behind your contribution, helps maintainers check the translation when needed, and keeps the conversation readable.

## Code and documentation

AI can be a helpful tool to write code and documentation. But our projects are open source foundations that many people build on, so we require a human in the loop who understands the work the AI produced.

Review and understand every contribution before you submit it. You should be able to explain every change in your pull request. Pull requests that look like unreviewed AI output are closed without review.

## Design

AI can be a helpful tool to explore ideas and build mockups and prototypes. But AI tends to give the most common answer, not the one that fits Home Assistant and its users. So we require a human who brings the point of view and owns the design decisions.

You should be able to explain the problem your design solves and why you made your choices. If a mockup or prototype was mostly generated with AI, say so when you share it. Check your work against the [design guidelines](/design/), as AI tools often make up components, colors, or spacing that don't exist in Home Assistant. Design proposals that look like unreviewed AI output may be closed or hidden.

## How we use AI

Some of our projects use AI tools to help with code reviews, triaging issues, reporting, and other project management tasks. These tools may leave comments on your pull requests or issues. Like any automated tool, they aren't always right.

We also use AI to help keep the design system, the Figma kit, and the code in sync. The design decisions behind them are made by people.

Treat a comment from an AI tool like any other review comment. If you think it's wrong, say so. A short explanation is enough. Maintainers always have the final say. If in doubt, ask a maintainer.

## Enforcement

Contributions that don't follow this policy are closed. Repeated violations can get you blocked from contributing to Open Home Foundation projects. If you think your contribution was closed by mistake, reach out to a maintainer to talk about it.

## What the pull request templates ask

Several repositories ask about AI in their pull request template. Leave those parts in place, and answer them honestly.

- **Home Assistant Core and the frontend** have two checkboxes in the checklist: "I understand the code I am submitting and can explain how it works", and "Any generated code has been carefully reviewed for correctness and compliance with project standards".
- **The Android and iOS apps** ask you to confirm that you read the AI policy, and to select exactly one of three options: you didn't use AI, AI assistance was used, or AI fully generated the code but you reviewed and understood it, and will respond without AI during the review.

Using AI tools is allowed. What matters is that you understand what you submit.

For the practical side, like the skills the repositories carry for AI tools and workflows for common tasks, see [Contribute with AI tools](/start/ai-tools/).

## Where this policy lives

A copy of this policy is in [`AI_POLICY.md`](https://github.com/home-assistant/.github/blob/master/AI_POLICY.md), in the `.github` repository of the Home Assistant organization on GitHub. The contributing guidelines there refer to it. If the two ever differ, that file says the published version applies.

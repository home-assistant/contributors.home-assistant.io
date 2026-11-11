---
title: Structure a page
description: Organize documentation around what the reader wants to know or do, with concepts, tasks, references, tutorials, and troubleshooting.
order: 1
---

Every reader arrives with a question. What is this? How do I set it up? What does this setting do? Why is it not working? Good documentation is organized around those questions, not around how a feature is built.

That approach is called topic-based authoring. A topic answers one main question. It can be a whole page, or a single section on a page. You do not need a separate page for every topic.

Integration, trigger, condition, and action pages have a fixed structure of their own, so they all read the same way. For those, start with [Document an integration](/writing/guides/integration/) and the [Integration page](/writing/reference/integration-page/) reference. The guidance on this page then applies within each section.

## Start with the overview

Open every page with a short introduction: what the page is about, and who it is for. Then work from basic to more complex. The information most readers need comes first, the details fewer readers need come later. Break longer pages into sections with clear headings, so readers can jump to the part they came for.

## Put the UI first

When something can be done in the Home Assistant interface, the UI is the standard way, and you describe it first. That goes for every kind of topic: tasks, references, tutorials, and troubleshooting.

YAML and command line alternatives are welcome where they are supported and useful. Put them after the UI instructions, under their own heading, and explain when someone would need them. Do not suggest that editing files is a normal part of the setup when the UI can do the job.

## One purpose per section

The most common problem in documentation is a section that tries to do everything at once: explain the concept, walk through the steps, and list every option. The reader then has to dig for the part they need.

Give each purpose its own heading. A page about areas, for example, can hold three topics:

```markdown
## Areas
<!-- Concept: what an area is, and why you would use one. -->

## Creating an area
<!-- Task: the steps to create one. -->

## Area settings
<!-- Reference: every setting, and what it means. -->
```

Keep each topic focused on one subject or goal:

- A concept explains one idea.
- A task covers one goal.
- A reference describes one set of related facts or options.
- A troubleshooting topic handles one problem.
- A tutorial can combine several tasks, as long as they serve one learning goal.

When you notice you are describing a second task, give it its own topic. If creating an area requires creating a floor first, the floor steps get their own section, on the same page or on another one. Link to it from the area steps. Steps that directly contribute to the outcome of the task stay together.

Not every sentence of context needs its own section. A short introduction, a prerequisite, or one line explaining why a step matters belongs right next to that step. Longer background and complete option lists are what you move out.

A parent heading can group several topics under subheadings. A troubleshooting section can group a details block per problem. Just keep the text under each heading about what that heading promises.

## Choose a topic type

Choose the type by what the reader needs:

- [Concept](#concept): understand what something is, why it matters, or how it works.
- [Task](#task): complete a specific goal.
- [Reference](#reference): look up a fact, setting, value, or behavior.
- [Tutorial](#tutorial): learn by following a guided exercise that ends with something that works.
- [Troubleshooting](#troubleshooting): recognize a problem and fix it.

The subject does not decide the type. Areas can be the subject of a concept, a task, and a reference, as in the example above. UI and YAML are not types either: they are two ways to do a task, or to describe configuration.

## Concept

A concept explains what something is, and helps the reader understand it. Use it for definitions, how things relate to each other, design choices, and reasons to use a feature.

### Headings for concepts

- Use a noun or a descriptive phrase: "Areas", "Parts of an automation", or "Wake word processing".
- A question works when it says what the reader wants to know more clearly: "What is data polling?"
- Avoid "Introduction" or "Overview" when you can name the subject instead.

### Content for concepts

Start with a plain explanation. Add a concrete example, and explain relationships or trade-offs that matter. Define unfamiliar terms, or link to their definition, for example with a [glossary tooltip](/writing/reference/liquid/#glossary-tooltips).

```markdown
## Areas

An area groups devices and entities that belong to a room or another part of your home. For example, a living room area lets you target all the lights in that room with one action.
```

Keep setup instructions out of a concept, and link to the task instead. A concept that turns into a list of options or a long series of UI steps is no longer a concept: put the options in a reference topic, and link to it.

## Task

A task helps the reader reach a specific goal. The reader wants to get something done, not work through a lesson.

### Headings for tasks

- Name the action and its object: "Creating an area", not "Task".
- An `-ing` phrase, like "Creating an area" or "Updating Home Assistant", matches what most existing pages use.
- An imperative works well for the stages of a longer procedure: "Write the image to your SD card". Number the stages when their order matters.
- Keep sibling headings parallel. If one starts with an `-ing` verb, they all do.
- Avoid vague headings like "Usage", "Configuration", or "Working with areas" when the task has a more specific outcome.

### Content for tasks

1. If the heading does not make it clear, say in a few sentences when or why you would do this, and link to relevant information.
2. List the prerequisites directly before the steps, under a `Prerequisites:` lead-in, like hardware, permissions, or setup that must be done first. Use a separate `## Prerequisites` section only when the requirements apply to the whole page. No prerequisites worth mentioning? Leave the list out.
3. Write the steps as a numbered list. Start each step with the instruction. Put explanations or the expected result below it.
4. End with the outcome and, when useful, a way to check that it worked.

```markdown
## Creating an area

1. Go to {% my areas title="**Settings** > **Areas, labels & zones**" %} and select **Create area**.
2. Enter a **Name** for the area.
3. Select **Create**.
   - Result: The new area appears in the list.
```

Keep the steps focused on the goal. Long explanations, descriptions of every field, and other procedures belong elsewhere. Link to the concept or reference instead.

## Reference

A reference holds facts the reader looks up, without following a procedure. Use it for settings, supported values, syntax, response data, and other defined behavior.

### Headings for references

- Name the information: "Area settings", "Blueprint inputs", or "Response data".
- Avoid catch-all headings like "Important information" or "Good to know" when the content has a more specific subject.

### Content for references

- **Use the same structure for every entry.** For settings, give the name, what it does, the accepted values, and the default, where those apply.
- **Make required and optional clear.**
- **Use the names the reader sees.** UI labels for UI settings, exact keys for YAML options.
- **Keep constraints next to the setting they apply to,** not in a separate list further down.
- **Make it easy to scan.** Use a list, or the configuration blocks described in [Integration page](/writing/reference/integration-page/). Avoid tables, see the [style guide](/writing/reference/style/#tables).

```markdown
## Area settings

- **Name**: The name of the area. Required.
- **Alias**: Another name a voice assistant can use for the area.
```

A short example can show a valid value or the right syntax. Do not let it grow into a tutorial, and do not hide setup steps inside field descriptions.

## Tutorial

A tutorial teaches a skill through a guided example. At the end, the reader has something that works, which they can keep or adapt.

The difference with a task is purpose, not difficulty. A task helps readers do their own work. A tutorial gives them an exercise to learn from. A simple procedure is not automatically a tutorial, and a tutorial can teach something complex.

### Headings for tutorials

- Start the title with "Tutorial:", followed by the action and the outcome: "Tutorial: Create your first automation".
- Name each stage after what the reader does in it, with consistent wording.
- Number the stages when their order matters.

### Content for tutorials

State what the reader will build and learn, and what they need before they start. Then guide them through one chosen path, in stages small enough to follow. Show the expected result along the way, and end with a final check.

```markdown
## What you will build
<!-- An automation that turns on a light before sunset. -->

## Prerequisites

## Step 1: Create the automation

## Step 2: Add the sunset trigger

## Step 3: Add the light action

## Step 4: Save and test the automation

## Next steps
```

- Keep explanations close to the step they help with.
- Link to concepts and references instead of interrupting the exercise with them.
- Do not show every alternative or optional feature along the way. Put extensions after the main exercise, for example under "Next steps".
- A collection of code examples is not a tutorial. A tutorial guides the reader through a learning experience.

## Troubleshooting

A troubleshooting topic helps the reader recognize a problem and recover from it.

### Where troubleshooting goes

Keep the troubleshooting for a page in one place, so the reader knows where to look when something goes wrong:

- In a section of the page: put the problems in a `## Troubleshooting` section at the end of the page. On an integration page, the section goes in its place in the [section order](/writing/reference/integration-page/#sections).
- On a page of its own: when a feature has many problems, move them to a separate troubleshooting page. Link to it from the page of the feature.

Do not put troubleshooting next to the part of the page it relates to, like a troubleshooting subsection under one feature or setting.
Put the problem in the troubleshooting section of the page instead.
When it helps, link to the troubleshooting section from the part of the page it relates to.

### Headings for troubleshooting

- Put each problem in its own [collapsible details block](/writing/reference/liquid/#collapsible-details).
- Use the symptom or the exact error message as the title of the block, like `Can't access Home Assistant in my browser` or `Stuck at "Preparing Home Assistant"`.
- For a separate troubleshooting page, use "Troubleshooting" followed by the subject: "Troubleshooting Assist".
- Avoid titles that only make sense once you know the cause. The reader searches for what they see, not for what is wrong.

### Content for troubleshooting

Inside each block, use the same three parts:

1. **Symptom:** what the reader sees, in their words. Include the exact error message, if there is one.
2. **Description:** what is going on, when that helps. Do not present a possible cause as certain.
3. **Resolution:** what to do about it. Put simple checks before more involved ones, explain what an action does before the reader takes it, and tell them how to confirm the problem is gone.

Leave out a part when it adds nothing, like a description for a very short topic. This is how it looks on a page:

```liquid
## Troubleshooting

{% details "The device shows as unavailable" %}

### Symptom

All entities of the device show as unavailable.

#### Description

Home Assistant can't reach the device on your network. This often happens when the device gets a new IP address from your router.

#### Resolution

1. Check that the device is powered on and connected to your network.
2. Give the device a fixed IP address in your router.
3. Go to {% my integrations title="**Settings** > **Devices & services**" %}, select the integration, and reload it.

The entities become available again within a minute.

{% enddetails %}
```

If the checks do not solve the problem, link to the right place for help, and say what information to include, like logs or diagnostics. A link to the community forum on its own is not troubleshooting.

Keep normal setup steps in task topics. When a missed setup step could explain the problem, link to that task instead of repeating it.

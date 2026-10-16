---
title: Documentation style guide
description: The language, tone, and Markdown formatting rules for every page on home-assistant.io.
order: 1
sidebarLabel: Style guide
---

The documentation follows the [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/). For spelling and word usage, it uses [Merriam-Webster](https://www.merriam-webster.com/), the same dictionary Microsoft relies on. This page lists the rules we add on top, and the ones you run into most.

Pages are written in [GitHub Flavored Markdown](https://github.github.com/gfm/), with some [Liquid helpers](/writing/reference/liquid/) for things Markdown cannot do. Images and videos have [their own page](/writing/reference/images/), and so do [YAML examples](/writing/reference/yaml/). How to organize a page is covered in [Structure a page](/writing/guides/structure/).

## Language and tone

- **Write in American English.** Home Assistant is used all over the world, and many readers are not native English speakers. Short sentences and plain words help everyone.
- **Talk to the reader.** Use "you" and "your", not "the user" or "users".
- **Be friendly and direct.** Write like you are explaining something to a friend who enjoys technology. Informative and personal, not formal or technical.
- **Write for people who use the UI.** Most readers never open a YAML file. Show the UI path first, and treat YAML or other manual configuration as an option for when it is needed.
- **Make Home Assistant feel approachable.** Avoid wording that makes it sound fragile, difficult, or easy to break. Do not call YAML or more complex features "advanced", unless the product itself uses that word.
- **Be honest.** Do not hide limitations or complexity behind marketing language. Say what something can and cannot do.
- **Be inclusive.** Keep the writing objective and free of gender bias, polarizing statements, and anything that excludes people based on race or religion. Writing that does not follow this may breach the [Code of Conduct](https://github.com/home-assistant/home-assistant.io/blob/current/CODE_OF_CONDUCT.md).

## Words and terminology

- **Write "Home Assistant" in full.** Not "HA" or "HASS".
- **Use "select", not "click".** "Click" only works for a mouse. "Select" works for touch screens, keyboards, and screen readers too. Use "click" only when you describe a specific mouse action, like right-click or double-click.
- **Skip Latin abbreviations.** Do not write "e.g.", "i.e.", "etc.", or "etcetera". Use "like", "for example", or "such as" instead.
- **Do not use "master/slave".** Use [an alternative](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/m/master-slave) that fits the context, such as "client/server", "leader/follower", "main/replica", or "controller/device".
- **Match the official spelling of names.** Brands, services, protocols, integrations, and platforms are written the way their owners write them. For example, "Z-Wave", not "Zwave", "Z-wave", "Z Wave", or "ZWave". The same goes for "GitHub", "WebSocket", and "Wi-Fi".
- **Use glossary terms consistently.** When a page uses a Home Assistant term like entity, device, or integration, use it the way the [glossary](/glossary/) defines it. On [home-assistant.io](https://www.home-assistant.io/) you can show the definition as a tooltip, see [glossary tooltips](/writing/reference/liquid/#glossary-tooltips).

The automated checks enforce a long list of brand and product spellings. That list lives in [`.textlintrc.json`](https://github.com/home-assistant/home-assistant.io/blob/current/.textlintrc.json). If the check flags a name that is spelled correctly, add it there in the same pull request. See [Automated checks](/writing/reference/checks/) for how the checks work.

## Punctuation and grammar

- **Use the Oxford comma.** In a list of three or more items, put a comma before the "and" or "or": "Zigbee, Z-Wave, and Matter".
- **End sentences with a period.** Follow normal grammar rules, also in list items that are full sentences.
- **Use one space after a period.** Never two.
- **Go easy on em dashes.** Too many of them produce long, tangled sentences, and they are a common sign of machine-written text. Restructure the sentence instead:
  - Split a long sentence into two shorter ones.
  - Introducing a list or an explanation? Use a colon.
  - Adding an aside? Use parentheses or commas.

  If a dash is really the best choice, follow the [Merriam-Webster style](https://www.merriam-webster.com/grammar/em-dash-en-dash-how-to-use): an em dash without spaces around it. Hyphens in compound words, like "built-in" or "Z-Wave", are fine.

## Formatting basics

- **Write in flowing text.** There is no line length limit. Keep each paragraph on a single line, and do not wrap lines at a fixed width. This makes pages easier to edit, especially in the online editor on GitHub.
- **Prefer Markdown over HTML.** Use HTML only when Markdown cannot do the job, like for an image with a caption.
- **Surround blocks with blank lines.** Headings, lists, code blocks, and text boxes all need an empty line before and after them.

## Headings

The title of a page is its first-level heading. It comes from the `title` in the front matter at the top of the file, so you never write a `#` heading yourself:

```markdown
---
title: "Create an automation"
---
```

The content of the page starts at heading level 2. Use Markdown headings with `#` characters, from level 2 to level 6:

```markdown
## Heading level 2
### Heading level 3
#### Heading level 4
##### Heading level 5
###### Heading level 6
```

- **Use sentence case.** Capitalize the first word and proper names only: "Create an automation", not "Create An Automation". Microsoft has [more on capitalization](https://learn.microsoft.com/en-us/style-guide/capitalization).
- **Do not skip levels.** A level 4 heading always sits under a level 3 heading.
- **Know what shows up in the table of contents.** On home-assistant.io, only heading levels 2 and 3 appear in the table of contents next to the page. Put anything a reader needs to find on its own under a level 2 or 3 heading.
- **Name the subject.** A heading like "Area settings" tells the reader what follows. "Overview" or "Good to know" does not. [Structure a page](/writing/guides/structure/) has advice per type of section.

## Emphasis

- **Italics for emphasis.** Use underscores: `_emphasized words_`. Do not use single asterisks.
- **No capitals for emphasis.** Writing in ALL CAPS reads as shouting.
- **No bold for emphasis.** Bold is reserved for UI elements. Do not use bold text as a replacement for a heading either.

Use emphasis sparingly. When everything stands out, nothing does.

## UI elements and steps

Write the names of UI elements in bold, using double asterisks: `**Settings**`. Write them exactly as they appear in the interface.

To describe a path through the interface, use a greater-than sign (`>`) between the steps. The `>` itself is not bold:

```markdown
1. Go to **Settings** > **Devices & services**.
2. Select **Restart Home Assistant** > **Quick reload**.
```

When the path starts at a page in Home Assistant, use a [My link](/writing/reference/liquid/#my-links) so the reader can jump straight to that page in their own installation. To point at an icon in the interface, use an [inline icon](/writing/reference/liquid/#inline-icons).

## File paths, names, and input

Use backticks for file paths, file names, variable names, and any text the reader types into a field:

- The `/boot/config.txt` file
- The `configuration.yaml` file
- The `this` variable
- Enter `/newbot`

When a value in an example needs to be replaced with the reader's own, write it in capitals with underscores, like `YOUR_API_KEY` or `REPLACE_ME`.

## Lists

- **Pick the right kind.** Use a numbered list for steps that happen in order. Use bullets when the order does not matter.
- **Use `-` for bullets.** Not `*` or `+`.
- **Number ordered lists properly.** Write `1.`, `2.`, `3.`, not `1.` on every line.
- **Start each item with a capital letter,** unless there is a reason not to, like a command or a code value.
- **Keep punctuation consistent.** If at least one item is a complete sentence, end every item with a period. If none are, use no periods at all.
- **Do not end items with semicolons, commas, or "and" or "or".**
- **Leave a blank line before and after the list.**

```markdown
1. Select **Create area**.
2. Enter a **Name** for the area.
3. Select **Create**.
```

## Code blocks

Use fenced code blocks with three backticks, and always name the language right after the opening backticks:

````markdown
```yaml
automation:
  - alias: "Turn on the porch light at sunset"
```
````

Syntax highlighting on home-assistant.io uses [Prism](https://prismjs.com/). Common language names are:

- `yaml` for configuration and automations (templates inside YAML are highlighted too)
- `template` or `jinja2` for standalone templates
- `bash` or `shell` for commands
- `json`
- `python`
- `markdown`
- `html`
- `text` for plain output, like log lines

Some more rules for code blocks:

- **Stay under 80 characters per line.** Longer lines force readers to scroll sideways, especially on a phone.
- **No `$` prompt in front of commands.** Readers copy commands straight from the page, and a prompt breaks that. Only use one when the block also shows output, and the prompt is needed to tell the command apart from what it prints.
- **Nest fences with more backticks.** To show a code block inside a code block, give the outer fence more backticks than the inner one. Four backticks around a block that uses three, five around a block that uses four.

`````markdown
````markdown
```yaml
key: value
```
````
`````

YAML examples have their own rules for indentation, quoting, and more. See [YAML style](/writing/reference/yaml/).

## Tables

Avoid tables. Many people read the documentation on a phone, and a wide table on a small screen is hard to use. A list almost always works better:

- A table with two columns is a list in disguise. Write it as one.
- If you cannot avoid a table, keep the number of columns low and the text in each cell short.
- For configuration options, use the blocks described in [Integration page](/writing/reference/integration-page/) instead.

## Links

Links to other pages on home-assistant.io follow the published URL, not the file in the repository:

- **Use absolute paths,** starting with `/`.
- **Leave out the `source` directory.**
- **Leave out the leading underscore** of the first directory.
- **End with a slash instead of a file extension** like `.markdown`, `.md`, or `.mdx`.
- **Do not write the full domain.** Use `/integrations/date/`, not `https://www.home-assistant.io/integrations/date/`.

For example, to link to `source/_integrations/date.markdown`:

```markdown
[Date](/integrations/date/)
```

When a page mentions an integration or a platform, link its name to its documentation page, like `[Philips Hue](/integrations/hue/)`. Readers can then jump straight to the details.

For links in general:

- **No bare URLs.** Do not paste `https://example.org` or `<https://example.org>` into the text. Give every link a descriptive text.
- **No affiliate or tracking links.**
- **Link text describes the destination.** Avoid "here" or "this link".

## Abbreviations and acronyms

Avoid abbreviations and acronyms where you can. When you do need one, wrap it in an `<abbr>` tag. Readers then see the full term as a tooltip:

```html
<abbr title="Audio & video">A/V</abbr>
<abbr title="current transformers">CT</abbr>
<abbr title="Dutch smart meter requirement">DSMR</abbr>
<abbr title="embedded MultiMediaCard">eMMC</abbr>
<abbr title="flash video">FLV</abbr>
<abbr title="Large Language Models">LLMs</abbr>
<abbr title="Model Context Protocol">MCP</abbr>
<abbr title="pan, tilt, and zoom">PTZ</abbr>
<abbr title="real-time messaging protocol">RTMP</abbr>
<abbr title="real-time streaming protocol">RTSP</abbr>
<abbr title="USB-On-The-Go">USB-OTG</abbr>
```

For Home Assistant's own terms, a [glossary tooltip](/writing/reference/liquid/#glossary-tooltips) is the better choice.

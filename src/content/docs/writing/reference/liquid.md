---
title: Liquid helpers
description: Every Liquid tag home-assistant.io adds on top of Markdown, from My links and glossary tooltips to text boxes and reusable snippets.
order: 3
---

[home-assistant.io](https://www.home-assistant.io/) is built with Jekyll, which uses [Liquid](https://shopify.github.io/liquid/) for templating. On top of plain Markdown, the site adds a set of Liquid tags for things Markdown cannot do: links into the reader's own Home Assistant, glossary tooltips, icons, text boxes, and more.

Use them where they help the reader, not because they are there. Tags that wrap content, like text boxes, have a matching closing tag that starts with `end`:

```liquid
{% tip %}
This text is inside the tag.
{% endtip %}
```

## My links

A My link opens a page in the reader's own Home Assistant installation. Use one whenever you send the reader to a place in the interface, so they can jump straight there instead of searching through menus:

```liquid
Go to {% my integrations title="**Settings** > **Devices & services**" %} and select your integration.
```

The first word after `my` is the name of the page. The `title` is the link text. Write it as the UI path, in bold with `>` between the steps, the same as any [UI path](/writing/reference/style/#ui-elements-and-steps).

These are the My links you will need most:

```liquid
- {% my areas title="**Settings** > **Areas, labels & zones**" %}
- {% my automations title="**Settings** > **Automations & scenes**" %}
- {% my backup title="**Settings** > **System** > **Backups**" %}
- {% my general title="**Settings** > **System** > **General**" %}
- {% my integrations title="**Settings** > **Devices & services**" %}
- {% my labs title="**Settings** > **System** > **Labs**" %}
- {% my logs title="**Settings** > **System** > **Logs**" %}
- {% my network title="**Settings** > **System** > **Network**" %}
- {% my profile title="**User profile**" %}
```

### Find the name of a page

Open the page in Home Assistant and press `m` on your keyboard. Home Assistant shows the My link for that page, if there is one. The name is the last part of the link: for `https://my.home-assistant.io/redirect/logs/`, it is `logs`.

The [My link creator](https://my.home-assistant.io/create-link/) lists every My link, with the parameters it takes.

### Other options

Most My links only need a `title`. A few more options exist for special cases:

- `badge` shows the link as a My badge image instead of text. A badge cannot have a `title`.
- `domain` sets the integration for pages that need one, like `config_flow_start`, which starts setting up a specific integration.
- `addon`, `blueprint_url`, `brand`, `repository_url`, and `service` pass the app, blueprint, brand, repository, or action that the page should open.
- `search` fills in the search field on pages that have one, like `logs`.
- `provider`, `integration`, and `raw` pick what the `logs` page shows. `provider` is the log to open, like `supervisor` or an app slug. `integration` filters the Home Assistant Core log to one or more integrations, separated by commas. `raw` shows the full Home Assistant Core log instead of only the errors.

```liquid
{% my config_flow_start badge domain="hue" %}
{% my blueprint_import badge blueprint_url="https://example.com/blueprint.yaml" %}
{% my logs title="**Settings** > **System** > **Logs**" provider="supervisor" search="token" %}
```

Without a `title`, the link falls back to a default text. That default does not always follow the [style guide](/writing/reference/style/), so add a `title` for links in running text.

## Glossary tooltips

Home Assistant has its own vocabulary: entities, devices, integrations, areas, and many more. The [glossary](https://www.home-assistant.io/docs/glossary/) explains them. Mark a term on your page, and readers see its definition in a tooltip, often with a link to learn more:

```liquid
{% term <term> [<text>] %}
```

Some examples:

```liquid
{% term integration %}
{% term entity %}
{% term "configuration.yaml" %}
{% term "Home Assistant Operating System" %}
```

- **Quote terms with spaces or dots.** A single word can go without quotes.
- **Aliases work too.** Each glossary entry can list aliases, like a plural form. So `automations` works as well as `automation`. Matching ignores capitalization.
- **The term must exist.** The build fails when a term is not in the glossary, so the Deploy Preview catches typos for you.

By default, the tooltip shows the term itself as the text. To put the tooltip on different words, add the text after the term:

```liquid
I used an {% term automation "automation to turn on the lights" %} at sunset.
```

You do not need to mark every occurrence of a term. Mark it the first time it appears on the page, or where a reader is most likely to stumble over it.

### Add a term to the glossary

Missing a term, or found a definition that could be clearer? Edit [`source/_data/glossary.yml`](https://github.com/home-assistant/home-assistant.io/blob/current/source/_data/glossary.yml). Entries are sorted alphabetically, and each one can have these keys:

- `term`: the term itself. Required.
- `definition`: the full explanation, shown on the glossary page. Required.
- `excerpt`: a shorter version for the tooltip. Add one when the definition is long.
- `link`: a page where the reader can learn more.
- `aliases`: other forms of the term that should match, like the plural.

```yaml
- term: Scene
  definition: >-
    Scenes capture the states you want certain entities to be. For example, a
    scene can specify that light A should be turned on and light B should be
    bright red.
  link: /integrations/scene/
  aliases:
    - scenes
```

The [glossary on this site](/glossary/) is a different one. It explains the terms used when contributing to Home Assistant.

## Inline icons

To point at an icon in the interface, show it inline. The icons come from the [Material Design Icons set on Iconify](https://icon-sets.iconify.design/mdi/), the same set Home Assistant uses:

```liquid
Select the three dots {% icon "mdi:dots-vertical" %} menu.
```

The icon gets a tooltip based on its name. To set your own, add a `title`:

```liquid
{% icon "mdi:dots-vertical" title="Three dots menu" %}
```

The icons you will need most:

```liquid
- Three dots menu: {% icon "mdi:dots-vertical" %}
- Hamburger menu: {% icon "mdi:menu" %}
- Edit: {% icon "mdi:edit" %}
- Revert: {% icon "mdi:restore" %}
- Eye: {% icon "mdi:eye" %}
- Trash: {% icon "mdi:trash" %}
- Cog: {% icon "mdi:cog" %}
- Cog outline: {% icon "mdi:cog-outline" %}
- Drag: {% icon "mdi:drag" %}
- Move cursor: {% icon "mdi:cursor-move" %}
- Arrow left: {% icon "mdi:arrow-left-bold" %}
- Arrow right: {% icon "mdi:arrow-right-bold" %}
- Checkbox list: {% icon "mdi:order-checkbox-ascending" %}
- Upload network: {% icon "mdi:upload-network" %}
- Security network: {% icon "mdi:security-network" %}
- Routes: {% icon "mdi:routes" %}
```

To find the name of any other icon, search for it on Iconify, and put `mdi:` in front of the name.

## Collapsible details

A details block hides content until the reader opens it. Use it for content most readers can skip, like how to get credentials from a vendor, or a list of troubleshooting problems where each reader only needs one:

```liquid
{% details "Generate a client ID and client secret" %}

1. Register your account as a developer account at the vendor's developer portal.
2. Create a new application.
3. Enter an **Application name** of your choice, for example **Home Assistant**.

{% enddetails %}
```

- **The title is required,** in quotes. Write it so the reader knows what is inside without opening it. For troubleshooting, use the symptom or error message.
- **Markdown works in the title,** like backticks for code.
- **Add an icon** in front of the title with the `icon` option, like `icon="mdi:information"`.
- **Leave blank lines** after the opening tag and before the closing tag, so the Markdown inside renders properly.

Use the Liquid details block, not the HTML `<details>` element. The Liquid version matches the look of the site.

## Text boxes

Text boxes make information stand out from the text around it. They only work when they are rare: a page full of boxes has nothing that stands out. Before you add one, ask yourself if a plain sentence would do.

There are six kinds. Pick the one that matches the message:

- **Tip:** a recommendation that makes something easier or better. Nothing goes wrong if the reader skips it.
- **Note:** extra information that helps, but is not part of the main flow.
- **Important:** something the reader must not miss to succeed, like a requirement.
- **Caution:** an action that can cause data loss, unexpected behavior, or other results that are hard to undo.
- **Warning:** a risk to the security or integrity of the system, or of physical harm. The strongest box. Save it for when it is really needed.
- **Labs:** marks a feature that is a Labs preview feature, and tells the reader how to turn it on.

```liquid
{% tip %}
Group your lights in an area, so you can turn them all off with one action.
{% endtip %}

{% note %}
The integration updates the data every 5 minutes.
{% endnote %}

{% important %}
Your device needs firmware version 2.0 or later.
{% endimportant %}

{% caution %}
Removing the integration also removes all its entities from your automations.
{% endcaution %}

{% warning %}
Disconnect the power before you open the device.
{% endwarning %}

{% labs %}
Requires the **Feature name** Labs preview feature. Enable it at {% my labs title="**Settings** > **System** > **Labs**" %}.
{% endlabs %}
```

Each box shows its kind as a heading, like **Tip**. To add to that heading, use `title`. To replace the default icon, use `icon`:

```liquid
{% note title="Older devices" icon="mdi:router-wireless" %}
Devices from before 2020 need a firmware update first.
{% endnote %}
```

That box shows **Note: Older devices** as its heading.

## Example blocks

The `example` block shows an automation, script, template, or other code with a label above it, and with glossary tooltips and syntax highlighting built in. Use it for examples readers are meant to understand and adapt, rather than a plain code block.

The content is YAML. Its first key sets the label, and the code goes below it as a block with `|`:

```liquid
{% example %}
automation: |
  alias: "Match fan to ceiling light"
  triggers:
    - trigger: light.brightness_changed
      target:
        entity_id: light.living_room_ceiling
      options:
        threshold: 10
  actions:
    - action: fan.set_percentage
      target:
        entity_id: fan.living_room
      data:
        percentage: >-
          {{ state_attr('light.living_room_ceiling', 'brightness_pct') | int }}
{% endexample %}
```

These keys set the kind of input, and the label shown above it. They are defined in [`plugins/example.rb`](https://github.com/home-assistant/home-assistant.io/blob/current/plugins/example.rb):

- `action`
- `automation`
- `condition`
- `script`
- `template`
- `trigger`

Use one of them per block. Three optional keys add more:

- `output` shows the result of the code below it, with an arrow in between. This is especially useful for templates.
- `type` names the kind of result, shown next to the output label. For example, `string` or `number`.
- `title` adds a short description to the label, like **Template: Format a temperature**.

```liquid
{% example %}
template: |
  {% from 'formatter.jinja' import format_entity %}
  {{ format_entity('sensor.outdoor_temperature') }}
  {{ format_entity('sensor.indoor_temperature') }}
output: |
  Outdoor temperature: 22.5
  Indoor temperature: 21.0
{% endexample %}
```

The 80 character limit for code blocks applies here too. Break long templates over multiple lines with `>-`, like in the first example.

## Reusable text

Some text appears on many pages, like the steps to add an integration. Instead of copying it, include a shared snippet from [`source/_includes`](https://github.com/home-assistant/home-assistant.io/tree/current/source/_includes):

```liquid
{% include integrations/config_flow.md %}
```

The path is relative to `source/_includes`. When the shared text changes, every page that includes it changes with it.

Some snippets take parameters. Check the snippet file to see which ones it reads: anything written as `include.<name>` in the file is a parameter.

```liquid
{% include integrations/wwha.md url="https://www.eltako.com" name="Eltako" %}
```

Snippets you will see often on integration pages:

- `integrations/config_flow.md`: how to add an integration through the UI.
- `integrations/option_flow.md`: how to change the options of an integration after setup.
- `integrations/remove_device_service.md`: how to remove the integration.
- `integrations/supported_brand.md`: for brands supported through another integration.

## Configuration blocks

Integration pages describe their options with the `configuration_basic` block, for options set in the UI, and the `configuration` block, for YAML options. Both are covered in [Integration page](/writing/reference/integration-page/).

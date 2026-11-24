---
title: Integration page structure
description: The sections of an integration page in order, and the blocks and reusable text you use to fill them.
order: 6
---

Every integration page follows the same structure. Readers who know one page can find their way on all of them, and reviewers can spot what is missing at a glance.

You do not have to start from scratch. Copy the [integration page template](https://github.com/home-assistant/home-assistant.io/blob/current/source/_integrations/_integration_docs_template.markdown), which has every section with example content. The steps around it, like the branch to use and the brands pull request, are in [Document an integration](/writing/guides/integration/). The keys at the top of the page are in [Integration front matter](/writing/reference/front-matter/).

## Sections

Use these sections, in this order. Leave out the ones that do not apply to your integration.

1. **Introduction**, without a heading. What the integration does, which brand or service it connects to, and a use case: what someone can do with it. Link to the website of the manufacturer or service. If the integration is a building block that other integrations use, add the building block text from [Reusable text](#reusable-text).
2. **Supported devices**: the devices and models known to work. When there are multiple versions out there, mention the ones you tested, including firmware.
3. **Unsupported devices**: the devices known not to work, so nobody has to find out the hard way.
4. **Prerequisites**: everything the reader needs before setup, as numbered steps. Like installing the app of the manufacturer, creating an account, or getting an API key or access token. Explain step by step how to get credentials.
5. **Configuration**: how to add the integration. For an integration that is set up from the UI, use the standard configuration text, followed by a [`configuration_basic` block](#the-configuration_basic-block) that explains each field of the setup form. For a YAML-only integration, show an example for `configuration.yaml`, followed by a [`configuration` block](#the-configuration-block).
6. **Configuration options**: the options the reader can change after setup, in a `configuration_basic` block.
7. **Supported functionality**: the entities the integration provides, grouped by platform under a heading per platform, like **Sensors** or **Buttons**. For each entity, give a short description, and where it helps, which devices have it and any remarks.
8. **List of triggers**, **List of conditions**, and **List of actions**: generated from separate files. See [Triggers, conditions, and actions](#triggers-conditions-and-actions).
9. **Examples**: automation examples that show what the integration is good for. See [Examples](#examples).
10. **Data updates**: how the integration gets its data. Does it poll, and how often? Does the device push updates?
11. **Known limitations**: what the integration cannot do, and things that work differently than the reader might expect.
12. **Troubleshooting**: common problems, with the symptom, what causes it, and how to fix it.
13. **Community notes**: optional. Tips and experiences shared by the community, like how a specific device behaves.
14. **Removing the integration**: how to remove it. Start with the standard removal text, and add anything extra the reader should do, like removing Home Assistant from the app of the manufacturer.

A few rules for the whole page:

- Steps and examples work with what Home Assistant ships. Do not depend on custom integrations or custom cards.
- When you mention another integration, link to its page.
- Describe the UI way first. YAML comes after, if at all.
- Remove the comments from the template before you mark your pull request as ready for review.

### Supported functionality

List each entity with its details as nested bullets:

```markdown
### Sensors

- **Boiler temperature**
  - **Description**: Current temperature of the boiler.
  - **Available for machines**: all
  - **Remarks**: About 3 degrees higher than the target temperature,
    because it is measured in a different place.
```

For a select entity, add an **Options** item that lists the choices.

### Examples

Each example starts with a short heading and a sentence on what it solves. Then describe the automation the way the reader builds it in the UI, and put the YAML version in a collapsible section:

```liquid
### Automation: Turn off the status LEDs at night

The status LEDs are bright. Turn them off when the sun goes down.

- **Trigger**: Sun: after sunset
- **Action**: Turn off light

{% details "YAML example for turning off the LEDs at night" %}

{% example %}
automation: |
  alias: "Turn off the LEDs at night"
  triggers:
    - trigger: sun
      event: sunset
  actions:
    - action: light.turn_off
      target:
        entity_id: light.device_leds
{% endexample %}

{% enddetails %}
```

Add the tip about pasting YAML into the visual editor once, at the top of the examples section:

```liquid
{% include docs/paste_yaml_tip.md %}
```

The `example` block accepts one input: `automation`, `script`, `trigger`, `condition`, `action`, or `template`. Write the YAML in it following the [YAML style](/writing/reference/yaml/).

Blueprints go in the [`source/blueprints/integrations/`](https://github.com/home-assistant/home-assistant.io/tree/current/source/blueprints/integrations) folder of the repository, most in a folder named after the domain of the integration, or on the [blueprint exchange](https://community.home-assistant.io/c/blueprints-exchange) of the community forum. Show them on the page with the `blueprint_example` tag. For a blueprint in the repository, give its path inside that folder:

```liquid
{% blueprint_example blueprint="example/example_notification.yaml" %}
```

The tag renders a button to import the blueprint. For a blueprint in the repository, it also renders the same automation, script, or template entity as YAML, for readers who prefer to set it up by hand. So the blueprint file is the only copy of the example: don't repeat its YAML on the page. The blueprint can be an `automation`, `script`, or `template` blueprint.

For a blueprint hosted elsewhere, give its URL. Then the tag only renders the import button:

```liquid
{% blueprint_example blueprint="https://community.home-assistant.io/t/example/123" %}
```

### Troubleshooting

Give each problem its own collapsible section, with the symptom as its heading, followed by a description and the resolution:

```liquid
{% details "Can't set up the device" %}

### Symptom: "This device can't be reached"

When you try to set up the integration, the form shows the message
"This device can't be reached".

#### Description

The device does not allow local connections yet.

#### Resolution

1. Make sure the device is powered on.
2. In the app of the manufacturer, turn on local access.

{% enddetails %}
```

## Triggers, conditions, and actions

Each trigger, condition, and action of an integration gets its own file, and its own page on the site. The integration page lists them with an include, which builds the list from those files:

```liquid
{% include integrations/triggers.md %}

{% include integrations/conditions.md %}

{% include integrations/actions.md %}
```

Each include adds its own level 2 heading. If an integration has no documented items of that kind yet, the include says so, and links to the overview of all of them. If the integration has all three, you can use one include instead:

```liquid
{% include integrations/triggers_conditions_actions.md %}
```

### Where the files go

Name each file after the domain of the integration and the name of the item, with the `.markdown` extension:

- Triggers go in `source/_triggers/`, like `light.brightness_changed.markdown`.
- Conditions go in `source/_conditions/`, like `light.is_on.markdown`.
- Actions go in `source/_actions/`, like `light.turn_on.markdown`.

### Front matter

- `title`: the name, as the UI shows it, like `Light brightness changed`.
- `trigger`, `condition`, or `action`: the full name of the item, like `light.brightness_changed`. Use the key that matches the kind of file.
- `domain`: the domain of the integration, like `light`. The integration page uses it to find the files that belong to it.
- `description`: one sentence about what the item does.
- `related_triggers`, `related_conditions`, or `related_actions`: optional. A list of related items of the same kind, which are linked from the page.
- `since`: actions only, optional. The Home Assistant release that introduced the action, as a quoted string.

### Page layout

A trigger file looks like this. Conditions and actions follow the same layout, with their own includes: `conditions/...` and `actions/...` instead of `triggers/...`.

```liquid
---
title: "Light brightness changed"
trigger: light.brightness_changed
domain: light
description: "Triggers when the brightness of one or more lights changes."
related_triggers:
  - light.brightness_crossed_threshold
---

The **Light brightness changed** trigger fires after... Use it to...

{% include triggers/ui_header.md %}

To use this trigger in an automation:

1. Go to {% my automations title="**Settings** > **Automations & scenes**" %}.
2. Open an existing automation, or select **Create automation** >
   **Create new automation**.
3. In the **When** section, select **Add trigger**.
4. Search for and select **Light brightness changed**.
5. Under **Targets**, select what you want to watch.
6. Select **Save**.

### Options in the UI

{% options_ui %}
Threshold type:
  description: How much the brightness has to change before it fires.
{% endoptions_ui %}

{% include triggers/yaml_header.md %}

In YAML, refer to this trigger as `light.brightness_changed`:

{% example %}
trigger: |
  trigger: light.brightness_changed
  target:
    entity_id: light.living_room
  options:
    threshold: 10
{% endexample %}

### Options in YAML

{% options_yaml %}
threshold:
  description: The minimum change in brightness, in percent.
  required: false
  type: any
{% endoptions_yaml %}

{% include triggers/targets.md %}

{% include triggers/behavior.md %}

## Good to know

- Anything else the reader should know.

{% include triggers/try_it.md %}

{% include triggers/more_examples.md %}

### Automation: A real use case

{% include triggers/stuck.md %}

{% include triggers/related.md %}
```

The differences per kind:

- **Conditions** are added in the **And if** section, with **Add condition**.
- **Actions** are added in the **Then do** section, with **Add action**. Scripts use actions too, and do not need a trigger.
- Keep the `targets.md` include if the item supports targets. Keep `behavior.md` if it supports multiple targets with a behavior option. Actions have no `behavior.md`.
- Under **More examples**, add one or more examples in the format of [Examples](#examples).

### Name items the way the UI does

When you refer to a trigger, condition, or action in UI steps or examples, use the name the UI shows.

For generic integrations that are not tied to a brand, product, or service, like `fan`, `vacuum`, `media_player`, or `climate`, do not prefix the name with the integration:

- Good: `**Action**: Turn on fan`
- Bad: `**Action**: Fan: Turn on fan`

For integrations tied to a brand, product, or service, put the integration name first. That helps the reader tell them apart from generic items with the same name:

- Good: `**Action**: Jellyfin: Play media`

### The options_ui block

The `options_ui` block lists the options of a trigger, condition, or action as the UI shows them. Use the label from the UI as the key.

- Each option needs a `description`. The build fails without one.
- `required` is optional, and accepts `true` or `false`. When set, the option shows a **Required** or **Optional** label.
- There is no `type`. The UI handles that for the reader.

### The options_yaml block

The `options_yaml` block lists the options as YAML keys. It follows the same rules as the [`configuration` block](#the-configuration-block):

- Each option needs a `description` and a `type`.
- Set `required` to `true` or `false`. An option with a default is not required.
- Document the `default`, if there is one.
- If more than one type is accepted, list them, like `type: [string, integer]`.

## Reusable text

Some text is the same on many integration pages. Instead of writing it again, include it from `source/_includes/integrations/`. The [Liquid helpers](/writing/reference/liquid/) page explains includes and other tags.

### Configuration

The standard configuration text adds the **Configuration** heading, a My button that starts the setup, and manual steps for when the button does not work:

```liquid
{% include integrations/config_flow.md %}
```

The text adapts to the page:

- If one of the discovery keys is set in the [front matter](/writing/reference/front-matter/#discovery), it tells readers that Home Assistant can find the device by itself.
- For a helper, the steps go through the **Helpers** tab.
- Add `name="..."` to use a different name than the page title, or `domain="..."` to start the setup of another domain.

For the options of an integration, the matching text adds an **Options** heading, and explains how to open them:

```liquid
{% include integrations/option_flow.md %}
```

### Other snippets

- `integrations/building_block_integration.md`: a note that explains the integration is a building block, which other integrations use and readers cannot add themselves.
- `integrations/remove_device_service.md`: the standard steps to remove an integration instance.
- `integrations/serial_connected.md`: explains that the device needs a serial connection, directly or through a serial proxy.
- `integrations/infrared_controlled.md` and `integrations/radio_frequency_controlled.md`: explain that the integration needs an infrared or radio frequency adapter that is already set up.
- `integrations/restart_ha_after_config_inclusion.md`: for YAML integrations, tells the reader to restart Home Assistant after changing `configuration.yaml`.

Look in [`source/_includes/integrations/`](https://github.com/home-assistant/home-assistant.io/tree/current/source/_includes/integrations) for the current text of each.

## The configuration_basic block

Use the `configuration_basic` block to explain the fields of a setup form, or the options of an integration that is set up from the UI. Use the label from the UI as the key:

```liquid
{% configuration_basic %}
Host:
  description: "The IP address or hostname of your bridge. For example,
    `192.168.1.100`. You can find it in the app, under **Bridge settings**
    > **Local API**."
Local access token:
  description: "The local access token of your bridge. You can find it in
    the app, under **Bridge settings** > **Local API**."
{% endconfiguration_basic %}
```

Each field only takes a `description`, which is required. There is no `required` or `type`. The UI already makes that clear.

## The configuration block

Use the `configuration` block to document the variables of an integration that is set up in YAML. It goes right after the example for `configuration.yaml`:

```liquid
{% configuration %}
api_key:
  description: The API key of your account.
  required: true
  type: string
name:
  description: The name of the sensor in Home Assistant.
  required: false
  type: string
  default: Awesome sensor
monitored_conditions:
  description: The conditions to create sensors for.
  required: true
  type: list
  keys:
    temperature:
      description: The current temperature.
    humidity:
      description: The current humidity.
{% endconfiguration %}
```

The keys of each variable:

- `description`: what the variable does. Required. Markdown works here.
- `required`: required. `true` shows the variable as **Required**, and `false` as **Optional**. A variable with a default value is never required, so set it to `false`. You can also use `inclusive` or `exclusive` for variables that must be used together, or that cannot be combined.
- `type`: the type of value the variable accepts. Required, except for variables nested under a `list` or `template`. Use one of the types below. If more than one type is accepted, list them: `type: [string, integer]`.
- `default`: the default value, if there is one. Required for optional variables of type `boolean`.
- `keys`: the nested variables of a variable of type `map` or `list`. The nested variables take the same keys. See the [template integration](https://www.home-assistant.io/integrations/template/) page for an extensive example.

The accepted types:

- `action`
- `any`
- `boolean`
- `date`
- `datetime`
- `device_class`
- `float`
- `icon`
- `integer`
- `list`
- `map`
- `selector`
- `string`
- `template`
- `time`
- `timedelta`

The build checks these rules. A missing description, an unknown type, a `required` value other than the four above, or an optional boolean without a default stops the site from building, with an error that names the variable.

## Images, icons, and logos

### Icon and logo

The icon and logo of an integration come from the [brands repository](https://github.com/home-assistant/brands). You do not add anything to the documentation for them. The page picks them up by the domain of the integration.

- Open a pull request in the brands repository that adds the images to `core_integrations/<domain>/`. List it under **This PR belongs together with** in the core pull request, and the core pull request on the same line of the brands pull request.
- At minimum, add an `icon.png`. A `logo.png`, versions for dark backgrounds, and high-resolution `@2x` versions are welcome. The [brands README](https://github.com/home-assistant/brands/blob/master/README.md) lists the exact sizes and requirements.
- If the integration started as a custom integration and is now part of Home Assistant, move its images from `custom_integrations` to `core_integrations`.

### Other images

Store screenshots and other images in the documentation repository, in a folder for your integration:

- Images for an integration page go in `source/images/integrations/<domain>/`.
- Images for a blog post go in `source/images/blog/`.

[Images and videos](/writing/reference/images/) covers how to take good screenshots and write alt text.

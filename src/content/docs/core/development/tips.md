---
title: Tips and tricks
description: Smaller things that make working on Home Assistant Core easier, from stacking pull requests to testing a change on your own system.
sidebarGroup: Pull requests
order: 6
---

A collection of things that are good to know, but do not need a page of their own. Picked up a trick that is missing here? Add it with the edit link at the bottom of this page.

## Split big work into a series of pull requests

Modernizing an old integration can be tempting to do in one go. Don't. Split the work into independent changes, and submit them one after another. Do not mix cleanups and new features in one pull request, and do not solve several issues in one either. Pull requests that dump a lot of code at once are not a priority for review, and may be closed.

To keep working while the first one is in review, branch the next one off the first:

1. Create the branch for the next pull request from the branch of the current one, and keep writing code there.
2. When the current pull request gets new commits from review feedback, merge them into the next branch.
3. Once the current pull request is merged, update the next branch with the latest `dev`, so it only contains its own changes.
4. Open the next pull request, and repeat.

Do not open the next pull request before the first one is merged. Pull requests that depend on unmerged work are not actionable for reviewers.

## Try a change on your production system

You can run a changed core integration on your own Home Assistant, by loading it as a custom integration:

1. Copy the folder of the integration into `/config/custom_components/`.
2. Add a `version` to its `manifest.json`, like `"version": "0.0.0"`. Custom integrations need one.
3. If the integration has a `strings.json`, run `python3 -m script.translations develop --integration example` in your development environment, with your domain instead of `example`. Copy the `translations/en.json` it generates into the copied folder. A plain copy of `strings.json` only works when it has no `[%key:...]` references, because Home Assistant does not resolve those for custom integrations.
4. Restart Home Assistant.

A custom integration takes the place of the built-in one with the same domain, except in safe mode and recovery mode, which skip custom integrations. Remove it when you are done, or you are stuck on that version forever.

## Try a new version of a library

To test a change to a library inside Home Assistant before it is released, see [try your library in Home Assistant](/core/integrations/api-library/#try-your-library-in-home-assistant).

## Your new config flow does not show up

The frontend caches aggressively. When you add a config flow and the integration does not appear in the list, check the logs for errors first. If there are none, do a hard refresh of your browser.

## Ask for help with a link

When you ask a question in **#core** on [Discord](https://www.home-assistant.io/join-chat/), push your work to a branch first and share the link. Someone who can see your code can help you much faster. Do not paste large blocks of code into the channel: they are hard to read, and push other questions out of view.

## Look at good examples

Integrations on the Platinum and Gold tiers of the [integration quality scale](/core/quality-scale/) are well maintained, and a good place to see how something is done. The tier is in the `manifest.json` of the integration.

## Generate a new integration

The scaffold script asks you a few questions, and creates the files of a new integration, with a config flow and tests to start from:

```shell
python3 -m script.scaffold integration
```

In Visual Studio Code, that is the **Create new integration** task. [Building integrations](/core/integrations/) explains what it generates.

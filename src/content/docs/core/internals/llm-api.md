---
title: LLM API
description: How Home Assistant exposes tools to large language models, how an integration contributes tools or a whole API, and how APIs are served over MCP.
sidebarLabel: LLM API
sidebarGroup: Voice and AI
order: 54
---

Large language models (LLMs) can do more than chat when they get tools. An LLM API in Home Assistant is a set of tools, plus a prompt that explains how to use them. A conversation agent that wraps a language model hands the tools of the API the user picked to the model, and runs the tools the model calls.

Home Assistant comes with two APIs built in, and integrations can add tools to them, or register an API of their own.

There are three sides to this:

- **Use an API**, in a conversation agent. That is covered by the [conversation entity](/core/entities/conversation/), with `chat_log.async_provide_llm_data`.
- **Contribute tools** to the APIs that exist. See [contribute tools](#contribute-tools).
- **Build your own API**. See [build your own API](#build-your-own-api).

## The built-in APIs

The `llm` integration registers two APIs. Neither has tools of its own: all their tools come from the `llm.py` platforms of integrations, described under [contribute tools](#contribute-tools).

- **Assist**, with the ID `assist` and shown to users as "Device control", controls and reads the entities the user exposed to Assist. The `intent` integration offers the common [intents](/core/internals/intents/) to it as tools, like `HassTurnOn` and the timer intents, and entity integrations offer their own, like setting the speed of a fan. It cannot do anything administrative.
- **Home Assistant**, with the ID `homeassistant`, manages Home Assistant itself, like registries, system logs, automations, and config entries. It is not limited to exposed entities, and only administrators can use it.

Registering an intent does not make it a tool. To offer your intent to models, return an `llm.IntentTool` for its handler from your `llm.py` platform. The tool uses the `description` of your intent handler, so write it for the model: that is what it reads to decide when to call it.

## Let the user pick an API

An integration that talks to a language model lets the user pick the APIs in its options flow. Store the chosen API IDs under `CONF_LLM_HASS_API` from `homeassistant.const`, as a list. If the user picks none, leave the key out.

```python
from homeassistant.const import CONF_LLM_HASS_API
from homeassistant.helpers import llm
from homeassistant.helpers.selector import (
    SelectOptionDict,
    SelectSelector,
    SelectSelectorConfig,
)

apis = [
    SelectOptionDict(label=api.name, value=api.id)
    for api in llm.async_get_apis(hass)
]
schema = probatio.Schema(
    {
        probatio.Optional(
            CONF_LLM_HASS_API,
            description={"suggested_value": options.get(CONF_LLM_HASS_API)},
        ): SelectSelector(SelectSelectorConfig(options=apis, multiple=True)),
    }
)
```

When the user picks several APIs, Home Assistant merges them into one for the model.

## Contribute tools

An integration can add tools to the APIs without owning one, with an `llm.py` platform. It has an `async_get_tools` callback, which the `llm` integration calls for each request with the context of that request and the ID of the API being put together. Return the tools for that API, with an optional prompt that goes with them, or `None` to contribute nothing.

Start the name of every tool you contribute this way with your domain and two underscores, like `my_integration__coffee_count`. Home Assistant reports tools without that prefix in the log, and they stop working in Home Assistant 2027.3.

```python
from homeassistant.components import llm
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.llm import LLMContext


@callback
def async_get_tools(
    hass: HomeAssistant, llm_context: LLMContext, api_id: str
) -> llm.LLMTools | None:
    """Return the tools of my integration."""
    if api_id != "assist":
        return None

    return llm.LLMTools(
        tools=[CoffeeCountTool()],
        prompt="Use my_integration__coffee_count for coffee questions.",
    )
```

Because it runs per request, the tools can depend on the context: the device the request came from, the assistant, or the API. The platform is imported only when it is needed, and your integration does not need to depend on `llm`.

## Tools

A tool is a subclass of `llm.Tool` from `homeassistant.helpers.llm`:

```python
import probatio

from homeassistant.core import HomeAssistant
from homeassistant.helpers import llm
from homeassistant.util import dt as dt_util

from .const import DOMAIN


class TimeTool(llm.Tool):
    """Tell the time."""

    name = "GetTime"
    title = "Get the time"
    description = "Returns the current time."
    integration = DOMAIN
    annotations = llm.ToolAnnotations(
        read_only=True,
        destructive=False,
        idempotent=True,
        open_world=False,
    )
    parameters = probatio.Schema({probatio.Optional("timezone"): str})

    async def async_call(
        self,
        hass: HomeAssistant,
        tool_input: llm.ToolInput,
        llm_context: llm.LLMContext,
    ) -> llm.ToolResult:
        """Return the current time."""
        tzinfo = dt_util.DEFAULT_TIME_ZONE
        if timezone := tool_input.tool_args.get("timezone"):
            tzinfo = dt_util.get_time_zone(timezone)

        return llm.ToolResult(
            data={"time": dt_util.now(tzinfo).isoformat()}
        )
```

| Attribute | Description |
| --- | --- |
| `name` | Required. The name the model calls the tool by. |
| `integration` | Required. The domain of the integration that provides the tool. |
| `description` | What the tool does, written for the model. Optional, but the model is lost without it. |
| `title` | A name to show people. Optional. |
| `parameters` | A `probatio` schema of the arguments. Defaults to no arguments. |
| `annotations` | A `ToolAnnotations` that says how the tool behaves. |

A tool without `integration` is reported: as an error for core integrations, and as a warning in the log for custom integrations, until it stops working in Home Assistant 2027.10.

### Calling a tool

`async_call` gets `hass`, a `ToolInput`, and the `LLMContext` of the request:

- `ToolInput` has the `tool_name`, the `tool_args` (validated against `parameters`), an `id` for the call, and `external`: `True` when the call runs outside Home Assistant, like at the model provider. Home Assistant does not run external calls itself.
- `LLMContext` has the `platform` (the domain of the agent), the `context` with the user, the `language`, the `assistant` whose exposed entities apply, and the `device_id` the request came from.

Return a `ToolResult`. Its `data` must be a dictionary that can be serialized to JSON. Returning a plain dictionary is deprecated and stops working in Home Assistant 2027.11.

When the tool cannot do its job, raise a `HomeAssistantError`. Home Assistant catches it and tells the model the call failed. To word the failure for the model yourself, return a result with `error` set:

```python
return llm.ToolResult(data={"error": "Calendar not found"}, error=True)
```

### Annotations

Annotations tell the model how careful to be. They match the tool annotations of the [Model Context Protocol](https://modelcontextprotocol.io), and the MCP Server integration passes them on.

| Annotation | Meaning | Default |
| --- | --- | --- |
| `read_only` | The tool changes nothing. | `False` |
| `destructive` | The tool can change or remove something that exists. | `True` |
| `idempotent` | Calling it again with the same arguments changes nothing more. | `False` |
| `open_world` | The tool reaches outside Home Assistant. | `True` |

The defaults assume the worst, so declare what is true for your tool.

## Build your own API

An API is a subclass of `llm.API`. It returns an `APIInstance`: the tools, and a prompt that tells the model how to use them.

```python
from homeassistant.helpers import llm


class MyAPI(llm.API):
    """An LLM API of my integration."""

    async def async_get_api_instance(
        self, llm_context: llm.LLMContext
    ) -> llm.APIInstance:
        """Return the tools for this request."""
        return llm.APIInstance(
            api=self,
            api_prompt="Use the tools to look up data in my service.",
            llm_context=llm_context,
            tools=[TimeTool()],
        )


async def async_setup_entry(
    hass: HomeAssistant, entry: MyConfigEntry
) -> bool:
    """Set up my integration."""
    entry.async_on_unload(
        llm.async_register_api(
            hass,
            MyAPI(
                hass=hass,
                id=f"my_integration-{entry.entry_id}",
                name=entry.title,
            ),
        )
    )
    return True
```

`llm.API` takes keyword arguments only: `hass`, a unique `id`, and the `name` users see. Set `requires_admin=True` for an API that only administrators may use. `async_register_api` returns a function that unregisters the API: when the API belongs to a config entry, call it on unload, like above.

`APIInstance` can also take a `custom_serializer`: a function that turns the schemas of your tools, like selectors, into the JSON schema a model expects.

## Served over MCP

Every registered API is available over the [Model Context Protocol](https://modelcontextprotocol.io) once the user sets up the [MCP Server integration](https://www.home-assistant.io/integrations/mcp_server/). You do not need to do anything for it.

Each API has its own Streamable HTTP endpoint, at `/api/mcp/<API ID>`. The Assist API is at `/api/mcp/assist`. All APIs except Assist need an access token of an administrator there. The integration also serves the API the user configured for it at `/api/mcp`, for clients that do not pick one.

To find out which APIs exist, an administrator can list them over the WebSocket API, in the order they were registered:

```json
{
  "id": 1,
  "type": "llm/api/list"
}
```

```json
{
  "id": 1,
  "type": "result",
  "success": true,
  "result": {
    "apis": [
      {"id": "assist", "name": "Device control", "requires_admin": false}
    ]
  }
}
```

---
title: Debug the Supervisor
description: Attach a Python debugger to a running Supervisor, locally or on a remote device, and find its logs.
sidebarLabel: Debug the Supervisor
sidebarGroup: Guides
order: 2
---

The Supervisor ships with [debugpy](https://github.com/microsoft/debugpy), so you can attach the Visual Studio Code debugger to it, set breakpoints, and step through the code. That works in the development container and on a real device.

## Turn on debug mode

The debugger only starts when debug mode is on. Debug mode is read at startup, so restart the Supervisor after you change it:

```shell
ha supervisor options --debug=true
ha supervisor restart
```

Write `=true` out. The CLI reads a bare `--debug` as `false`, so it turns debug mode off.

The Supervisor now listens for a debugger on port 33333. To debug what happens during startup, add `--debug-block=true` as well. The Supervisor then waits until a debugger is attached before it continues.

Turn it off again with `ha supervisor options --debug=false`.

## Attach the debugger

The repository has a launch configuration for this, **Supervisor remote debug**, in `.vscode/launch.json`:

```json
{
  "name": "Supervisor remote debug",
  "type": "python",
  "request": "attach",
  "port": 33333,
  "host": "172.30.32.2",
  "pathMappings": [
    {
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "/usr/src/supervisor"
    }
  ]
}
```

`172.30.32.2` is the address of the Supervisor on the `hassio` network, which works from inside the development container. Select the configuration in the **Run and Debug** view, and start it.

## Debug a remote device

On a device, the `hassio` network is not reachable from your computer. The **Remote ptvsd debugger** app forwards port 33333 of the host to the Supervisor:

1. Add the [development apps repository](https://github.com/home-assistant/apps-development) to the app store of the device.
2. Install and start the **Remote ptvsd debugger** app.
3. Turn on debug mode, as above.
4. In your launch configuration, set `host` to the IP address of the device.

Make sure the code in your workspace matches the version on the device. Otherwise, breakpoints end up on the wrong lines.

## Logs

Read the log of the Supervisor in one of these ways:

```shell
# From the Home Assistant CLI
ha supervisor logs

# From the host shell
docker logs -f hassio_supervisor
```

For more detail, raise the log level with `ha supervisor options --logging debug`.

If the Supervisor does not start at all, look at the service that starts it: `journalctl -u haos-supervisor` on the host shell. [Debug the host](/os/operating-system/debugging/) explains how to get there. When the Supervisor is down, the observer on port 4357 still shows its state and logs.

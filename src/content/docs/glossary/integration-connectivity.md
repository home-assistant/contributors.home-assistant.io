---
title: "Integration connectivity"
description: "The protocols Home Assistant uses to reach the devices or service of an integration, like Zigbee, the local network, or the cloud."
sidebarGroup: "Core and integrations"
term:
  code:
    - "connectivity"
    - "integration_connectivity"
  related:
    - "integration"
    - "manifest"
    - "integration-category"
    - "custom-integration"
    - "iot-class"
  autolink:
    - "integration connectivity"
---

An integration lists its connectivity in the `connectivity` key of its [manifest](/core/integrations/manifest/#connectivity). It describes the protocol to the device or service, even when Home Assistant goes through a radio, a bridge, or a server, and never the transport underneath, like Thread or Wi-Fi. [Integration connectivity](/core/integrations/connectivity/) has every value, and how to choose.

The key is optional for now. An integration without it hasn't filled it in yet. It doesn't mean the integration reaches nothing.

The [IoT class](/glossary/iot-class/) in the manifest is something else: it says whether Home Assistant reaches the device locally or through the cloud, and whether it polls or gets pushed updates.

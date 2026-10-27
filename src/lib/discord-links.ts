// Links the Discord channels the docs mention. A page writes a channel in
// bold, like **#core**, and the build turns it into a link to that channel.
// Places on Discord without a channel name to write, like the project
// forum, are linked by id: [project forum](discord:project-forum).
//
// The channels and their URLs live in src/data/discord.ts. Bold text that
// is not a known channel stays as it is, and so does a channel in a heading
// or in a link. An unknown id in a discord: link fails the build, so a typo
// never ships as a dead link.
//
// Like the glossary autolinks, the plugin carries a fingerprint of the
// channels: when they change, Astro sees a new configuration and renders
// every page again. In `pnpm dev`, discordLinksWatch() restarts the server.

import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import type { Element, Parents } from "hast";
import { defineHastPlugin, type HastVisitorContext } from "satteri";
import { DISCORD_CHANNELS } from "../data/discord.ts";

const DATA_FILE = fileURLToPath(new URL("../data/discord.ts", import.meta.url));

const SKIP_TAGS = new Set(["a", "h1", "h2", "h3", "h4", "h5", "h6", "button"]);

const byName = new Map(DISCORD_CHANNELS.filter((channel) => channel.name).map((channel) => [channel.name, channel]));
const byId = new Map(DISCORD_CHANNELS.map((channel) => [channel.id, channel]));

function isSkipped(node: Readonly<Element>, ctx: HastVisitorContext) {
  for (let parent: Readonly<Parents> | undefined = ctx.parent(node); parent && parent.type !== "root"; parent = ctx.parent(parent)) {
    if ((parent.type === "element" && SKIP_TAGS.has(parent.tagName)) || parent.type.startsWith("mdxJsx")) {
      return true;
    }
  }
  return false;
}

export function discordLinks() {
  return defineHastPlugin({
    name: "discord-links",
    // Not used by the plugin: it is here so Astro sees a new configuration,
    // and renders every page again, when the channels change.
    channels: createHash("sha256").update(JSON.stringify(DISCORD_CHANNELS)).digest("hex").slice(0, 16),

    element: {
      filter: ["strong", "a"],
      visit(node, ctx) {
        if (node.tagName === "a") {
          const href = String(node.properties?.href ?? "");
          if (!href.startsWith("discord:")) {
            return;
          }

          const channel = byId.get(href.slice("discord:".length));
          if (!channel) {
            const file = ctx.fileURL ? fileURLToPath(ctx.fileURL) : "a page";
            throw new Error(`${file} links to ${href}, which is not in src/data/discord.ts.`);
          }

          ctx.setProperty(node, "href", channel.url);
          return;
        }

        const channel = byName.get(ctx.textContent(node));
        if (!channel || isSkipped(node, ctx)) {
          return;
        }

        ctx.wrapNode(node, {
          type: "element",
          tagName: "a",
          properties: { href: channel.url, className: ["discord-channel"], title: channel.purpose },
          children: [],
        });
      },
    },
  });
}

// For `pnpm dev`: restarts the server when the channels change, so every
// page links the new URLs, not only the ones you open next.
export function discordLinksWatch(): AstroIntegration {
  return {
    name: "discord-links-watch",
    hooks: {
      "astro:config:setup": ({ command, addWatchFile }) => {
        if (command === "dev") {
          addWatchFile(DATA_FILE);
        }
      },
    },
  };
}

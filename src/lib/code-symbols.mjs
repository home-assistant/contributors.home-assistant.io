// Links code symbols in the text of the docs to their source. When a page
// mentions a class, a function, or a module in inline code, like
// `HomeAssistant`, `homeassistant.components.fan`, or `SubscribeMixin`, the
// first mention becomes a link to its definition on GitHub. Pointing at it
// shows a card with what it is, its signature, and the first sentence of its
// documentation (see src/components/HoverCards.astro).
//
// There are two indexes, one per repository:
//
// - core: src/data/symbols/core.json, the Python API of core, and the
//   modules of core. `pnpm symbols` generates it with
//   scripts/symbols/core.mjs.
// - frontend: src/data/symbols/frontend.json, the TypeScript API of the
//   frontend: functions, classes, mixins, contexts, types, and interfaces.
//   Generated with scripts/symbols/frontend.mjs.
//
// The rules for what links live here, so the generators and this plugin
// always agree on them. A rule that needs a new exception goes here too,
// with the evidence in a comment.
//
// A wrong card is worse than no card. So a mention only links when it can
// mean one thing:
//
// - A page uses one index, by its area (see INDEXES). Core pages never get a
//   card of the frontend, and Frontend pages never get a Python card: `hass`
//   is something else on each side. Glossary terms use the index of their
//   sidebar group.
// - The inline code is exactly a name, `Name()`, or a qualified name like
//   `core.HomeAssistant`, `hass.bus.async_fire`, or `hass.callWS`. A member
//   of an enum, like `Platform.SENSOR`, links to the enum when the enum has
//   that member. Code with arguments, or anything else, stays as it is.
// - A module of core links by its full path, like `homeassistant.const`, and
//   so does an import of it written in inline code, like
//   `from homeassistant.components.fan import FanEntity`.
// - A bare name links only when the generator marked it `bare`: defined once
//   (in core, integrations that are not used by others don't count), not a
//   plain word like `state`, not a name integrations define themselves like
//   `async_setup_entry`, and not also the name of an attribute, like
//   `entity_id` or `is_on` in core, or a property of an element, like
//   `narrow` in the frontend, which is what the docs usually mean. A method
//   of an entity platform, like `open_cover`, only links by its bare name on
//   the page of that platform, like core/entities/cover.md.
// - Never in code blocks, headings, or links. Only the first mention of a
//   symbol on a page.
//
// The hooks an integration implements, like `async_setup_entry` or
// `async_step_user`, have no definition in core to link to. They link to the
// page of this site that explains them, from scripts/symbols/hooks.json, but
// not on that page itself.
//
// On pages of the frontend index, the tag of an element that has a
// component page in the Design area, like `ha-button` or `<ha-button>`,
// links to that page instead. Not on the page itself, and not when the page
// already links there.
//
// Astro caches rendered pages. The plugin carries a fingerprint of the
// indexes, like the glossary autolink does: a new index is a new Astro
// configuration, and every page renders again. In `pnpm dev`,
// codeSymbolsWatch() restarts the server when an index changes, or when the
// elements that have a component page change.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DOCS_DIR = fileURLToPath(new URL("../content/docs/", import.meta.url));
const COMPONENTS_DIR = fileURLToPath(new URL("../content/docs/design/components/", import.meta.url));

// Rewritten when the element tags of the component pages change while
// `pnpm dev` runs. Astro watches it, and restarts when it changes.
const DEV_STAMP = fileURLToPath(new URL("../../.astro/code-symbols-elements.txt", import.meta.url));

// Names every integration defines for itself. A mention means the one of
// the integration you are writing, not one in core. The steps of a config
// flow too: `async_step_reconfigure` in core is the step of one helper
// flow, not the step a page tells you to write.
const INTEGRATION_CONVENTIONS = new Set([
  "async_setup",
  "async_setup_entry",
  "async_unload_entry",
  "async_migrate_entry",
  "async_remove_entry",
  "async_remove_config_entry_device",
  "async_setup_platform",
  "async_get_config_entry_diagnostics",
  "async_get_device_diagnostics",
  "async_reset_platform",
  "setup",
  "setup_platform",
  "setup_entry",
]);

export const isIntegrationConvention = (name) => INTEGRATION_CONVENTIONS.has(name) || name.startsWith("async_step_");

// Modules whose names are mostly plain words or configuration keys, like
// `string`, `url`, `time_zone`, or `now`. Only a qualified mention, like
// `cv.string`, links to them.
export const QUALIFIED_ONLY_MODULES = new Set(["homeassistant.helpers.config_validation", "homeassistant.util.dt"]);

// The indexes, the areas whose pages use each, and how the code in that
// repository and the docs usually call a module or an object. In core,
// `hass.bus.async_fire` is the `async_fire` of the event bus. In the
// frontend, `hass.callWS` is a member of the `HomeAssistant` interface.
export const INDEXES = {
  core: {
    file: fileURLToPath(new URL("../data/symbols/core.json", import.meta.url)),
    repository: "home-assistant/core",
    areas: new Set(["core", "architecture", "glossary", "security", "apps"]),
    aliases: {
      hass: "homeassistant.core.HomeAssistant",
      "hass.bus": "homeassistant.core.EventBus",
      "hass.states": "homeassistant.core.StateMachine",
      "hass.services": "homeassistant.core.ServiceRegistry",
      "hass.config": "homeassistant.core_config.Config",
      "hass.auth": "homeassistant.auth.AuthManager",
      "hass.config_entries": "homeassistant.config_entries.ConfigEntries",
      entry: "homeassistant.config_entries.ConfigEntry",
      cv: "homeassistant.helpers.config_validation",
      dr: "homeassistant.helpers.device_registry",
      er: "homeassistant.helpers.entity_registry",
      ir: "homeassistant.helpers.issue_registry",
      dt_util: "homeassistant.util.dt",
    },
  },
  frontend: {
    file: fileURLToPath(new URL("../data/symbols/frontend.json", import.meta.url)),
    repository: "home-assistant/frontend",
    areas: new Set(["frontend", "design"]),
    aliases: {
      hass: "src/types.ts.HomeAssistant",
    },
  },
};

// The glossary has terms of both sides. A term in this sidebar group uses
// the frontend index, every other term the one of core.
const FRONTEND_GLOSSARY_GROUP = "Frontend";

const IDENTIFIER_PATH = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/;

// A plain lowercase word, like `state`, `date`, or `json`.
export const isPlainWord = (name) => /^[a-z][a-z0-9]*$/.test(name);

// The text of an inline code span as a name and what qualifies it, or
// undefined when it is not just a name. `self.` and `this.` are left out:
// they mean the class the page is about, so it is a bare name.
export function parseMention(text) {
  const mention = text
    .trim()
    .replace(/\(\)$/, "")
    .replace(/^(?:self|this)\./, "");

  if (!IDENTIFIER_PATH.test(mention)) {
    return undefined;
  }

  const parts = mention.split(".");
  return { name: parts.at(-1), qualifier: parts.slice(0, -1).join(".") };
}

// The module of core an inline code span names, or undefined: a dotted path
// like `homeassistant.const`, or an import of one, like
// `from homeassistant.components.fan import FanEntity` or
// `import homeassistant.helpers.config_validation as cv`. Whether the module
// exists is up to the index.
export function moduleMention(text) {
  const mention = text.trim();
  const match =
    mention.match(/^(homeassistant(?:\.\w+)+)$/) ??
    mention.match(/^from (homeassistant(?:\.\w+)*) import \(?\s*\w+(?:\s+as\s+\w+)?(?:\s*,\s*\w+(?:\s+as\s+\w+)?)*\s*,?\s*\)?$/) ??
    mention.match(/^import (homeassistant(?:\.\w+)*)(?: as \w+)?$/);
  return match?.[1];
}

// The module, or the module and class, a symbol is defined in.
const ownerOf = (symbol) =>
  symbol.qualname.includes(".") ? `${symbol.module}.${symbol.qualname.split(".")[0]}` : symbol.module;

function qualifierMatches(qualifier, symbol, aliases) {
  const alias = aliases[qualifier];
  const target = alias ?? qualifier;
  const owner = ownerOf(symbol);

  if (owner !== target && !owner.endsWith(`.${target}`)) {
    return false;
  }

  // `light.turn_on` is an action, not the Python function. A domain on its
  // own only qualifies a class, like `sensor.SensorEntity`, or a function
  // no action is named like, like `webhook.async_generate_id`.
  const isDomain = !alias && !qualifier.includes(".") && symbol.module.startsWith("homeassistant.components.");
  return !(isDomain && /^[a-z]/.test(symbol.name) && !symbol.name.startsWith("async_"));
}

// The entity domain a method belongs to, like `cover` for
// `CoverEntity.open_cover`, or undefined.
export const entityDomainOf = (symbol) =>
  symbol.kind === "method" ? symbol.module.match(/^homeassistant\.components\.([a-z0-9_]+)/)?.[1] : undefined;

// The entity domain a page is about: `cover` for core/entities/cover.md.
export function pageDomainOf(file) {
  return file.match(/\/core\/entities\/([a-z0-9-]+)\.mdx?$/)?.[1].replaceAll("-", "_");
}

// Finds the symbol an inline code span means, or undefined. `pageDomain` is
// the entity domain of the page, from pageDomainOf(), and `pageUrl` its URL.
// `aliases` are the aliases of the index the symbols come from, and `hooks`
// the integration hooks of core, like `async_setup_entry`: integrations
// define those themselves, so they link to the page that explains them.
export function createResolver(symbols, aliases = {}, hooks = []) {
  const byName = new Map();
  const modules = new Map();
  for (const symbol of symbols) {
    if (symbol.kind === "module") {
      modules.set(symbol.id, symbol);
    } else {
      byName.set(symbol.name, [...(byName.get(symbol.name) ?? []), symbol]);
    }
  }
  const hooksByName = new Map(hooks.map((hook) => [hook.name, hook]));
  const byId = new Map(symbols.map((symbol) => [symbol.id, symbol]));

  const resolve = (text, pageDomain, pageUrl) => {
    const module = modules.get(moduleMention(text));
    if (module) {
      return module;
    }

    // A hook never links on the page it links to, or on a page where the
    // same name means something else, like `async_step_user` of a subentry
    // flow.
    const hookMention = parseMention(text);
    const hook = !hookMention?.qualifier && hooksByName.get(hookMention?.name);
    if (hook) {
      const onOwnPage = pageUrl && (hook.page.split("#")[0] === pageUrl || hook.notOn?.includes(pageUrl));
      return onOwnPage ? undefined : hook;
    }

    const mention = parseMention(text);
    const candidates = mention ? (byName.get(mention.name) ?? []) : [];

    // `hass.bus` on its own is the event bus. Not `hass` alone: that is a
    // word in the text as much as code.
    const path = mention && [mention.qualifier, mention.name].filter(Boolean).join(".");
    if (mention?.qualifier && byId.has(aliases[path])) {
      return byId.get(aliases[path]);
    }

    // The methods of an entity platform, like `send_message` of a notify
    // entity, only link by their bare name on the page of that platform.
    // On the camera page, `send_message` is a callback.
    if (!mention?.qualifier) {
      // On the page of an entity platform, its own method wins, like
      // `turn_on` of the climate entity on the climate page.
      const own = pageDomain ? candidates.filter((symbol) => (symbol.bare || symbol.pageBare) && entityDomainOf(symbol) === pageDomain) : [];
      if (own.length === 1) {
        return own[0];
      }

      const bare = candidates.filter((symbol) => {
        const domain = entityDomainOf(symbol);
        return symbol.bare && (!domain || domain === pageDomain);
      });
      return bare.length === 1 ? bare[0] : undefined;
    }

    const matches = candidates.filter((symbol) => qualifierMatches(mention.qualifier, symbol, aliases));
    if (matches.length > 0) {
      return matches.length === 1 ? matches[0] : undefined;
    }

    // `SensorDeviceClass.TEMPERATURE`: a member of an enum.
    const owner = resolve(mention.qualifier, pageDomain, pageUrl);
    return owner?.members?.includes(mention.name) ? owner : undefined;
  };

  return resolve;
}

// The area of a page in src/content/docs/, or undefined for any other file.
export function areaOf(file) {
  return file.startsWith(DOCS_DIR) ? file.slice(DOCS_DIR.length).split("/")[0] : undefined;
}

// The name of the index a page uses, or undefined when it uses none.
export function indexOfPage(file) {
  const area = areaOf(file);

  if (area === "glossary") {
    const group = readFileSync(file, "utf8").match(/^sidebarGroup:\s*["']?([^"'\n]+?)["']?\s*$/m)?.[1];
    return group === FRONTEND_GLOSSARY_GROUP ? "frontend" : "core";
  }

  return Object.keys(INDEXES).find((name) => INDEXES[name].areas.has(area));
}

export function sourceUrl(index, symbol) {
  return `https://github.com/${index.repository}/blob/${index.commit}/${symbol.path}#L${symbol.line}`;
}

export function readIndex(name) {
  const file = INDEXES[name].file;
  if (!existsSync(file)) {
    return undefined;
  }

  return JSON.parse(readFileSync(file, "utf8"));
}

// The element tags that have a component page in the Design area, like
// `ha-button`, with the URL of that page. A page owns the elements whose
// source it links in its "In code" section, like
// `src/components/ha-button.ts`. A tag that two pages link is left out.
export function elementPages() {
  if (!existsSync(COMPONENTS_DIR)) {
    return new Map();
  }

  const owners = new Map();

  for (const file of readdirSync(COMPONENTS_DIR).filter((name) => /\.mdx?$/.test(name))) {
    const page = file.replace(/\.mdx?$/, "");
    if (page === "index") {
      continue;
    }

    const inCode = readFileSync(`${COMPONENTS_DIR}${file}`, "utf8").split(/^## In code\s*$/m)[1]?.split(/^## /m)[0] ?? "";
    const tags = new Set(
      [...inCode.matchAll(/github\.com\/home-assistant\/frontend\/blob\/[^/]+\/src\/[^)\s]*\/([a-z][a-z0-9]*-[a-z0-9-]+)\.ts/g)].map(
        (match) => match[1],
      ),
    );

    for (const tag of tags) {
      owners.set(tag, [...(owners.get(tag) ?? []), `/design/components/${page}/`]);
    }
  }

  return new Map([...owners].filter(([, pages]) => pages.length === 1).map(([tag, [url]]) => [tag, url]));
}

// The tag of an element in inline code, `ha-button` or `<ha-button>`.
const elementTagOf = (text) => text.trim().match(/^(?:<([a-z][a-z0-9]*-[a-z0-9-]+)>|([a-z][a-z0-9]*-[a-z0-9-]+))$/)?.slice(1).find(Boolean);

// The pages a page links to, without the anchor.
function linkedPages(root) {
  const linked = new Set();
  const visit = (node) => {
    if (node.type === "element" && node.tagName === "a") {
      linked.add(String(node.properties?.href ?? "").split("#")[0]);
    }
    for (const child of node.children ?? []) {
      visit(child);
    }
  };
  visit(root);
  return linked;
}

// The URL of a docs page: /design/components/button/ for
// src/content/docs/design/components/button.mdx.
export const pageUrlOf = (file) =>
  areaOf(file) ? `/${file.slice(DOCS_DIR.length).replace(/\.mdx?$/, "").replace(/(^|\/)index$/, "")}/`.replace(/\/+/g, "/") : "";

// Text inside these is never linked: it already is a link, it is a code
// block, or it is a heading or a control.
const SKIP_TAGS = new Set(["a", "pre", "h1", "h2", "h3", "h4", "h5", "h6", "button", "script", "style", "svg"]);

export function codeSymbols() {
  const indexes = {};
  for (const name of Object.keys(INDEXES)) {
    const index = readIndex(name);
    if (index?.symbols?.length) {
      indexes[name] = { ...index, resolve: createResolver(index.symbols, INDEXES[name].aliases, index.hooks) };
    }
  }

  const elements = elementPages();

  return {
    name: "code-symbols",
    // Not used by the plugin: it is here so Astro sees a new configuration,
    // and renders every page again, when an index or a component page
    // changes.
    symbols: createHash("sha256")
      .update(JSON.stringify([Object.values(indexes).map(({ commit, symbols, hooks }) => [commit, symbols, hooks]), [...elements]]))
      .digest("hex")
      .slice(0, 16),

    before(root, ctx) {
      const file = ctx.fileURL ? fileURLToPath(ctx.fileURL) : "";
      const indexName = areaOf(file) ? indexOfPage(file) : undefined;

      ctx.data.codeSymbols = {
        indexName,
        index: indexes[indexName],
        pageDomain: pageDomainOf(file),
        pageUrl: pageUrlOf(file),
        // Element tags link only on pages of the frontend index, and not to
        // a page this page already links to.
        linkedPages: indexName === "frontend" ? linkedPages(root) : new Set(),
        linked: new Set(),
      };
    },

    element: {
      filter: ["code"],
      visit(node, ctx) {
        const state = ctx.data.codeSymbols;
        if (!state?.indexName) {
          return;
        }

        for (let parent = ctx.parent(node); parent && parent.type !== "root"; parent = ctx.parent(parent)) {
          const isSkipped = parent.type === "element" && SKIP_TAGS.has(parent.tagName);
          if (isSkipped || parent.type.startsWith("mdxJsx")) {
            return;
          }
        }

        const text = ctx.textContent(node);

        if (state.indexName === "frontend") {
          const page = elements.get(elementTagOf(text));
          if (page) {
            if (page !== state.pageUrl && !state.linkedPages.has(page)) {
              state.linkedPages.add(page);
              ctx.wrapNode(node, { type: "element", tagName: "a", properties: { href: page }, children: [] });
            }
            return;
          }
        }

        const symbol = state.index?.resolve(text, state.pageDomain, state.pageUrl);
        if (!symbol || state.linked.has(symbol.id)) {
          return;
        }

        state.linked.add(symbol.id);
        ctx.wrapNode(node, {
          type: "element",
          tagName: "a",
          properties: {
            href: symbol.kind === "hook" ? symbol.page : sourceUrl(state.index, symbol),
            className: ["code-symbol"],
            dataSymbol: symbol.id,
            dataSymbolIndex: state.indexName,
          },
          children: [],
        });
      },
    },
  };
}

// The element tags with their component page, as one string to compare.
const elementsStamp = () => JSON.stringify([...elementPages()]);

// For `pnpm dev`: restarts the server when an index changes, so every page
// links the new symbols, not only the ones you open next. The same when a
// component page starts or stops linking an element in its "In code"
// section. Editing the rest of a component page restarts nothing.
export function codeSymbolsWatch() {
  return {
    name: "code-symbols-watch",
    hooks: {
      "astro:config:setup": ({ command, addWatchFile }) => {
        if (command !== "dev") {
          return;
        }

        for (const { file } of Object.values(INDEXES)) {
          addWatchFile(file);
        }

        mkdirSync(path.dirname(DEV_STAMP), { recursive: true });
        writeFileSync(DEV_STAMP, elementsStamp());
        addWatchFile(DEV_STAMP);
      },

      "astro:server:setup": ({ server }) => {
        server.watcher.on("all", (_event, file) => {
          if (!path.resolve(file).startsWith(COMPONENTS_DIR)) {
            return;
          }

          const current = elementsStamp();
          if (current !== readFileSync(DEV_STAMP, "utf8")) {
            writeFileSync(DEV_STAMP, current);
          }
        });
      },
    },
  };
}

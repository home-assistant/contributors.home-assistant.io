// How much of what the docs mention as code links to its source: every
// inline code span that looks like a code symbol, per area, how many of
// them resolve with the indexes, and the ones that don't. Written to
// src/data/symbols/coverage.json by `pnpm symbols`, so a weekly pull
// request shows what changed.
//
// "Looks like a code symbol" is a guess, tuned by hand on the docs. It
// counts:
//
// - CamelCase names with two or more parts, like `HomeAssistant` or
//   `SubscribeMixin`, and a member of one, like `Platform.SENSOR`
// - a name followed by `()`, like `async_write_ha_state()` or
//   `fireEvent()`, also qualified, like `hass.callWS()`
// - dotted paths that start with `homeassistant.`, `hass.`, or `this.`,
//   and imports of a module of core
// - contexts and mixins of the frontend, like `reducedMotionContext`
// - anything that resolves: a span that links is a symbol
//
// It leaves out what the docs use as plain values: YAML keys and
// configuration options (`tap_action`), state values (`on`), CSS custom
// properties (`--ha-space-2`), element tags (`ha-button`), file names,
// and anything with spaces or arguments, like `setConfig(config)`. And
// what is code, but never ours to link:
//
// - built-ins of Python and of the browser, like `ValueError`, `super()`,
//   or `focus()`
// - names of examples, like `MyEntity` or `ExampleConfigEntry`
// - intents, like `HassTurnOn`: a name, not a class
// - a method of a variable, like `response.as_dict()`: only `hass.`,
//   `this.`, `self.`, a module, a class, or an alias qualifies a symbol
//
// A mention that links to nothing is one of these:
//
// - A symbol the index does not read yet: widen what the generator reads,
//   if it is public API of that repository.
// - An ambiguous name, like `setConfig()`, which every card, badge, and row
//   has: qualify it on the page, like `LovelaceCard.setConfig`, or leave it.
// - A typo or an outdated name: fix the page.
// - Code of another project, like `ClientSession` of aiohttp: it stays plain.

import { createResolver, INDEXES } from "../../src/lib/code-symbols.mjs";

const BUILT_INS = new Set([
  // Python
  "super",
  "eval",
  "exec",
  "sum",
  "len",
  "print",
  "open",
  "isinstance",
  "ValueError",
  "TypeError",
  "KeyError",
  "RuntimeError",
  "AttributeError",
  "NotImplementedError",
  "TimeoutError",
  "OSError",
  "Exception",
  "BaseException",
  "CancelledError",
  // The browser and Lit
  "focus",
  "blur",
  "click",
  "render",
  "willUpdate",
  "requestUpdate",
  "reportValidity",
  "ResizeObserver",
  "PropertyValues",
]);

const EXAMPLE_NAME = /^(My|Example|Placeholder)[A-Z]/;
const INTENT_NAME = /^Hass[A-Z][a-z]+[A-Z]?\w*$/;
const QUALIFIERS = new Set(["hass", "this", "self", "homeassistant"]);
const ALIASES = new Set(Object.values(INDEXES).flatMap(({ aliases }) => Object.keys(aliases).map((alias) => alias.split(".")[0])));

// Names in CamelCase that are not code of Home Assistant: products, file
// formats, and the like.
const NOT_SYMBOLS = new Set([
  "GitHub",
  "JavaScript",
  "TypeScript",
  "PyPI",
  "YouTube",
  "HomeKit",
  "MacOS",
  "IntelliJ",
  "PyCharm",
  "VSCode",
  "WebSocket",
  "OAuth",
  "MkDocs",
  "DevContainer",
]);

const CAMEL_CASE = /^[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]*)+$/;

export function looksLikeSymbol(text) {
  const span = text.trim();

  if (/^(from|import) homeassistant(\.\w+)*\b/.test(span)) {
    return true;
  }
  if (/\s/.test(span)) {
    return false;
  }

  const name = span.replace(/\(\)$/, "");
  const calls = span.endsWith("()");

  if (!/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(name)) {
    return false;
  }

  const parts = name.split(".");
  const [first] = parts;
  const last = parts.at(-1);

  if (BUILT_INS.has(last) || EXAMPLE_NAME.test(first) || INTENT_NAME.test(name)) {
    return false;
  }
  if (parts.length > 1 && /^[a-z_]/.test(first) && !QUALIFIERS.has(first) && !ALIASES.has(first)) {
    return false;
  }
  if (/^(homeassistant|hass|this)$/.test(first) && parts.length > 1) {
    return true;
  }
  if (calls) {
    return true;
  }
  if (CAMEL_CASE.test(first) && !NOT_SYMBOLS.has(first)) {
    return true;
  }
  return parts.length === 1 && /^[a-z]\w*(Context|Mixin)$/.test(name);
}

// The coverage of `mentions` (from docsMentions()) with `indexes`, the
// parsed index files by name.
export function measureCoverage(mentions, indexes) {
  const resolvers = Object.fromEntries(
    Object.entries(indexes)
      .filter(([, index]) => index)
      .map(([name, index]) => [name, createResolver(index.symbols, INDEXES[name].aliases, index.hooks ?? [])]),
  );

  const areas = {};
  const unresolved = new Map();

  for (const mention of mentions) {
    const resolve = resolvers[mention.index];
    const resolved = Boolean(resolve?.(mention.text, mention.domain, mention.url));
    if (!resolved && !looksLikeSymbol(mention.text)) {
      continue;
    }

    const area = (areas[mention.area] ??= { index: mention.index ?? null, symbols: 0, resolved: 0 });
    area.symbols += 1;
    if (resolved) {
      area.resolved += 1;
      continue;
    }

    // Only the areas that link symbols have something to resolve.
    if (mention.index) {
      const text = mention.text.trim();
      const entry = unresolved.get(text) ?? { text, index: mention.index, count: 0, pages: [] };
      entry.count += 1;
      if (!entry.pages.includes(mention.file)) {
        entry.pages.push(mention.file);
      }
      unresolved.set(text, entry);
    }
  }

  const sortedAreas = Object.fromEntries(Object.entries(areas).sort(([a], [b]) => a.localeCompare(b)));
  const totals = { symbols: 0, resolved: 0 };
  for (const area of Object.values(sortedAreas)) {
    if (area.index) {
      totals.symbols += area.symbols;
      totals.resolved += area.resolved;
    }
  }

  return {
    totals,
    areas: sortedAreas,
    unresolved: [...unresolved.values()].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text)),
  };
}

const percent = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : "-");

// The coverage as Markdown, for the report and the pull request.
export function coverageReport(coverage, previous) {
  const lines = [
    "## Coverage",
    "",
    "Inline code that looks like a code symbol, per area, and how much of it links. Areas without an index link nothing.",
    "",
    "| Area | Index | Symbols | Linked | Coverage |",
    "| --- | --- | ---: | ---: | ---: |",
  ];

  for (const [area, { index, symbols, resolved }] of Object.entries(coverage.areas)) {
    const before = previous?.areas?.[area];
    const change = before && before.resolved !== resolved ? ` (was ${percent(before.resolved, before.symbols)})` : "";
    lines.push(`| ${area} | ${index ?? "none"} | ${symbols} | ${resolved} | ${percent(resolved, symbols)}${change} |`);
  }
  lines.push(
    `| All areas with an index | | ${coverage.totals.symbols} | ${coverage.totals.resolved} | ${percent(coverage.totals.resolved, coverage.totals.symbols)} |`,
  );

  const known = new Set((previous?.unresolved ?? []).map((entry) => entry.text));
  const added = coverage.unresolved.filter((entry) => !known.has(entry.text));
  if (previous && added.length) {
    lines.push("", "### New unresolved", "", "Mentions that look like a code symbol and link to nothing, new since the last index. A typo, an outdated name, or a symbol outside what the index reads.", "");
    for (const entry of added.slice(0, 40)) {
      lines.push(`- \`${entry.text}\` (${entry.index}), ${entry.count}x: ${entry.pages.map((page) => `\`${page}\``).join(", ")}`);
    }
    if (added.length > 40) {
      lines.push(`- And ${added.length - 40} more, see \`src/data/symbols/coverage.json\`.`);
    }
  }

  lines.push("", "### Top unresolved", "");
  for (const entry of coverage.unresolved.slice(0, 15)) {
    lines.push(`- \`${entry.text}\` (${entry.index}), ${entry.count}x on ${entry.pages.length} pages`);
  }

  return lines;
}

// The Markdown version of every docs page, for language models and agents:
// served at <page URL>index.md, and collected in the llms.txt files (see
// src/lib/llms.ts).
//
// It starts from the source of the page, not from the HTML. Markdown pages
// pass through almost as they are. MDX pages lose their imports, and their
// components become something you can read as text: a demo becomes a note
// with its markup, a diagram a nested list. Links become absolute URLs, so
// they still work when the text is read somewhere else.
//
// Nothing is added that the page does not show: glossary terms are linked
// on the site by the build, not in the source, so they stay plain words
// here. Discord channels are links on the page, so they are links here too,
// and so are repository paths in inline code.
import { getImage } from "astro:assets";
import { DISCORD_CHANNELS } from "../data/discord";
import sourcePathIndex from "../data/source-paths.json";
import { APIS, CORE, INTEGRATIONS, type MapLayer, NETWORK, OUTSIDE, PEOPLE, PLATFORM } from "../data/architecture-map";
import { type Palette, paletteSwatches, type Scale, tokenScale } from "./design-tokens";
import { type DocsEntry, groupOverview, hrefOf, isIndex, pathOf } from "./docs";
import { getUpcomingEvents } from "./events";
import { getTerms, relatedTerms, termHref } from "./glossary";
import { CATEGORIES_SOURCE, getIntegrationCategories } from "./integration-categories";
import { CONNECTIVITY_SOURCE, getIntegrationConnectivity } from "./integration-connectivity";
import { createResolver, sourcePathUrl } from "./source-paths.mjs";

export const SITE_URL = import.meta.env.SITE.replace(/\/$/, "");

export function absoluteUrl(href: string): string {
  return `${SITE_URL}${href}`;
}

export async function pageMarkdown(entry: DocsEntry): Promise<string> {
  const pageUrl = absoluteUrl(hrefOf(entry));
  const { title, description, source, lastVerified } = entry.data;

  const header = [`# ${title}`, `> ${description}`, `Source: ${pageUrl}`];
  if (lastVerified) {
    const date = lastVerified.toISOString().slice(0, 10);
    header.push(source ? `Last verified on ${date}, against ${source}.` : `Last verified on ${date}.`);
  }

  let body = entry.body ?? "";
  if (entry.filePath?.endsWith(".mdx")) {
    body = await mdxToMarkdown(body, entry);
  }
  body = await discordLinks(body);
  body = await absoluteLinks(body, entry, pageUrl);
  body = await sourcePathLinks(body, entry);

  const parts = [
    header.join("\n\n"),
    termFacts(entry),
    body.trim(),
    await groupSections(entry),
    await relatedTermsSection(entry),
  ];

  return `${parts.filter(Boolean).join("\n\n")}\n`;
}

// The box at the top of a glossary page (TermFacts.astro), as a list.
function termFacts(entry: DocsEntry): string {
  const term = entry.data.term;
  if (!term) {
    return "";
  }

  const facts: string[] = [];
  if (term.code.length > 0) {
    facts.push(`- In code: ${term.code.map((name) => `\`${name}\``).join(", ")}`);
  }
  if (term.ui) {
    facts.push(`- In the UI: ${term.ui}`);
  }
  if (term.aliases.length > 0) {
    facts.push(`- Also: ${term.aliases.join(", ")}`);
  }
  if (term.formerly.length > 0) {
    facts.push(`- Formerly: ${term.formerly.join(", ")} (old name: don't use it in new text)`);
  }

  return facts.join("\n");
}

// The pages of the sidebar groups at the end of an overview
// (GroupSections.astro).
async function groupSections(entry: DocsEntry): Promise<string> {
  const overview = isIndex(entry) ? await groupOverview(pathOf(entry)) : undefined;
  if (!overview?.heading) {
    return "";
  }

  const sections = overview.sections.map((section) =>
    [
      `### ${section.name}`,
      "",
      ...section.pages.map((page) => `- [${page.title}](${absoluteUrl(page.href)}): ${page.description}`),
    ].join("\n"),
  );

  return [`## ${overview.heading.text}`, ...sections].join("\n\n");
}

// "Related terms" at the bottom of a glossary page (RelatedTerms.astro).
async function relatedTermsSection(entry: DocsEntry): Promise<string> {
  const related = await relatedTerms(entry);
  if (related.length === 0) {
    return "";
  }

  const items = related.map(
    (term) => `- [${term.data.title}](${absoluteUrl(termHref(term))}): ${term.data.description}`,
  );

  return ["## Related terms", "", ...items].join("\n");
}

// Markdown, split in fenced code blocks and the text between them. Only
// the text gets rewritten: code shows what it shows.
interface Segment {
  code: boolean;
  text: string;
}

function splitFences(markdown: string): Segment[] {
  const segments: Segment[] = [];
  let lines: string[] = [];
  let fence: string | undefined;

  const flush = (code: boolean) => {
    if (lines.length > 0) {
      segments.push({ code, text: lines.join("\n") });
    }
    lines = [];
  };

  for (const line of markdown.split("\n")) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/)?.[1];

    if (!fence && marker) {
      flush(false);
      fence = marker;
      lines.push(line);
      continue;
    }

    lines.push(line);

    // A fence closes with at least as many of the same characters, and
    // nothing else on the line.
    const closes =
      fence && marker && marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker;
    if (closes) {
      flush(true);
      fence = undefined;
    }
  }
  flush(Boolean(fence));

  return segments;
}

async function mapText(markdown: string, rewrite: (text: string) => Promise<string>): Promise<string> {
  const segments = splitFences(markdown);
  const rewritten = await Promise.all(
    segments.map((segment) => (segment.code ? segment.text : rewrite(segment.text))),
  );
  return rewritten.join("\n");
}

// Inline code is left alone too: `[action](/glossary/action/)` in a page
// about writing pages is an example, not a link.
async function mapOutsideInlineCode(text: string, rewrite: (part: string) => Promise<string>): Promise<string> {
  const parts = text.split(/(`+[^`]*?`+)/);
  const rewritten = await Promise.all(parts.map((part, index) => (index % 2 === 1 ? part : rewrite(part))));
  return rewritten.join("");
}

// MDX

async function mdxToMarkdown(body: string, entry: DocsEntry): Promise<string> {
  const withoutImports = await mapText(body, async (text) =>
    text.replace(/^import\s[^\n]*\sfrom\s+["'][^"']+["'];?[ \t]*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, ""),
  );

  return replaceComponents(withoutImports, entry);
}

// Where the code is: fenced code blocks, and inline code in the text
// between them. A component tag in there is an example, not a component.
function codeRanges(markdown: string): [number, number][] {
  const ranges: [number, number][] = [];
  let offset = 0;

  for (const segment of splitFences(markdown)) {
    if (segment.code) {
      ranges.push([offset, offset + segment.text.length]);
    } else {
      for (const match of segment.text.matchAll(/`+[^`]*?`+/g)) {
        ranges.push([offset + match.index, offset + match.index + match[0].length]);
      }
    }

    // splitFences() cut the Markdown at line breaks.
    offset += segment.text.length + 1;
  }

  return ranges;
}

type AttributeValue = string | true | { expression: string };
type Attributes = Record<string, AttributeValue>;

interface ParsedTag {
  attributes: Attributes;
  end: number;
  selfClosing: boolean;
}

// The attributes of a JSX tag, from right after its name to its `>` or `/>`.
function parseAttributes(source: string, start: number): ParsedTag {
  const attributes: Attributes = {};
  let position = start;

  while (position < source.length) {
    while (/\s/.test(source[position])) {
      position++;
    }

    if (source.startsWith("/>", position)) {
      return { attributes, end: position + 2, selfClosing: true };
    }
    if (source[position] === ">") {
      return { attributes, end: position + 1, selfClosing: false };
    }

    const name = source.slice(position).match(/^[A-Za-z_:][\w:.-]*/)?.[0];
    if (!name) {
      throw new Error(`Can't read the tag at "${source.slice(start - 20, start + 40)}"`);
    }
    position += name.length;

    // JSX allows whitespace around the "=", like `caption = "x"`.
    let afterName = position;
    while (/\s/.test(source[afterName])) {
      afterName++;
    }

    if (source[afterName] !== "=") {
      attributes[name] = true;
      continue;
    }

    position = afterName + 1;
    while (/\s/.test(source[position])) {
      position++;
    }

    const quote = source[position];
    if (quote === '"' || quote === "'") {
      const close = source.indexOf(quote, position + 1);
      attributes[name] = source.slice(position + 1, close);
      position = close + 1;
    } else if (quote === "{") {
      const close = matchingBrace(source, position);
      attributes[name] = { expression: source.slice(position + 1, close) };
      position = close + 1;
    }
  }

  throw new Error(`A tag is not closed, near "${source.slice(start - 20, start + 40)}"`);
}

// The `}` that closes the `{` at `start`, skipping braces inside strings.
function matchingBrace(source: string, start: number): number {
  let depth = 0;
  let quote: string | undefined;

  for (let position = start; position < source.length; position++) {
    const character = source[position];

    if (quote) {
      if (character === "\\") {
        position++;
      } else if (character === quote) {
        quote = undefined;
      }
      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      quote = character;
    } else if (character === "{") {
      depth++;
    } else if (character === "}") {
      depth--;
      if (depth === 0) {
        return position;
      }
    }
  }

  throw new Error(`A { is not closed, near "${source.slice(start, start + 40)}"`);
}

// Where the element that opened before `from` closes: its `</Name>`, past
// any element of the same name inside it.
function findClosingTag(source: string, name: string, from: number): { start: number; end: number } {
  const tags = new RegExp(`<(/?)${name}(?=[\\s/>])`, "g");
  tags.lastIndex = from;
  let depth = 1;

  for (let match = tags.exec(source); match; match = tags.exec(source)) {
    if (match[1]) {
      depth--;
      if (depth === 0) {
        return { start: match.index, end: source.indexOf(">", match.index) + 1 };
      }
      continue;
    }

    const tag = parseAttributes(source, match.index + match[0].length);
    if (!tag.selfClosing) {
      depth++;
    }
    tags.lastIndex = tag.end;
  }

  throw new Error(`<${name}> is not closed`);
}

// The value of a prop: a string, or the JavaScript in its braces, which on
// these pages is always plain data. It comes from the pages of this
// repository, which MDX runs as code anyway.
function propValue(value: AttributeValue | undefined): unknown {
  if (value === undefined || value === true || typeof value === "string") {
    return value;
  }
  return new Function(`return (${value.expression});`)();
}

// Works on the whole page, not on the text between code: a component can
// hold a code block, like a <Fragment> with a fence, or backticks in an
// attribute, like caption="Use `ha-button`". Cut at the code first, and
// the component would be cut in half. Only where a tag starts decides
// whether it is code.
async function replaceComponents(text: string, entry: DocsEntry): Promise<string> {
  const code = codeRanges(text);
  const inCode = (position: number) => code.some(([start, end]) => position >= start && position < end);

  const opening = /<([A-Z][A-Za-z0-9]*)(?=[\s/>])/g;
  let result = "";
  let position = 0;

  for (let match = opening.exec(text); match; match = opening.exec(text)) {
    if (inCode(match.index)) {
      continue;
    }

    const name = match[1];
    const tag = parseAttributes(text, match.index + match[0].length);
    let children = "";
    let end = tag.end;

    if (!tag.selfClosing) {
      const closing = findClosingTag(text, name, tag.end);
      children = text.slice(tag.end, closing.start);
      end = closing.end;
    }

    result += text.slice(position, match.index);
    result += await renderComponent(name, tag.attributes, children, entry);
    position = end;
    opening.lastIndex = end;
  }

  return result + text.slice(position);
}

async function renderComponent(
  name: string,
  attributes: Attributes,
  children: string,
  entry: DocsEntry,
): Promise<string> {
  switch (name) {
    case "Demo":
      return demo(attributes, children);
    case "DoDont":
      return doDont(attributes, children);
    case "StackDiagram":
      return stackDiagram(propValue(attributes.layers) as DiagramLayer[], propValue(attributes.caption) as string);
    case "ArchitectureMap":
      return architectureMap();
    case "ColorPalette":
      return tokenList(paletteSwatches(propValue(attributes.palette) as Palette));
    case "TokenScale":
      return tokenList(tokenScale(propValue(attributes.scale) as Scale));
    case "GlossaryIndex":
      return glossaryIndex();
    case "EventList":
      return eventList();
    case "IntegrationCategories":
      return integrationCategories();
    case "IntegrationConnectivity":
      return integrationConnectivity();
    case "Fragment":
      return children;
    // A script that sends old links of design.home-assistant.io to their
    // new page. Nothing to read.
    case "DesignHashRedirect":
      return "";
    default:
      throw new Error(
        `${entry.filePath} uses <${name}>, which has no Markdown version yet. Add one to renderComponent() in src/lib/markdown-export.ts.`,
      );
  }
}

// Removes the indentation that all lines share, and blank lines around.
function dedent(markup: string): string {
  const lines = markup.replace(/^\s*\n/, "").replace(/\n\s*$/, "").split("\n");
  const indents = lines.filter((line) => line.trim()).map((line) => line.match(/^\s*/)?.[0].length ?? 0);
  const shared = Math.min(...indents);
  return lines.map((line) => line.slice(shared)).join("\n");
}

function codeBlock(markup: string): string {
  return `\`\`\`html\n${dedent(markup)}\n\`\`\``;
}

// The frontend elements in a piece of markup, like `ha-button`.
function elementNames(markup: string): string[] {
  const names = [...markup.matchAll(/<([a-z][a-z0-9]*-[a-z0-9-]*)/g)].map((match) => match[1]);
  return [...new Set(names)];
}

function demo(attributes: Attributes, children: string): string {
  const names = elementNames(children).map((name) => `\`${name}\``);
  const of = names.length > 0 ? ` of ${names.join(", ")}` : "";
  const home = attributes.hass ? ", connected to a demo Home Assistant" : "";
  const caption = propValue(attributes.caption);
  const note = `Live demo${of}${home}.${caption ? ` ${caption}` : ""}`;

  return `${note}\n\n${codeBlock(children)}`;
}

// The top level elements of a piece of HTML, as written.
function topLevelElements(markup: string): string[] {
  const voidElements = new Set(["area", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
  const tags = /<(\/?)([A-Za-z][\w-]*)(?:[^>"']|"[^"]*"|'[^']*')*?(\/?)>/g;
  const elements: string[] = [];
  let depth = 0;
  let start = 0;

  for (const match of markup.matchAll(tags)) {
    const [whole, closing, name, selfClosing] = match;
    const index = match.index ?? 0;

    if (closing) {
      depth--;
      if (depth === 0) {
        elements.push(markup.slice(start, index + whole.length));
      }
      continue;
    }

    if (depth === 0) {
      start = index;
    }
    if (selfClosing || voidElements.has(name.toLowerCase())) {
      if (depth === 0) {
        elements.push(whole);
      }
      continue;
    }
    depth++;
  }

  return elements;
}

// The markup of one side of a do and don't: an element with that slot, or
// the contents of a Fragment with it.
function slotMarkup(children: string, slot: string): string {
  const pattern = new RegExp(`\\sslot=["']${slot}["']`);

  return topLevelElements(children)
    .filter((element) => pattern.test(element.slice(0, element.indexOf(">") + 1)))
    .map((element) =>
      element.startsWith("<Fragment")
        ? dedent(element.replace(/^<Fragment[^>]*>/, "").replace(/<\/Fragment>$/, ""))
        : element.replace(pattern, ""),
    )
    .join("\n");
}

function doDont(attributes: Attributes, children: string): string {
  const home = attributes.hass ? " Both are connected to a demo Home Assistant." : "";

  return [
    `Do and don't, as live demos.${home}`,
    `**Do:** ${propValue(attributes.doText)}`,
    codeBlock(slotMarkup(children, "do")),
    `**Don't:** ${propValue(attributes.dontText)}`,
    codeBlock(slotMarkup(children, "dont")),
  ].join("\n\n");
}

interface DiagramBox {
  title: string;
  text: string;
  href?: string;
}

interface DiagramLayer {
  label: string;
  href?: string;
  boxes: DiagramBox[];
  highlight?: boolean;
}

function linked(label: string, href?: string): string {
  return href ? `[${label}](${href})` : label;
}

// A stack diagram as a nested list: the layers, top to bottom, and the
// boxes in each.
function stackDiagram(layers: DiagramLayer[], caption?: string): string {
  const lines = [`Diagram. ${caption ?? "From top to bottom."}`, ""];

  for (const layer of layers) {
    const highlight = layer.highlight ? " (the subject of this page)" : "";
    lines.push(`- ${linked(layer.label, layer.href)}${highlight}`);
    for (const box of layer.boxes) {
      lines.push(`  - ${linked(box.title, box.href)}: ${box.text}`);
    }
  }

  return lines.join("\n");
}

// The map of "The big picture" (ArchitectureMap.astro), as a nested list.
function architectureMap(): string {
  const layer = ({ label, href, boxes }: MapLayer, extra: string[] = []) => [
    `- ${linked(label, href)}`,
    ...boxes.map((box) => `  - ${linked(box.title, box.href)}: ${box.text}`),
    ...extra,
  ];

  return [
    "Diagram. All the pieces of Home Assistant, from top to bottom.",
    "",
    ...layer(PEOPLE),
    `- They talk to Core through: ${linked(APIS.label, APIS.href)}`,
    ...layer(CORE, [`  - ${linked(INTEGRATIONS.label, INTEGRATIONS.href)}: ${INTEGRATIONS.text}`]),
    `- Core reaches what it connects to through: ${NETWORK}`,
    ...layer(OUTSIDE),
    ...layer(PLATFORM),
  ].join("\n");
}

function tokenList(values: { token: string; value: string }[]): string {
  return values.map(({ token, value }) => `- \`${token}\`: ${value}`).join("\n");
}

// The list of every term on the glossary overview, A to Z.
async function glossaryIndex(): Promise<string> {
  const terms = await getTerms();
  return terms.map((term) => `- [${term.data.title}](${termHref(term)}): ${term.data.description}`).join("\n");
}

// The integration categories, each with the values to use in the manifest.
async function integrationCategories(): Promise<string> {
  const categories = await getIntegrationCategories();
  if (!categories) {
    return `The categories couldn't be loaded when this page was built. Find them in [core](${CATEGORIES_SOURCE}).`;
  }

  return categories
    .map((category) =>
      [
        `- ${category.name}: ${category.description}`,
        `  - ${category.subcategories.length > 0 ? `${category.name}, in general` : category.name}: \`${category.slug}\``,
        ...category.subcategories.map(
          (subcategory) => `  - ${subcategory.name}: \`${category.slug}.${subcategory.slug}\``,
        ),
      ].join("\n"),
    )
    .join("\n");
}

// The connectivity values, each with the value to use in the manifest.
async function integrationConnectivity(): Promise<string> {
  const connectivity = await getIntegrationConnectivity();
  if (!connectivity) {
    return `The connectivity values couldn't be loaded when this page was built. Find them in [core](${CONNECTIVITY_SOURCE}).`;
  }

  return connectivity.map((value) => `- ${value.name}: ${value.description} \`${value.slug}\``).join("\n");
}

// The upcoming events, as the page shows them before its script runs: in
// UTC. All-day events have a date only.
async function eventList(): Promise<string> {
  const { loaded, events } = await getUpcomingEvents();
  if (!loaded) {
    return "The calendar couldn't be loaded when this page was built.";
  }
  if (events.length === 0) {
    return "Nothing is planned in the next three months.";
  }

  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  });

  return events
    .map((event) => {
      const when = `${date.format(event.start)}, ${event.allDay ? "all day" : time.format(event.start)}`;
      const title = event.url ? `[${event.title}](${event.url})` : event.title;
      const links = [
        event.joinUrl && `[Join with Google Meet](${event.joinUrl})`,
        event.notesUrl && `[Agenda and notes](${event.notesUrl})`,
      ].filter(Boolean);
      return links.length ? `- ${when}: ${title} (${links.join(", ")})` : `- ${when}: ${title}`;
    })
    .join("\n");
}

// Links

const contentImages = import.meta.glob<ImageMetadata>("../content/docs/**/*.{png,jpg,jpeg,gif,webp,avif,svg}", {
  import: "default",
});

// An image next to the page, at the URL the build gives it.
async function imageUrl(target: string, entry: DocsEntry): Promise<string> {
  const folder = (entry.filePath ?? "").replace(/[^/]+$/, "");
  const file = new URL(target, `file:///${folder}`).pathname.slice(1).replace(/^src\//, "../");
  const load = contentImages[file];
  if (!load) {
    throw new Error(`${entry.filePath} uses the image ${target}, which is not there.`);
  }

  const image = await getImage({ src: await load() });
  return absoluteUrl(image.src);
}

async function absoluteTarget(target: string, entry: DocsEntry, pageUrl: string): Promise<string> {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("//")) {
    return target;
  }
  if (target.startsWith("/")) {
    return absoluteUrl(target);
  }
  if (/\.(png|jpe?g|gif|webp|avif|svg)$/i.test(target)) {
    return imageUrl(target, entry);
  }
  return new URL(target, pageUrl).href;
}

async function replaceAsync(
  text: string,
  pattern: RegExp,
  replace: (...groups: string[]) => Promise<string>,
): Promise<string> {
  const replacements = await Promise.all([...text.matchAll(pattern)].map((match) => replace(...match)));
  let index = 0;
  return text.replace(pattern, () => replacements[index++]);
}

async function absoluteLinks(markdown: string, entry: DocsEntry, pageUrl: string): Promise<string> {
  const absolute = (target: string) => absoluteTarget(target, entry, pageUrl);

  return mapText(markdown, (text) =>
    mapOutsideInlineCode(text, async (part) => {
      // [text](target), and ![alt](target) for images.
      let result = await replaceAsync(
        part,
        /\]\(([^)\s]+)((?:\s+"[^"]*")?\))/g,
        async (_, target, rest) => `](${await absolute(target)}${rest}`,
      );
      // Reference style: [name]: target
      result = await replaceAsync(
        result,
        /^(\s*\[[^\]]+\]:\s+)(\S+)/gm,
        async (_, start, target) => `${start}${await absolute(target)}`,
      );
      // HTML, like <a href="/start/">.
      return replaceAsync(
        result,
        /\b(href|src)="([^"]+)"/g,
        async (_, attribute, target) => `${attribute}="${await absolute(target)}"`,
      );
    }),
  );
}

// Discord, as src/lib/discord-links.mjs links it on the site: **#core**
// becomes a link to the channel, and discord:project-forum its URL.
async function discordLinks(markdown: string): Promise<string> {
  const byName = new Map<string, string>();
  const byId = new Map<string, string>();
  for (const channel of DISCORD_CHANNELS) {
    byId.set(channel.id, channel.url);
    if (channel.name) {
      byName.set(channel.name, channel.url);
    }
  }

  return mapText(markdown, (text) =>
    mapOutsideInlineCode(text, async (part) =>
      part
        .replace(/(?<!\[)\*\*(#[a-z0-9-]+)\*\*/g, (bold, name) => {
          const url = byName.get(name);
          return url ? `[${bold}](${url})` : bold;
        })
        .replace(/\]\(discord:([a-z0-9-]+)\)/g, (link, id) => (byId.has(id) ? `](${byId.get(id)})` : link)),
    ),
  );
}

// Repository paths, as src/lib/source-paths.mjs links them on the site:
// inline code that is exactly a known path becomes a link to the file on
// GitHub. Not in headings, and not in the text of a link, inline or by
// reference.
const resolveSourcePath = createResolver(sourcePathIndex);

async function sourcePathLinks(markdown: string, entry: DocsEntry): Promise<string> {
  const docsPath = (entry.filePath ?? "").replace(/^.*?src\/content\/docs\//, "");

  const linkLine = (line: string) => {
    if (/^\s*#{1,6}\s/.test(line)) {
      return line;
    }

    const linkTexts = [...line.matchAll(/\[[^\]]*\][([]/g)].map((match) => [match.index, match.index + match[0].length]);

    // A code span closes with as many backticks as it opened with, so in
    // ``a `src/b.ts` c`` the single backticks are part of the code.
    return line.replace(/(?<!`)(`+)(?!`)(.+?)(?<!`)\1(?!`)/g, (code, _ticks: string, text: string, offset: number) => {
      const insideLink = linkTexts.some(([start, end]) => offset > start && offset < end);
      const found = !insideLink && resolveSourcePath(docsPath, text);
      return found ? `[${code}](${sourcePathUrl(found)})` : code;
    });
  };

  return mapText(markdown, async (text) => text.split("\n").map(linkLine).join("\n"));
}

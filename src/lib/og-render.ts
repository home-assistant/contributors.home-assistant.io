// How a share card looks. What is on the card of each page is in
// src/lib/og.ts.
//
// Satori lays out the card from a tree of elements with CSS (flexbox only)
// and turns it into an SVG with the text as shapes. resvg makes that a PNG.
// Rendering is the slow part, so every PNG is cached in node_modules/.cache/og/
// by a hash of everything that goes into it: change the text, a color, or
// a font, and only the cards that changed render again. `pnpm clean` leaves
// that folder alone: delete it to render every card again.
//
// To work on the design, run `pnpm dev` and open a card in the browser, like
// http://localhost:4321/og/design/components/badge.png. Try a long title too.

import { Resvg } from "@resvg/resvg-js";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import satori, { type Font } from "satori";
import sharp from "sharp";
import pattern from "../assets/shapes/pattern.svg?raw";
import { ICONS } from "./icons";
import { type Card, type CardAuthor, type CardLabel, OG_HEIGHT, OG_WIDTH } from "./og";

const ROOT = process.cwd();

const COLORS = {
  navy: "#002332",
  mist: "#f5f6fa",
  slate: "#4f606e",
  blue: "#18bcf2",
  // Muted text on navy, 9.8:1.
  muted: "#b8c9d4",
};

// The tile colors of the dark theme (src/styles/global.css), which are made
// for a navy background. Groups without a color of their own use "everyone",
// like the badge in the sidebar does.
const TONES: Record<CardLabel["tone"], { color: string; background: string }> = {
  start: { color: "#b9e6fc", background: "#0c3a4d" },
  build: { color: "#7bd4fb", background: "#0a3445" },
  shape: { color: "#ffbb89", background: "#3b1f0c" },
  run: { color: "#93da98", background: "#0d3019" },
  understand: { color: "#b9e6fc", background: "#0c3a4d" },
  blog: { color: "#16f3be", background: "#05382f" },
};

// Satori reads TTF, OTF, and WOFF, not WOFF2, so the cards use the static
// Figtree files of @fontsource/figtree. Latin-ext covers names like Čermák.
function loadFonts(): Font[] {
  const files = path.join(ROOT, "node_modules/@fontsource/figtree/files");
  const fonts: Font[] = [];

  for (const subset of ["latin", "latin-ext"]) {
    for (const weight of [500, 600, 700] as const) {
      fonts.push({
        name: "Figtree",
        data: readFileSync(path.join(files, `figtree-${subset}-${weight}-normal.woff`)),
        weight,
        style: "normal",
      });
    }
  }

  return fonts;
}

let fonts: Font[] | undefined;

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// The avatars are JPEG files with a .png name (that is what GitHub sends),
// so the type comes from the first bytes, not the name.
function imageDataUri(publicPath: string): string | undefined {
  const file = path.join(ROOT, "public", publicPath);
  if (!existsSync(file)) {
    return undefined;
  }

  const data = readFileSync(file);
  const type = data[0] === 0xff && data[1] === 0xd8 ? "image/jpeg" : "image/png";
  return `data:${type};base64,${data.toString("base64")}`;
}

const LOGO = svgDataUri(readFileSync(path.join(ROOT, "public/images/home-assistant-logo-white.svg"), "utf8"));
const LOGO_ON_LIGHT = svgDataUri(readFileSync(path.join(ROOT, "public/images/home-assistant-logo.svg"), "utf8"));
// The wordmark is 1705 by 241.
const LOGO_RATIO = 1705 / 241;

const PATTERN = svgDataUri(pattern);
// The pattern of the homepage hero is 384 by 320.
const PATTERN_RATIO = 384 / 320;

function iconDataUri(name: string, color: string): string {
  const paths = ICONS[name as keyof typeof ICONS];
  if (!paths) {
    throw new Error(`Unknown icon for a share card: ${name}`);
  }

  return svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`,
  );
}

// Satori takes the same tree React would make. This builds one by hand, so
// the cards need no React and no JSX.
type Child = Node | string | false | undefined;

interface Node {
  type: string;
  props: { style?: Record<string, unknown>; children?: Child | Child[]; [key: string]: unknown };
}

function h(type: string, props: Node["props"], ...children: Child[]): Node {
  const kept = children.filter((child) => child !== false && child !== undefined);
  return { type, props: { ...props, children: kept.length === 1 ? kept[0] : kept } };
}

// Titles of older blog posts put code in backticks. On a card, they read
// better without them.
function plain(text: string): string {
  return text.replace(/`/g, "").replace(/\s+/g, " ").trim();
}

// Long titles get a smaller size, so most fit in two or three lines. Longer
// than three lines still ends in an ellipsis.
function titleSize(title: string): number {
  if (title.length <= 32) return 76;
  if (title.length <= 60) return 64;
  return 54;
}

function lockup(size: number, onLight = false): Node {
  return h(
    "div",
    { style: { display: "flex", alignItems: "center" } },
    h("img", {
      src: onLight ? LOGO_ON_LIGHT : LOGO,
      width: Math.round(size * 1.4 * LOGO_RATIO),
      height: Math.round(size * 1.4),
    }),
    h("div", {
      style: {
        width: 2,
        height: size * 1.1,
        margin: `0 ${size * 0.6}px`,
        backgroundColor: onLight ? COLORS.navy : COLORS.mist,
      },
    }),
    h("div", { style: { fontSize: size, fontWeight: 600, letterSpacing: -0.3 } }, "Contributors"),
  );
}

// The circles and sparkles of the homepage hero.
function shapes(width: number, style: Record<string, unknown>): Node {
  return h("img", {
    src: PATTERN,
    width,
    height: Math.round(width / PATTERN_RATIO),
    style: { position: "absolute", ...style },
  });
}

function label({ text, icon, tone }: CardLabel): Node {
  const colors = TONES[tone];

  return h(
    "div",
    { style: { display: "flex", alignItems: "center", gap: 16 } },
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.background,
        },
      },
      h("img", { src: iconDataUri(icon, colors.color), width: 30, height: 30 }),
    ),
    h("div", { style: { fontSize: 30, fontWeight: 600, color: colors.color } }, text),
  );
}

function byline({ authors, date }: { authors: CardAuthor[]; date: string }): Node {
  const avatars = authors
    .map((author) => (author.avatar ? imageDataUri(author.avatar) : undefined))
    .filter((avatar): avatar is string => Boolean(avatar));

  return h(
    "div",
    { style: { display: "flex", alignItems: "center", gap: 20, minWidth: 0 } },
    avatars.length > 0 &&
      h(
        "div",
        { style: { display: "flex" } },
        ...avatars.slice(0, 4).map((src, index) =>
          h("img", {
            src,
            width: 56,
            height: 56,
            style: {
              borderRadius: 28,
              border: `3px solid ${COLORS.navy}`,
              marginLeft: index === 0 ? 0 : -16,
            },
          }),
        ),
      ),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 2, fontSize: 26, minWidth: 0 } },
      h(
        "div",
        { style: { display: "block", fontWeight: 600, color: COLORS.mist, lineClamp: 1 } },
        authors.map((author) => author.name).join(", "),
      ),
      h("div", { style: { color: COLORS.muted, fontWeight: 500 } }, date),
    ),
  );
}

function pageCard(card: Extract<Card, { kind: "page" }>): Node {
  const title = plain(card.title);

  return h(
    "div",
    {
      style: {
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: OG_WIDTH,
        height: OG_HEIGHT,
        // Satori sizes boxes without their padding unless told otherwise.
        boxSizing: "border-box",
        padding: "60px 72px 56px",
        backgroundColor: COLORS.navy,
        color: COLORS.mist,
        fontFamily: "Figtree",
      },
    },
    // Quiet enough to stay behind the text: the text column ends before it.
    shapes(330, { right: -90, top: -70, opacity: 0.2 }),
    lockup(30),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center", maxWidth: 980 } },
      label(card.label),
      h(
        "div",
        {
          style: {
            display: "block",
            marginTop: 22,
            fontSize: titleSize(title),
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: -1.5,
            lineClamp: 3,
          },
        },
        title,
      ),
      card.description &&
        h(
          "div",
          {
            style: {
              display: "block",
              marginTop: 20,
              fontSize: 28,
              fontWeight: 500,
              lineHeight: 1.35,
              color: COLORS.muted,
              lineClamp: 2,
            },
          },
          plain(card.description),
        ),
    ),
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 32,
          fontSize: 24,
          fontWeight: 600,
          color: COLORS.blue,
        },
      },
      card.byline
        ? byline(card.byline)
        : h(
            "div",
            { style: { display: "block", lineClamp: 1 } },
            `contributors.home-assistant.io${card.path}`,
          ),
      card.byline && h("div", { style: { flexShrink: 0 } }, "contributors.home-assistant.io"),
    ),
  );
}

function brandCard(card: Extract<Card, { kind: "brand" }>): Node {
  return h(
    "div",
    {
      style: {
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: OG_WIDTH,
        height: OG_HEIGHT,
        // Satori sizes boxes without their padding unless told otherwise.
        boxSizing: "border-box",
        padding: "64px 72px",
        // The gradient of the homepage hero, with navy text.
        backgroundImage: "linear-gradient(105deg, #f2fbff 0%, #cdeffc 38%, #8ee6dd 72%, #4fc5e6 100%)",
        color: COLORS.navy,
        fontFamily: "Figtree",
      },
    },
    shapes(400, { right: 56, top: 115 }),
    lockup(34, true),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "flex-end", maxWidth: 660 } },
      h(
        "div",
        { style: { display: "block", fontSize: 84, fontWeight: 600, lineHeight: 1.0, letterSpacing: -2, lineClamp: 3 } },
        card.title,
      ),
      h(
        "div",
        {
          style: {
            display: "block",
            marginTop: 28,
            fontSize: 30,
            fontWeight: 500,
            lineHeight: 1.35,
            color: COLORS.slate,
            lineClamp: 3,
          },
        },
        card.description,
      ),
    ),
  );
}

function versionOf(pkg: string): string {
  const manifest = JSON.parse(readFileSync(path.join(ROOT, "node_modules", pkg, "package.json"), "utf8"));
  return `${pkg}@${manifest.version}`;
}

const CACHE = path.join(ROOT, "node_modules/.cache/og");
// Small cards show up fast in a preview, also on a slow connection.
const MAX_BYTES = 100 * 1024;
// What else makes a card look the way it does, next to its element tree.
// Change the steps after Satori in renderCard(), and this should change too.
const RENDERER = [
  `palette over ${MAX_BYTES} bytes`,
  versionOf("satori"),
  versionOf("@resvg/resvg-js"),
  versionOf("sharp"),
  versionOf("@fontsource/figtree"),
].join(" ");

export async function renderCard(card: Card): Promise<Buffer> {
  const tree = card.kind === "brand" ? brandCard(card) : pageCard(card);

  // The tree holds every text, style, and image of the card, so its hash
  // changes with anything that changes the picture.
  const key = createHash("sha256").update(RENDERER).update(JSON.stringify(tree)).digest("hex");
  const cached = path.join(CACHE, `${key}.png`);
  if (existsSync(cached)) {
    return readFileSync(cached);
  }

  fonts ??= loadFonts();
  // Satori types its input as a React element; the tree has the same shape.
  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts,
  });
  let png: Buffer = new Resvg(svg, { fitTo: { mode: "width", value: OG_WIDTH } }).render().asPng();

  // Cards on navy stay well under 100 KB. The gradient of the brand cards
  // does not: 256 colors make those a quarter of the size, without a visible
  // difference. Doing that for every card would double the build time.
  if (png.length > MAX_BYTES) {
    png = await sharp(png).png({ palette: true, quality: 100, effort: 10, compressionLevel: 9 }).toBuffer();
  }

  mkdirSync(CACHE, { recursive: true });
  writeFileSync(cached, png);
  return png;
}

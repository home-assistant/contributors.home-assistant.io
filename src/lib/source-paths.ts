// Links file paths of the project repositories in the text of the docs to
// that file on GitHub. When a page mentions a file or a folder in inline
// code, like `src/dialogs/more-info/controls/more-info-cover.ts` on a
// Frontend page, it becomes a link to it on the default branch of the
// frontend.
//
// Not every path is one of a repository. `/config/configuration.yaml` is on
// your own install, `custom_components/<domain>/` is your own integration,
// and `/api/states` is a URL. So a path only links when it exists in a
// repository the page is about, and in only one of them.
//
// - SCOPES says which repositories a page is about, by where the page is.
//   A repository can be limited to paths that start with a given folder:
//   on Core pages, `src/` paths are of the frontend, the rest of core.
// - The index in src/data/source-paths.json lists the paths the docs
//   mention that exist, per repository. `pnpm source-paths` generates it
//   (scripts/generate-source-paths.ts), with the rules in this file.
// - Only inline code that is exactly a path: with a `/`, and a file
//   extension or a trailing `/` for a folder. Nothing with a placeholder,
//   like `<domain>`, nothing absolute, and no URLs.
// - Never in code blocks, headings, or links, so a code symbol that is
//   already a link stays the link of the symbol.
//
// Links point at the branch, not a commit: they keep working when the file
// changes, and only break when it moves. The generator reports those.
//
// Like the code symbols, the plugin carries a fingerprint of the index, so
// a new index renders every page again. In `pnpm dev`, sourcePathsWatch()
// restarts the server when the index changes.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import type { Parents } from "hast";
import { defineHastPlugin } from "satteri";

interface Repository {
  repository: string;
  branch: string;
}

// The repositories of a folder of pages in SCOPES.
interface ScopeRule {
  id: RepositoryId;
  only?: string[];
}

// A path of a repository the docs mention, in the index. `type` is "file"
// or "folder".
export interface PathEntry {
  path: string;
  repository: string;
  branch: string;
  type?: string;
}

// src/data/source-paths.json.
export interface SourcePathsIndex {
  paths?: PathEntry[];
}

export const INDEX_FILE = fileURLToPath(new URL("../data/source-paths.json", import.meta.url));

const DOCS_DIR = fileURLToPath(new URL("../content/docs/", import.meta.url));

// The repositories, with their default branch. See the table in
// .github/skills/fact-check/SKILL.md, and the example app of the community
// apps, which Build a real app walks through.
export const REPOSITORIES = {
  "app-example": { repository: "hassio-addons/app-example", branch: "main" },
  "apps-example": { repository: "home-assistant/apps-example", branch: "main" },
  brands: { repository: "home-assistant/brands", branch: "master" },
  builder: { repository: "home-assistant/builder", branch: "master" },
  core: { repository: "home-assistant/core", branch: "dev" },
  frontend: { repository: "home-assistant/frontend", branch: "dev" },
  "home-assistant.io": { repository: "home-assistant/home-assistant.io", branch: "current" },
  intents: { repository: "OHF-Voice/intents", branch: "main" },
  android: { repository: "home-assistant/android", branch: "main" },
  iOS: { repository: "home-assistant/iOS", branch: "main" },
  "operating-system": { repository: "home-assistant/operating-system", branch: "dev" },
  supervisor: { repository: "home-assistant/supervisor", branch: "main" },
} satisfies Record<string, Repository>;

export type RepositoryId = keyof typeof REPOSITORIES;

// The repositories the pages in a folder of src/content/docs/ are about.
// The longest folder that holds the page wins. `only` limits a repository
// to paths that start with one of those folders. A page in a folder that
// is not listed, like the blog or Community, links no paths.
//
// Where a page names paths of several repositories at once, a path that
// exists in more than one of them stays plain: there is no way to tell which
// one the page means. The AI tools page in Start is left out on purpose: it
// names the same files for six repositories and this site, often in one
// sentence, so even a path that exists in only one of them can mean another.
export const SCOPES: Record<string, ScopeRule[]> = {
  "apps/": [{ id: "apps-example" }, { id: "builder", only: ["actions/"] }],
  // Walks through the example app of the community apps, not the one of
  // Home Assistant.
  "apps/build-a-real-app.md": [{ id: "app-example" }],
  "architecture/": [{ id: "core" }, { id: "frontend" }],
  "architecture/core/": [{ id: "core" }],
  "architecture/frontend/": [{ id: "frontend" }],
  "brand/": [{ id: "frontend", only: ["src/"] }],
  "companion/android/": [{ id: "android" }],
  "companion/apple/": [{ id: "iOS" }],
  "core/": [
    { id: "core" },
    { id: "brands", only: ["core_brands/", "core_integrations/"] },
    { id: "frontend", only: ["src/"] },
    { id: "home-assistant.io", only: ["source/"] },
  ],
  "design/": [{ id: "frontend" }],
  "frontend/": [{ id: "frontend" }],
  "glossary/": [
    { id: "core", only: ["homeassistant/"] },
    { id: "operating-system", only: ["buildroot-external/"] },
  ],
  "marketplace/": [{ id: "frontend", only: ["src/"] }],
  "os/": [{ id: "supervisor" }, { id: "operating-system" }],
  "os/operating-system/": [{ id: "operating-system" }],
  "os/supervisor/": [{ id: "supervisor" }, { id: "core", only: ["homeassistant/"] }],
  "security/": [{ id: "core" }, { id: "frontend" }],
  "translate/": [
    { id: "intents" },
    { id: "core", only: ["homeassistant/"] },
    { id: "frontend", only: ["src/"] },
  ],
  "writing/": [{ id: "home-assistant.io", only: ["source/"] }],
};

// Paths a page mentions that are not the file of the repository, although
// they look like one: a file you create yourself, an example, or the same
// folder in another repository. They never link, and the generator does not
// report them as missing.
export const NOT_REPOSITORY_PATHS: Partial<Record<string, string[]>> = {
  // The folder of every plugin repository, not the one of the Supervisor.
  "os/supervisor/plugins.md": ["rootfs/"],
  // Files you create, or the build writes.
  "companion/apple/get-started.md": ["Configuration/HomeAssistant.overrides.xcconfig"],
  "os/operating-system/test.md": ["tests/haos.qcow2"],
  // The example integrations of the tutorials.
  "core/development/tests.md": ["tests/components/example/snapshots/"],
  "core/integrations/tutorial.md": [
    "core_integrations/example_air/",
    "source/_integrations/example_air.markdown",
    "tests/components/example_air/conftest.py",
    "tests/components/example_air/snapshots/test_sensor.ambr",
  ],
  "frontend/extending/more-info.md": ["src/dialogs/more-info/controls/more-info-example.ts"],
  "frontend/extending/state-card.md": ["src/state-summary/state-card-example.ts"],
  "writing/reference/front-matter.md": ["source/_integrations/awesome_lights.markdown"],
};

// Relative, made of plain path segments, with a `/`, and ending in a file
// extension or a `/`. `src/types.ts` and `homeassistant/helpers/` are
// paths. `/config/configuration.yaml`, `custom_components/<domain>/`,
// `../`, and `https://example.org/` are not.
const PATH = /^(?!\.\.?\/)[\w.@+-]+(?:\/[\w.@+-]+)*\/?$/;

export function isPathMention(text: string) {
  const path = text.trim();
  const lastSegment = path.split("/").at(-1) ?? "";
  return PATH.test(path) && path.includes("/") && (path.endsWith("/") || /\.\w+$/.test(lastSegment));
}

// The page path inside src/content/docs/, like core/entities/cover.md, or
// undefined for any other file.
export function docsPathOf(file: string) {
  return file.startsWith(DOCS_DIR) ? file.slice(DOCS_DIR.length) : undefined;
}

// The repositories a page is about: the rules of the longest folder in
// SCOPES that holds it.
export function scopeOf(docsPath: string | undefined) {
  if (!docsPath) {
    return [];
  }

  const folder = Object.keys(SCOPES)
    .filter((prefix) => docsPath.startsWith(prefix))
    .sort((a, b) => b.length - a.length)[0];

  return folder ? SCOPES[folder] : [];
}

// The repositories a path mention on a page could be in, by the rules
// alone. Whether the path exists there is up to the index.
export function candidatesFor(docsPath: string, text: string) {
  if (!isPathMention(text)) {
    return [];
  }

  const path = text.trim();
  if (NOT_REPOSITORY_PATHS[docsPath]?.includes(path)) {
    return [];
  }

  return scopeOf(docsPath)
    .filter((rule) => !rule.only || rule.only.some((prefix) => path.startsWith(prefix)))
    .map((rule) => rule.id);
}

export function readIndex() {
  if (!existsSync(INDEX_FILE)) {
    return undefined;
  }

  const index: SourcePathsIndex = JSON.parse(readFileSync(INDEX_FILE, "utf8"));
  return index;
}

// The URL of a path in a repository: blob/ for a file, tree/ for a folder.
export function sourcePathUrl(entry: PathEntry) {
  const kind = entry.type === "folder" ? "tree" : "blob";
  return `https://github.com/${entry.repository}/${kind}/${entry.branch}/${entry.path.replace(/\/$/, "")}`;
}

// Finds the entry of the index a path mention on a page means, or
// undefined when it means none, or more than one.
export function createResolver(index: SourcePathsIndex | undefined) {
  const byKey = new Map((index?.paths ?? []).map((entry) => [`${entry.repository}\n${entry.path}`, entry]));

  return (docsPath: string, text: string) => {
    const path = text.trim();
    const matches = candidatesFor(docsPath, text)
      .map((id) => byKey.get(`${REPOSITORIES[id].repository}\n${path}`))
      .filter((entry) => entry !== undefined);

    return matches.length === 1 ? matches[0] : undefined;
  };
}

// Text inside these is never linked: it already is a link, it is a code
// block, or it is a heading or a control.
const SKIP_TAGS = new Set(["a", "pre", "h1", "h2", "h3", "h4", "h5", "h6", "button", "script", "style", "svg"]);

export function sourcePaths() {
  const index = readIndex();
  const resolve = createResolver(index);

  return defineHastPlugin({
    name: "source-paths",
    // Not used by the plugin: it is here so Astro sees a new configuration,
    // and renders every page again, when the index changes.
    paths: createHash("sha256")
      .update(JSON.stringify(index?.paths ?? []))
      .digest("hex")
      .slice(0, 16),

    element: {
      filter: ["code"],
      visit(node, ctx) {
        const docsPath = ctx.fileURL ? docsPathOf(fileURLToPath(ctx.fileURL)) : undefined;
        if (!docsPath) {
          return;
        }

        for (let parent: Readonly<Parents> | undefined = ctx.parent(node); parent && parent.type !== "root"; parent = ctx.parent(parent)) {
          const isSkipped = parent.type === "element" && SKIP_TAGS.has(parent.tagName);
          if (isSkipped || parent.type.startsWith("mdxJsx")) {
            return;
          }
        }

        const entry = resolve(docsPath, ctx.textContent(node));
        if (!entry) {
          return;
        }

        ctx.wrapNode(node, {
          type: "element",
          tagName: "a",
          properties: { href: sourcePathUrl(entry), className: ["source-path"] },
          children: [],
        });
      },
    },
  });
}

// For `pnpm dev`: restarts the server when the index changes, so every page
// links the new paths, not only the ones you open next.
export function sourcePathsWatch(): AstroIntegration {
  return {
    name: "source-paths-watch",
    hooks: {
      "astro:config:setup": ({ command, addWatchFile }) => {
        if (command === "dev") {
          addWatchFile(INDEX_FILE);
        }
      },
    },
  };
}

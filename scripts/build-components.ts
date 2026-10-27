// Bundles real components from the Home Assistant frontend, so the design
// pages can show them live. Output goes to public/components/ (the code) and
// public/static/ (translations, icons, fonts, and map assets).
//
// The output is split: `loader.js` is small, and only loads the components a
// page actually uses, when a demo comes near the viewport. Each component,
// and the code they share, is a separate chunk next to it.
//
// The components are compiled straight from the frontend source. That needs a
// frontend checkout with its dependencies installed (`pnpm install` there).
// The output is committed, so building this site never needs the frontend.
//
// Components that need Home Assistant get a fake one from <ha-demo-hass>
// (demo-runtime/). They also load English translations and icons at runtime,
// which this script generates with the frontend's own build tasks, and puts
// in public/static/. Translations of integrations come from the nightly
// build of the frontend, which needs a GitHub token: GITHUB_TOKEN, or the
// token of the GitHub CLI when it is logged in.
//
// The components are built from a specific commit, `origin/dev` unless you
// pick another one. That commit is exported to a temporary folder, so the
// state of your own working copy does not matter. Run `git fetch` in the
// frontend checkout first to get the latest. The dependencies are not
// exported: they come from the node_modules of the checkout. The script
// warns when the lockfile of the commit differs from the checkout's.
//
// Everything is built in temporary folders first. public/components/ and
// public/static/ are only replaced when the whole build worked, so a failed
// run leaves the previous demos in place. What went into the build is in
// public/components/manifest.json.
//
// Usage:
//   pnpm components                        # origin/dev of ../frontend
//   pnpm components --ref some-branch      # another branch, tag, or commit
//   pnpm components --from /path/frontend  # another checkout
//   pnpm components --check                # only check, build nothing
//
// --check exports the commit, type-checks demo-runtime/ against it, and
// checks that every patch below still matches. It needs no token, takes
// under a minute, and changes nothing in public/.

import { execFileSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdtemp, readdir, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { type Plugin, build } from "esbuild";
import { checkDemoRuntime } from "./check-demos.ts";

// The components to bundle, by their path in src/components, without the
// extension. The file name is the element name. Add a component here before
// you use it in a <Demo>.
const COMPONENTS = [
  "buttons/ha-progress-button",
  "ha-alert",
  "ha-badge",
  "ha-bar",
  "ha-button",
  "ha-control-button",
  "ha-control-circular-slider",
  "ha-control-number-buttons",
  "ha-control-select",
  "ha-control-slider",
  "ha-control-switch",
  "ha-dropdown",
  "ha-dropdown-item",
  "ha-empty-state",
  "ha-expansion-panel",
  "ha-gauge",
  "ha-label-badge",
  "ha-list",
  "ha-list-item",
  "ha-marquee-text",
  "ha-select-box",
  "ha-slider",
  "ha-spinner",
  "ha-svg-icon",
  "ha-switch",
  "ha-textarea",
  "ha-toast",
  "ha-tooltip",
  "input/ha-input",
  "skeleton/ha-skeleton",
  "skeleton/ha-skeleton-icon",
  "skeleton/ha-skeleton-text",
  // These need Home Assistant: use them inside <Demo hass>.
  "device/ha-device-picker",
  "entity/ha-entity-picker",
  "entity/state-badge",
  "ha-area-picker",
  "ha-control-select-menu",
  "ha-faded",
  "ha-form/ha-form",
  "ha-hs-color-picker",
  "ha-selector/ha-selector",
  "ha-state-icon",
];

// Elements for dashboards and dialogs, outside src/components. Their paths
// are relative to the root of the frontend.
const EXTRA_ELEMENTS = {
  "hui-card": "src/panels/lovelace/cards/hui-card",
  "ha-card": "src/components/ha-card",
};

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PUBLIC_DIR = path.join(ROOT, "public");
const DEMO_RUNTIME = path.join(ROOT, "demo-runtime");

// The folders this script owns in public/. Nothing else there is touched.
const PUBLISHED = ["components", "static"];

// translations/artifact.json of the frontend.
interface TranslationsArtifact {
  id: number;
  created_at: string;
  workflow_run?: { id: number };
}

const { values: options } = parseArgs({
  options: {
    from: { type: "string", default: "../frontend" },
    ref: { type: "string", default: "origin/dev" },
    check: { type: "boolean", default: false },
  },
});

const checkout = path.resolve(options.from);
const commit = execFileSync("git", ["rev-parse", `${options.ref}^{commit}`], {
  cwd: checkout,
  encoding: "utf8",
}).trim();
const source = `home-assistant/frontend@${commit.slice(0, 10)} (${options.ref})`;

// The same build time constants the frontend build defines. This bundle is a
// demo, like demo.home-assistant.io: __DEMO__ uses public map tiles and hides
// buttons that need an administrator, like editing.
const WORKERS_URL = "/components/workers";
const DEFINE = {
  __DEV__: "false",
  __DEMO__: "true",
  __BACKWARDS_COMPAT__: "false",
  __BUILD__: JSON.stringify("modern"),
  __VERSION__: JSON.stringify("contributors"),
  __STATIC_PATH__: JSON.stringify("/static/"),
  __HASS_URL__: "location.origin",
  __MAPLIBRE_WORKER_URL__: JSON.stringify(`${WORKERS_URL}/maplibre-gl-worker.js`),
  "process.env.NODE_ENV": JSON.stringify("production"),
};

// Every temporary folder, removed at the end, whether the build worked or not.
const temporaryDirs: string[] = [];

async function temporaryDir(parent: string, prefix: string) {
  const dir = await mkdtemp(path.join(parent, prefix));
  temporaryDirs.push(dir);
  return dir;
}

function githubToken() {
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }

  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
  } catch {
    console.warn("No GitHub token: demos get frontend strings, but no translations of integrations.");
    return undefined;
  }
}

// Two spots in the frontend rely on its own bundler, and esbuild needs help:
//
// - The Markdown worker starts from a URL next to the code, which esbuild
//   does not follow. The worker is built separately (below), and the frontend
//   is pointed to it.
// - The Markdown renderer loads the elements it allows with a template string
//   import. That becomes an explicit list of those elements.
//
// Each patch must match exactly once. When the frontend changes that code,
// the build stops with the file to look at, instead of shipping a bundle
// with a worker or an import that does not load.
const MARKDOWN_ELEMENTS = ["ha-alert", "ha-qr-code", "ha-icon", "ha-svg-icon"];

const PATCHES = [
  {
    file: "render-markdown.ts",
    pattern: /new URL\(\s*(?:\/\*[^*]*\*\/\s*)?["']\.\/markdown-worker["'],\s*import\.meta\.url\s*\)/g,
    replacement: `new URL("${WORKERS_URL}/markdown-worker.js", location.origin)`,
  },
  {
    file: "ha-markdown-element.ts",
    pattern: /import\(\s*(?:\/\*[^*]*\*\/\s*)*`\.\/\$\{node\.localName\}`\s*\)/g,
    replacement: `({ ${MARKDOWN_ELEMENTS.map((element) => `"${element}": () => import("./${element}")`).join(", ")} })[node.localName]()`,
  },
];

function countMatches(patch: (typeof PATCHES)[number], contents: string) {
  return contents.match(patch.pattern)?.length ?? 0;
}

// For --check: finds each patched file in the exported commit, and tells
// how often its patch matches, without bundling anything.
async function checkPatches(frontend: string) {
  const files = execFileSync("git", ["ls-tree", "-r", "--name-only", commit, "src"], {
    cwd: checkout,
    encoding: "utf8",
  }).split("\n");

  const problems = [];
  for (const patch of PATCHES) {
    const found = files.filter((file) => path.basename(file) === patch.file);
    if (found.length !== 1) {
      problems.push(`${patch.file}: found ${found.length} files with that name in src/, expected 1.`);
      continue;
    }

    const matches = countMatches(patch, await readFile(path.join(frontend, found[0]), "utf8"));
    if (matches !== 1) {
      problems.push(`${found[0]}: the patch matched ${matches} times, expected once.`);
    }
  }

  return problems;
}

function frontendFixes(frontend: string, applied: Set<string>): Plugin {
  return {
    name: "frontend-fixes",
    setup(build) {
      for (const patch of PATCHES) {
        const filter = new RegExp(`/${patch.file.replace(/\./g, "\\.")}$`);

        build.onLoad({ filter }, async (args) => {
          const original = await readFile(args.path, "utf8");
          const matches = countMatches(patch, original);

          if (matches !== 1) {
            throw new Error(
              `The patch for ${path.relative(frontend, args.path)} matched ${matches} times, ` +
                "instead of once. The frontend changed this code: update PATCHES in scripts/build-components.ts.",
            );
          }

          applied.add(patch.file);
          return { loader: "ts", contents: original.replace(patch.pattern, () => patch.replacement) };
        });
      }
    },
  };
}

// The loader does four things:
//
// 1. Adds the frontend theme. The theme styles target `html`. On this site
//    they must only apply inside a demo, so the selector becomes `.ha-demo`.
//    The dark theme follows the color scheme of the site. Roboto comes from
//    the app too, from /static/fonts/, like the app loads it.
// 2. Gives components that format numbers or dates a locale, which Home
//    Assistant would normally provide.
// 3. Loads the fake Home Assistant, when a demo on the page needs it.
// 4. Loads the components a demo uses when that demo comes near the
//    viewport, and nothing else. Some elements, like hui-card, pull in a big
//    part of the app, so a demo far down the page does not slow down the top.
function loaderSource(frontend: string) {
  const theme = `${frontend}/src/resources/theme`;

  // One dynamic import per element, so each becomes its own chunk.
  const loaders = COMPONENTS.map((component) => {
    const element = path.basename(component);
    return `  "${element}": () => import("${frontend}/src/components/${component}"),`;
  }).join("\n");

  const extraLoaders = Object.entries(EXTRA_ELEMENTS)
    .map(([element, file]) => `  "${element}": () => import("${frontend}/${file}"),`)
    .join("\n");

  // Wrappers of this site, for demos that need more than a single element.
  const demoLoaders = ["ha-demo-more-info"]
    .map((element) => `  "${element}": () => import("${path.join(DEMO_RUNTIME, element)}.ts"),`)
    .join("\n");

  const demoHass = path.join(DEMO_RUNTIME, "ha-demo-hass.ts");

  return `
import { animationStyles } from "${theme}/animations.globals";
import { colorStylesCollection, darkColorVariables } from "${theme}/color";
import { coreStyles } from "${theme}/core.globals";
import { mainStyles } from "${theme}/main.globals";
import { darkSemanticVariables, semanticStyles } from "${theme}/semantic.globals";
import { typographyStyles } from "${theme}/typography.globals";
import { waMainStyles } from "${theme}/wa.globals";
import { fontStyles } from "${frontend}/src/resources/roboto";

const COMPONENTS = {
${loaders}
${extraLoaders}
${demoLoaders}
};

const DEMO_LOCALE = {
  language: "en",
  number_format: "language",
  time_format: "language",
  date_format: "language",
  first_weekday: "language",
  time_zone: "local",
};

const lightTheme = [
  coreStyles,
  mainStyles,
  typographyStyles,
  semanticStyles,
  ...colorStylesCollection,
  waMainStyles,
  animationStyles,
]
  .map((styles) => styles.toString())
  .join("")
  .replace(/\\bhtml\\b/g, ".ha-demo")
  .replace(/height:\\s*100vh;/g, "");

const dark = Object.entries({ ...darkColorVariables, ...darkSemanticVariables })
  .map(([name, value]) => \`--\${name}: \${value};\`)
  .join("");

const darkTheme =
  \`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .ha-demo { \${dark} } }\` +
  \`:root[data-theme="dark"] .ha-demo { \${dark} }\`;

const style = document.createElement("style");
style.textContent = fontStyles.toString() + lightTheme + darkTheme;
document.head.append(style);

const isComponent = (element) => element.localName in COMPONENTS;
const elements = [...document.querySelectorAll(".ha-demo *")].filter(isComponent);

// Set properties before the components load: Lit keeps properties set on an
// element before it is defined, and the component has them on its first
// render. Every component gets a locale. Properties that can't be written as
// an attribute, like the schema of a form, come from data-props='{...}'.
for (const element of elements) {
  element.locale ??= DEMO_LOCALE;

  if (element.dataset.props) {
    Object.assign(element, JSON.parse(element.dataset.props));
  }
}

const stages = document.querySelectorAll(".ha-demo");

// Keep demos interactive: when a component reports a new value, give it
// back, like the app would after saving it.
for (const stage of stages) {
  stage.addEventListener("value-changed", (event) => {
    const target = event.target;
    const value = event.detail?.value;

    if ("data" in target && target.localName === "ha-form") {
      target.data = value;
    } else if ("value" in target) {
      target.value = value;
    }
  });

  // Menus report a choice with the item that was selected.
  stage.addEventListener("wa-select", (event) => {
    const target = event.target;
    const value = event.detail?.item?.value;

    if (value !== undefined && "value" in target && "options" in target) {
      target.value = value;
    }
  });
}

// The fake Home Assistant comes first, for every demo at once, so components
// that need it have it on their first render, whenever they load.
if (document.querySelector(".ha-demo ha-demo-hass")) {
  await import("${demoHass}");
}

function loadComponents(stage) {
  const used = new Set([...stage.querySelectorAll("*")].filter(isComponent).map((element) => element.localName));
  return Promise.all([...used].map((name) => COMPONENTS[name]()));
}

// A margin of a screen or so, so a demo is usually ready by the time it
// scrolls into view. A demo that is hidden, like in a closed <details>,
// loads when it is shown.
const nearViewport = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        nearViewport.unobserve(entry.target);
        loadComponents(entry.target);
      }
    }
  },
  { rootMargin: "100% 0px" },
);

for (const stage of stages) {
  nearViewport.observe(stage);
}
`;
}

// English translations (the main file and one per fragment), the icon
// chunks, fonts, and map assets, where the components look for them:
// /static/.
async function copyStaticAssets(frontend: string, staticDir: string) {
  const translations = path.join(frontend, "build/translations/output");
  const englishFile = /^en-[^-]+\.json$/;

  for (const item of await readdir(translations, { withFileTypes: true })) {
    if (item.isFile() && englishFile.test(item.name)) {
      await cp(path.join(translations, item.name), path.join(staticDir, "translations", item.name));
    }

    if (item.isDirectory()) {
      for (const file of await readdir(path.join(translations, item.name))) {
        if (englishFile.test(file)) {
          await cp(
            path.join(translations, item.name, file),
            path.join(staticDir, "translations", item.name, file),
          );
        }
      }
    }
  }

  await cp(path.join(frontend, "build/mdi"), path.join(staticDir, "mdi"), { recursive: true });
  // Images some components use, like the color wheel.
  await cp(path.join(frontend, "public/static/images"), path.join(staticDir, "images"), {
    recursive: true,
  });

  // Roboto, the same files the app ships. Not the Roboto of a font package:
  // newer versions of the font have other shapes and metrics, and text in a
  // demo would not look like the app.
  const modules = path.join(checkout, "node_modules");
  const roboto = path.join(modules, "roboto-fontface/fonts/roboto");
  for (const file of await readdir(roboto)) {
    if (file.endsWith(".woff2")) {
      await cp(path.join(roboto, file), path.join(staticDir, "fonts/roboto", file));
    }
  }

  // The stylesheets and marker images of the map, where the frontend expects
  // them, the same files its own build copies.
  const leaflet = path.join(staticDir, "images/leaflet");
  await cp(path.join(modules, "leaflet/dist/leaflet.css"), path.join(leaflet, "leaflet.css"));
  await cp(path.join(modules, "leaflet/dist/images"), path.join(leaflet, "images"), { recursive: true });
  await cp(
    path.join(modules, "leaflet.markercluster/dist/MarkerCluster.css"),
    path.join(leaflet, "MarkerCluster.css"),
  );

  // The vector base map: its styles (generated by the frontend build tasks),
  // sprites, and the stylesheet of MapLibre.
  const map = path.join(staticDir, "map");
  await cp(path.join(frontend, "public/static/map"), map, { recursive: true });
  await cp(path.join(frontend, "build/map"), map, { recursive: true });
  await cp(path.join(modules, "maplibre-gl/dist/maplibre-gl.css"), path.join(map, "maplibre-gl.css"));
}

// Swaps the new output into public/. The old output moves aside first, and
// comes back when the swap fails halfway, so public/ always has one complete
// set of demos.
async function publish(staging: string) {
  const previous = await temporaryDir(ROOT, ".components-previous-");
  const swapped: string[] = [];

  try {
    for (const name of PUBLISHED) {
      const published = path.join(PUBLIC_DIR, name);
      if (existsSync(published)) {
        await rename(published, path.join(previous, name));
      }
      swapped.push(name);
      await rename(path.join(staging, name), published);
    }
  } catch (error) {
    for (const name of swapped) {
      await rm(path.join(PUBLIC_DIR, name), { recursive: true, force: true });
      if (existsSync(path.join(previous, name))) {
        await rename(path.join(previous, name), path.join(PUBLIC_DIR, name));
      }
    }
    throw error;
  }
}

async function main() {
  // Export the commit and borrow the dependencies of the checkout.
  const frontend = await temporaryDir(tmpdir(), "contributors-frontend-");
  execSync(`git archive ${commit} | tar -x -C "${frontend}"`, { cwd: checkout });
  await symlink(path.join(checkout, "node_modules"), path.join(frontend, "node_modules"));

  const lockfileOfCommit = await readFile(path.join(frontend, "pnpm-lock.yaml"), "utf8");
  const lockfileOfCheckout = await readFile(path.join(checkout, "pnpm-lock.yaml"), "utf8");
  const lockfileMatches = lockfileOfCommit === lockfileOfCheckout;
  if (!lockfileMatches) {
    console.warn(
      `The lockfile of ${commit.slice(0, 10)} differs from the one in ${checkout}. ` +
        "The bundle uses the dependencies installed there: check out that commit and run `pnpm install` for an exact match.",
    );
  }

  // The demo runtime must fit the frontend it is bundled with.
  const typeErrors = checkDemoRuntime(frontend);
  if (typeErrors) {
    throw new Error(`demo-runtime/ does not type-check against ${source}:\n${typeErrors}`);
  }

  if (options.check) {
    const problems = await checkPatches(frontend);
    if (problems.length > 0) {
      throw new Error(`The frontend patches need an update (PATCHES in this script):\n${problems.join("\n")}`);
    }

    console.log(`${source}: demo-runtime/ type-checks, and all ${PATCHES.length} patches match.`);
    return;
  }

  // Generate the icon chunks and translations of this commit, with the
  // frontend's own build tasks.
  const token = githubToken();
  execFileSync(
    process.execPath,
    [
      "node_modules/gulp/bin/gulp.js",
      "--gulpfile",
      "build-scripts/gulp/index.mjs",
      "--cwd",
      ".",
      "translations-enable-merge-backend",
      "build-translations",
      "gen-icons-json",
      "build-map-assets",
    ],
    {
      cwd: frontend,
      stdio: ["ignore", "ignore", "inherit"],
      env: { ...process.env, GITHUB_TOKEN: token ?? "", SKIP_FETCH_NIGHTLY_TRANSLATIONS: token ? "" : "1" },
    },
  );

  // The new output is built next to public/, so it can move in with a
  // rename. The system temporary folder may be on another disk.
  const staging = await temporaryDir(ROOT, ".components-build-");
  const outputDir = path.join(staging, "components");
  const staticDir = path.join(staging, "static");

  const loaderDir = await temporaryDir(tmpdir(), "contributors-loader-");
  const loaderFile = path.join(loaderDir, "loader.ts");
  await writeFile(loaderFile, loaderSource(frontend));

  const appliedPatches = new Set<string>();
  const result = await build({
    entryPoints: [loaderFile],
    outdir: outputDir,
    entryNames: "[name]",
    chunkNames: "chunks/[name]-[hash]",
    bundle: true,
    splitting: true,
    format: "esm",
    minify: true,
    target: "es2022",
    tsconfig: path.join(frontend, "tsconfig.json"),
    // demo-runtime/ imports the frontend as "frontend/...", and uses its
    // dependencies, like Lit.
    alias: { frontend },
    nodePaths: [path.join(frontend, "node_modules")],
    metafile: true,
    logLevel: "warning",
    banner: {
      js: `/* Generated by scripts/build-components.ts from ${source}. Do not edit by hand. */`,
    },
    define: DEFINE,
    plugins: [frontendFixes(frontend, appliedPatches)],
  });

  // A patch that never ran is as bad as one that did not match: the file
  // moved or was renamed in the frontend.
  for (const patch of PATCHES) {
    if (!appliedPatches.has(patch.file)) {
      throw new Error(
        `${patch.file} was not part of the bundle, so its patch did not run. ` +
          "Find where the frontend moved it, and update PATCHES in scripts/build-components.ts.",
      );
    }
  }

  // The workers: Markdown rendering, and MapLibre for vector maps. Classic
  // scripts, the way both are started.
  await build({
    entryPoints: {
      "markdown-worker": path.join(frontend, "src/resources/markdown-worker.ts"),
      "maplibre-gl-worker": path.join(frontend, "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs"),
    },
    outdir: path.join(outputDir, "workers"),
    bundle: true,
    format: "iife",
    minify: true,
    target: "es2022",
    tsconfig: path.join(frontend, "tsconfig.json"),
    logLevel: "warning",
    define: DEFINE,
  });

  await copyStaticAssets(frontend, staticDir);

  // What went into this build, for whoever needs to reproduce or debug it.
  // The translations artifact is recorded by the frontend's own fetch task.
  const artifactFile = path.join(frontend, "translations/artifact.json");
  const artifact: TranslationsArtifact | undefined = existsSync(artifactFile) ? JSON.parse(await readFile(artifactFile, "utf8")) : undefined;
  const manifest = {
    generatedBy: "scripts/build-components.ts",
    date: new Date().toISOString(),
    frontend: { commit, ref: options.ref, lockfileMatchesCheckout: lockfileMatches },
    translations: artifact
      ? { artifactId: artifact.id, createdAt: artifact.created_at, workflowRunId: artifact.workflow_run?.id }
      : null,
    components: [...COMPONENTS.map((component) => path.basename(component)), ...Object.keys(EXTRA_ELEMENTS)],
  };
  await writeFile(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  await publish(staging);

  const outputs = Object.entries(result.metafile.outputs);
  const total = outputs.reduce((sum, [, output]) => sum + output.bytes, 0);
  const loaderBytes = outputs.find(([file]) => file.endsWith("loader.js"))?.[1].bytes ?? 0;

  console.log(
    `Wrote ${outputs.length} files to public/components/ from ${source}: ` +
      `${COMPONENTS.length} components, ${Math.round(total / 1024)} KB in total, ` +
      `loader ${Math.round(loaderBytes / 1024)} KB.`,
  );
}

try {
  await main();
} finally {
  await Promise.all(temporaryDirs.map((dir) => rm(dir, { recursive: true, force: true })));
}

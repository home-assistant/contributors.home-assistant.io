// Checks that every area has the shape the authoring rules promise, so a
// reader who knows one area finds their way in all of them. See "Areas" and
// "Front matter" in .github/copilot-instructions.md.
//
// - Every area in src/data/areas.ts has a folder in src/content/docs/, with
//   an overview (index.md or index.mdx), and every folder there is an area.
// - Every area has `first-contribution.md` with order 1, shown in the
//   sidebar as "Your first contribution". Architecture and Glossary are the
//   exceptions: they explain, and have nothing to take a first step in.
// - `how-it-works`, when an area has one, has order 2.
// - Pages are at most one subfolder deep, and no folder is called "docs".
// - Every group listed in `sidebarGroups` is used by a page in that folder,
//   so a typo in a group name does not go unnoticed.
// - Every area has an "area: <id>" rule in .github/labeler.yml and a label
//   in .github/labels.yml, and neither lists an area that is gone. Every
//   label the labeler applies is in .github/labels.yml.
//
// Usage:
//   pnpm structure

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { AREAS } from "../src/data/areas.ts";

const DOCS = fileURLToPath(new URL("../src/content/docs/", import.meta.url));
const LABELER_FILE = fileURLToPath(new URL("../.github/labeler.yml", import.meta.url));
const LABELS_FILE = fileURLToPath(new URL("../.github/labels.yml", import.meta.url));

// Areas without a first contribution page, on purpose.
const NO_FIRST_CONTRIBUTION = new Set(["architecture", "glossary"]);

const problems: string[] = [];

interface FrontMatter {
  order?: number;
  title?: string;
  sidebarLabel?: string;
  sidebarGroup?: string;
  sidebarGroups?: string[];
}

// A label in .github/labels.yml.
interface Label {
  name: string;
}

function frontMatter(file: string): FrontMatter {
  const source = readFileSync(file, "utf8");
  return parseYaml(/^---\n([\s\S]*?)\n---/.exec(source)?.[1] ?? "") ?? {};
}

function pageFile(dir: string, name: string) {
  return [".md", ".mdx"].map((extension) => path.join(dir, name + extension)).find((file) => existsSync(file));
}

const areaIds = AREAS.map((area) => area.id);
const folders = readdirSync(DOCS, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const folder of folders) {
  if (!areaIds.includes(folder)) {
    problems.push(`src/content/docs/${folder}/ is not an area in src/data/areas.ts.`);
  }
}

for (const area of areaIds) {
  const dir = path.join(DOCS, area);
  if (!existsSync(dir)) {
    problems.push(`The area "${area}" has no folder src/content/docs/${area}/.`);
    continue;
  }

  if (!pageFile(dir, "index")) {
    problems.push(`${area}: no overview page (index.md).`);
  }

  const firstContribution = pageFile(dir, "first-contribution");
  if (NO_FIRST_CONTRIBUTION.has(area)) {
    if (firstContribution) {
      problems.push(`${area}: has a first contribution page, but is listed as an exception in scripts/check-structure.ts.`);
    }
  } else if (!firstContribution) {
    problems.push(`${area}: no first-contribution.md.`);
  } else {
    const data = frontMatter(firstContribution);
    if (data.order !== 1) {
      problems.push(`${area}/first-contribution: order must be 1.`);
    }
    if ((data.sidebarLabel ?? data.title) !== "Your first contribution") {
      problems.push(`${area}/first-contribution: the sidebar must say "Your first contribution" (sidebarLabel).`);
    }
  }

  const howItWorks = pageFile(dir, "how-it-works");
  if (howItWorks && frontMatter(howItWorks).order !== 2) {
    problems.push(`${area}/how-it-works: order must be 2.`);
  }

  checkFolder(dir, area, 0);
}

function checkFolder(dir: string, label: string, depth: number) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const usedGroups = new Set<string>();

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name === "docs") {
        problems.push(`${label}/docs/: do not add a folder called "docs". The whole site is documentation.`);
      }
      if (depth >= 1) {
        problems.push(`${label}/${entry.name}/: too deep. Pages go at most one subfolder deep in an area.`);
        continue;
      }
      checkFolder(path.join(dir, entry.name), `${label}/${entry.name}`, depth + 1);
    } else if (/\.mdx?$/.test(entry.name)) {
      const group = frontMatter(path.join(dir, entry.name)).sidebarGroup;
      if (group) {
        usedGroups.add(group);
      }
    }
  }

  const index = pageFile(dir, "index");
  for (const group of (index && frontMatter(index).sidebarGroups) ?? []) {
    if (!usedGroups.has(group)) {
      problems.push(`${label}/index: sidebarGroups lists "${group}", but no page in this folder uses it.`);
    }
  }
}

// The labels of pull requests and feedback issues follow the areas.
const labelerLabels = Object.keys(parseYaml(readFileSync(LABELER_FILE, "utf8")) ?? {});
const labels: Label[] = parseYaml(readFileSync(LABELS_FILE, "utf8")) ?? [];
const repositoryLabels = labels.map((label) => label.name);

for (const [file, labels] of [
  [".github/labeler.yml", labelerLabels],
  [".github/labels.yml", repositoryLabels],
] as const) {
  const labelAreas = labels.filter((label) => label.startsWith("area: ")).map((label) => label.slice(6));

  for (const area of areaIds) {
    if (!labelAreas.includes(area)) {
      problems.push(`${file}: no "area: ${area}" label for the area "${area}".`);
    }
  }
  for (const area of labelAreas) {
    if (!areaIds.includes(area)) {
      problems.push(`${file}: "area: ${area}" is not an area in src/data/areas.ts.`);
    }
  }
}

for (const label of labelerLabels) {
  if (!repositoryLabels.includes(label)) {
    problems.push(`.github/labeler.yml applies "${label}", which is not in .github/labels.yml.`);
  }
}

if (problems.length > 0) {
  console.error(`${problems.length} problems with the structure of the areas:`);
  for (const problem of problems) {
    console.error(`  ${problem}`);
  }
  process.exit(1);
}

console.log(`All ${areaIds.length} areas have the expected structure.`);

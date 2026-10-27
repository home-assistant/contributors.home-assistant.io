// Generates the index of repository paths the docs link to, in
// src/data/source-paths.json. See "Source paths" in README.md, and
// src/lib/source-paths.ts for the rules of what links.
//
// It collects every inline code span on the docs pages that looks like a
// path, finds the repositories each page is about, and checks which of those
// have the path on their default branch. The index keeps only the paths the
// docs mention, so it stays small enough to review.
//
// It also reports the paths that should be in a repository and are not:
// the first folder of the path exists in a repository of the page, the
// rest does not, or the path was in the previous index. The file moved or
// is gone, so the page needs an update. Those go in the index too, under
// `missing`, with the pages they are on.
//
// Usage:
//   pnpm source-paths                                   # read every repository from GitHub
//   pnpm source-paths --from core=../core               # read core from a local checkout
//   pnpm source-paths --from core=../core --from frontend=../frontend
//
// From GitHub, it uses the `gh` CLI, so run `gh auth login` first, or set
// GH_TOKEN. A local checkout is read at origin/<default branch>: run
// `git fetch` in it first. The report goes to stdout, as Markdown.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { INDEX_FILE, REPOSITORIES, type PathEntry, type RepositoryId, candidatesFor, isPathMention, readIndex } from "../src/lib/source-paths.ts";
import { docsMentions } from "./symbols/mentions.ts";

interface TreeEntry {
  path: string;
  type: "file" | "folder";
}

interface PagesEntry {
  path: string;
  repositories: string[];
  pages: string[];
}

// A tree from the GitHub API.
interface GitHubTree {
  truncated: boolean;
  tree: { path: string; type: string }[];
}

interface RepositoryTree {
  types: Map<string, TreeEntry["type"]>;
  roots: Set<string>;
}

const isRepository = (id: string): id is RepositoryId => Object.hasOwn(REPOSITORIES, id);

const { values: options } = parseArgs({
  options: {
    from: { type: "string", multiple: true, default: [] },
  },
});

const checkouts = new Map<string, string>();
for (const option of options.from) {
  const [id, checkout] = option.split("=");
  if (!isRepository(id) || !checkout) {
    console.error(`--from takes a repository and a checkout, like core=../core. Repositories: ${Object.keys(REPOSITORIES).join(", ")}.`);
    process.exit(1);
  }
  checkouts.set(id, path.resolve(checkout));
}

// Every file and folder on the default branch of a repository, folders
// without their trailing slash.
function readTree(id: RepositoryId): TreeEntry[] {
  const { repository, branch } = REPOSITORIES[id];

  const checkout = checkouts.get(id);
  if (checkout) {
    const output = execFileSync("git", ["ls-tree", "-r", "-t", "--format=%(objecttype) %(path)", `origin/${branch}`], {
      cwd: checkout,
      maxBuffer: 1024 * 1024 * 1024,
    });
    return output
      .toString()
      .split("\n")
      .filter(Boolean)
      .map((line): TreeEntry => {
        const [type, ...name] = line.split(" ");
        return { path: name.join(" "), type: type === "tree" ? "folder" : "file" };
      });
  }

  const output = execFileSync("gh", ["api", `repos/${repository}/git/trees/${branch}?recursive=1`], {
    maxBuffer: 1024 * 1024 * 1024,
  });
  const tree: GitHubTree = JSON.parse(output.toString());
  if (tree.truncated) {
    throw new Error(`GitHub truncated the tree of ${repository}. Read it from a checkout: --from ${id}=../${id}.`);
  }

  // Submodules, like buildroot in the operating system, are commits in the
  // tree. On GitHub they are a folder you can open.
  return tree.tree.map((entry): TreeEntry => ({ path: entry.path, type: entry.type === "blob" ? "file" : "folder" }));
}

const mentions = docsMentions()
  .filter((mention) => isPathMention(mention.text))
  .map((mention) => ({
    ...mention,
    path: mention.text.trim(),
    docsPath: mention.file.replace(/^src\/content\/docs\//, ""),
  }))
  .map((mention) => ({ ...mention, candidates: candidatesFor(mention.docsPath, mention.path) }));

type PathMention = (typeof mentions)[number];

const needed = new Set(mentions.flatMap((mention) => mention.candidates));
const trees = new Map<RepositoryId, RepositoryTree>();
for (const id of [...needed].sort()) {
  const entries = readTree(id);
  trees.set(id, {
    types: new Map(entries.map((entry) => [entry.path, entry.type])),
    roots: new Set(entries.filter((entry) => entry.type === "folder" && !entry.path.includes("/")).map((entry) => entry.path)),
  });
}

const previous = readIndex();
const previouslyLinked = new Set((previous?.paths ?? []).map((entry) => `${entry.repository}\n${entry.path}`));

// The type of a path in a repository, or undefined when it is not there.
// A trailing slash only matches a folder.
function typeIn(id: RepositoryId, mentionPath: string) {
  const type = trees.get(id)?.types.get(mentionPath.replace(/\/$/, ""));
  if (mentionPath.endsWith("/") && type !== "folder") {
    return undefined;
  }
  return type;
}

const found = new Map<string, PathEntry>();
const missing = new Map<string, PagesEntry>();
const ambiguous = new Map<string, PagesEntry>();
let linked = 0;
let notRepository = 0;

const pageOf = (mention: PathMention) => `${mention.file}:${mention.line}`;

for (const mention of mentions) {
  const hits = mention.candidates.filter((id) => typeIn(id, mention.path));

  for (const id of hits) {
    const { repository, branch } = REPOSITORIES[id];
    found.set(`${repository}\n${mention.path}`, { path: mention.path, repository, branch, type: typeIn(id, mention.path) });
  }

  if (hits.length === 1) {
    linked += 1;
    continue;
  }

  if (hits.length > 1) {
    const key = mention.path;
    const entry = ambiguous.get(key) ?? { path: mention.path, repositories: hits.map((id) => REPOSITORIES[id].repository), pages: [] };
    entry.pages.push(pageOf(mention));
    ambiguous.set(key, entry);
    continue;
  }

  // Not in any repository of the page. Missing when it was linked before,
  // or when its first folder is in one of them: then it looks like a path
  // of that repository that moved or is gone.
  const firstFolder = mention.path.split("/")[0];
  const owners = mention.candidates.filter(
    (id) =>
      previouslyLinked.has(`${REPOSITORIES[id].repository}\n${mention.path}`) ||
      (mention.path.replace(/\/$/, "").includes("/") && trees.get(id)?.roots.has(firstFolder)),
  );

  if (owners.length === 0) {
    notRepository += 1;
    continue;
  }

  const key = mention.path;
  const entry = missing.get(key) ?? { path: mention.path, repositories: owners.map((id) => REPOSITORIES[id].repository), pages: [] };
  entry.pages.push(pageOf(mention));
  missing.set(key, entry);
}

const byPath = (a: PathEntry, b: PathEntry) => a.repository.localeCompare(b.repository) || a.path.localeCompare(b.path);
const index = {
  paths: [...found.values()].sort(byPath),
  missing: [...missing.values()].sort((a, b) => a.path.localeCompare(b.path)),
};

mkdirSync(path.dirname(INDEX_FILE), { recursive: true });
writeFileSync(INDEX_FILE, `${JSON.stringify(index, null, 2)}\n`);

const countPages = (entries: Map<string, PagesEntry>) => [...entries.values()].reduce((sum, entry) => sum + entry.pages.length, 0);

const report = [
  "# Source paths",
  "",
  `Inline code spans that look like a path: ${mentions.length}.`,
  "",
  `- Linked to a repository: ${linked}`,
  `- Not a path of a repository: ${notRepository}`,
  `- In more than one repository: ${countPages(ambiguous)}`,
  `- Missing from their repository: ${countPages(missing)}`,
];

if (missing.size) {
  report.push(
    "",
    "## Missing",
    "",
    "These paths look like they belong to a repository of the page, but the default branch does not have them. The file moved or is gone: update the page. If the page means a file you create yourself, or an example, add the path to `NOT_REPOSITORY_PATHS` in `src/lib/source-paths.ts`.",
    "",
  );
  for (const entry of index.missing) {
    report.push(`- \`${entry.path}\` (${entry.repositories.join(", ")}): ${entry.pages.join(", ")}`);
  }
}

if (ambiguous.size) {
  report.push("", "## In more than one repository", "", "These stay plain inline code: the page could mean either.", "");
  for (const entry of [...ambiguous.values()].sort((a, b) => a.path.localeCompare(b.path))) {
    report.push(`- \`${entry.path}\` (${entry.repositories.join(", ")}): ${entry.pages.join(", ")}`);
  }
}

console.log(report.join("\n"));

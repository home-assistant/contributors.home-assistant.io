import { type CollectionEntry, getCollection, render } from "astro:content";
import { slug } from "github-slugger";

export type DocsEntry = CollectionEntry<"docs">;

// One item in the sidebar: a page (no children), or a group of items.
export interface NavNode {
  label: string;
  href?: string;
  current: boolean;
  // Groups start open when they contain the current page.
  open: boolean;
  // A folder with `sidebarCollapse`: the sidebar shows it as one link to its
  // overview, and is `current` on any of its pages. The children are still
  // there, so previous and next can walk through them.
  collapsed?: boolean;
  // A group made by `sidebarGroup`, not a folder.
  sidebarGroup?: boolean;
  children: NavNode[];
}

export interface Crumb {
  label: string;
  href?: string;
}

// "design/foundations/index" and "design/foundations" both become
// "design/foundations". Index pages represent their folder.
export function pathOf(entry: DocsEntry): string {
  return entry.id.replace(/(^|\/)index$/, "");
}

// Look at the file, not the id: the loader may already drop "/index" from it.
export function isIndex(entry: DocsEntry): boolean {
  return /(^|\/)index\.mdx?$/.test(entry.filePath ?? entry.id);
}

export function hrefOf(entry: DocsEntry): string {
  return `/${pathOf(entry)}/`;
}

// The Markdown version of a page, for agents: next to its index.html. See
// src/lib/markdown-export.ts.
export function markdownHref(entry: DocsEntry): string {
  return `${hrefOf(entry)}index.md`;
}

export function areaOf(entry: DocsEntry): string {
  return pathOf(entry).split("/")[0];
}

// Every page renders the sidebar, the breadcrumbs, and the search, which
// all need the docs. In a build the docs don't change, so they are loaded,
// and the trees built, once instead of for every page. `pnpm dev` keeps
// this module loaded while you edit, and Astro does not reload it when
// content changes, so there everything is read fresh each time.
const cache = new Map<string, Promise<unknown>>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!import.meta.env.PROD) {
    return load();
  }

  let value = cache.get(key) as Promise<T> | undefined;
  if (!value) {
    value = load();
    cache.set(key, value);
  }

  return value;
}

function allEntries(): Promise<DocsEntry[]> {
  return cached("entries", () => getCollection("docs"));
}

// Every docs page by its path, like "design/foundations".
export function entriesByPath(): Promise<Map<string, DocsEntry>> {
  return cached("by-path", async () => new Map((await allEntries()).map((entry) => [pathOf(entry), entry])));
}

// A new array on every call, so a caller can sort it without changing what
// the next caller gets.
export async function getAreaEntries(areaId: string): Promise<DocsEntry[]> {
  return (await allEntries()).filter((entry) => areaOf(entry) === areaId);
}

// A folder of the area, as it is on disk: its index page, its pages, and
// its subfolders.
interface Folder {
  name: string;
  index?: DocsEntry;
  pages: DocsEntry[];
  folders: Map<string, Folder>;
}

function emptyFolder(name: string): Folder {
  return { name, pages: [], folders: new Map() };
}

function buildFolderTree(areaId: string, entries: DocsEntry[]): Folder {
  const root = emptyFolder(areaId);

  for (const entry of entries) {
    const segments = pathOf(entry).split("/").slice(1);
    const folderSegments = isIndex(entry) ? segments : segments.slice(0, -1);

    let folder = root;
    for (const segment of folderSegments) {
      let child = folder.folders.get(segment);
      if (!child) {
        child = emptyFolder(segment);
        folder.folders.set(segment, child);
      }
      folder = child;
    }

    if (isIndex(entry)) {
      folder.index = entry;
    } else {
      folder.pages.push(entry);
    }
  }

  return root;
}

function titleFromName(name: string): string {
  return name.replace(/-/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

function folderLabel(folder: Folder): string {
  return folder.index?.data.sidebarLabel ?? folder.index?.data.title ?? titleFromName(folder.name);
}

// Items without an order go last, sorted by label.
interface Sortable {
  order: number;
  label: string;
  node: NavNode;
}

function bySortOrder(a: Sortable, b: Sortable): number {
  if (a.order !== b.order) {
    return a.order - b.order;
  }

  return a.label.localeCompare(b.label);
}

// The tree is built without a current page. withCurrent() marks it for
// the page that renders it.
function pageNode(entry: DocsEntry, label?: string): NavNode {
  return {
    label: label ?? entry.data.sidebarLabel ?? entry.data.title,
    href: hrefOf(entry),
    current: false,
    open: false,
    children: [],
  };
}

function sortablePage(entry: DocsEntry): Sortable {
  const node = pageNode(entry);
  return { order: entry.data.order ?? Number.POSITIVE_INFINITY, label: node.label, node };
}

function groupNode(label: string, children: NavNode[], sidebarGroup?: boolean): NavNode {
  return { label, current: false, open: false, sidebarGroup, children };
}

// The items of a folder: its pages and subfolders, sorted together. Pages
// with a `sidebarGroup` are gathered in a group of that name, which adds a
// level to the sidebar without changing any URL.
function folderItems(folder: Folder): NavNode[] {
  const items: Sortable[] = [];
  const groups = new Map<string, DocsEntry[]>();

  for (const page of folder.pages) {
    const group = page.data.sidebarGroup;
    if (group) {
      groups.set(group, [...(groups.get(group) ?? []), page]);
    } else {
      items.push(sortablePage(page));
    }
  }

  // Groups follow the order listed in the folder's index, then the alphabet.
  const groupOrder = folder.index?.data.sidebarGroups ?? [];
  for (const [name, pages] of groups) {
    const children = pages
      .map((page) => sortablePage(page))
      .sort(bySortOrder)
      .map((item) => item.node);

    const position = groupOrder.indexOf(name);
    items.push({
      order: position === -1 ? Number.POSITIVE_INFINITY : position,
      label: name,
      node: groupNode(name, children, true),
    });
  }

  for (const subfolder of folder.folders.values()) {
    const node = folderNode(subfolder);
    items.push({
      order: subfolder.index?.data.order ?? Number.POSITIVE_INFINITY,
      label: node.label,
      node,
    });
  }

  return items.sort(bySortOrder).map((item) => item.node);
}

// A subfolder is a group. Its index page comes first, as "Overview".
function folderNode(folder: Folder): NavNode {
  const children = folderItems(folder);
  if (folder.index) {
    children.unshift(pageNode(folder.index, "Overview"));
  }

  // A collapsed folder is a single link to its overview. On any page inside
  // it, that link is the one that lights up (see withCurrent()).
  if (folder.index?.data.sidebarCollapse) {
    return {
      label: folderLabel(folder),
      href: hrefOf(folder.index),
      current: false,
      open: false,
      collapsed: true,
      children,
    };
  }

  return groupNode(folderLabel(folder), children);
}

function containsCurrent(nodes: NavNode[]): boolean {
  return nodes.some((node) => node.current || containsCurrent(node.children));
}

// A copy of the tree with the current page lit up. Groups on the way to it
// start open.
function withCurrent(nodes: NavNode[], currentHref: string): NavNode[] {
  return nodes.map((node) => {
    const children = withCurrent(node.children, currentHref);

    if (node.collapsed) {
      return { ...node, current: containsCurrent(children), children };
    }

    if (node.href) {
      const current = node.href === currentHref;
      return { ...node, current, open: current, children };
    }

    return { ...node, open: children.some((child) => child.current || child.open), children };
  });
}

// The folders of an area, as they are on disk.
function folderTree(areaId: string): Promise<Folder> {
  return cached(`folders:${areaId}`, async () => buildFolderTree(areaId, await getAreaEntries(areaId)));
}

// The sidebar of an area, without a current page.
function areaTree(areaId: string): Promise<NavNode[]> {
  return cached(`tree:${areaId}`, async () => {
    const root = await folderTree(areaId);
    const items = folderItems(root);

    if (root.index) {
      items.unshift(pageNode(root.index, "Overview"));
    }

    return items;
  });
}

// The sidebar mirrors the folders of an area: pages are links, subfolders
// and sidebar groups are groups that open and close.
export async function buildSidebar(areaId: string, currentPath: string): Promise<NavNode[]> {
  return withCurrent(await areaTree(areaId), `/${currentPath}/`);
}

// Home, the area, every folder on the way, the sidebar group if there is
// one, and the page itself.
export async function buildBreadcrumbs(entry: DocsEntry, areaTitle: string): Promise<Crumb[]> {
  const segments = pathOf(entry).split("/");
  const byPath = await entriesByPath();

  const crumbs: Crumb[] = [
    { label: "Contributors", href: "/" },
    { label: areaTitle, href: `/${segments[0]}/` },
  ];

  for (let depth = 2; depth < segments.length; depth++) {
    const folderPath = segments.slice(0, depth).join("/");
    const index = byPath.get(folderPath);
    crumbs.push({
      label: index?.data.sidebarLabel ?? index?.data.title ?? titleFromName(segments[depth - 1]),
      href: index ? `/${folderPath}/` : undefined,
    });
  }

  // The group links to its section on the overview of the folder.
  const group = entry.data.sidebarGroup;
  if (group) {
    const folderPath = segments.slice(0, -1).join("/");
    const overview = await groupOverview(folderPath);
    const anchor = overview?.anchors.get(group);
    crumbs.push({
      label: group,
      href: overview ? `/${folderPath}/${anchor ? `#${anchor}` : ""}` : undefined,
    });
  }

  // The page itself, unless it is the area overview, which is already there.
  if (segments.length > 1) {
    crumbs.push({ label: entry.data.title });
  }

  return crumbs;
}

export interface PageLink {
  label: string;
  href: string;
}

// Previous and next page, in sidebar order, like Starlight's pagination.
export function pagination(sidebar: NavNode[]): { previous?: PageLink; next?: PageLink } {
  const pages: PageLink[] = [];
  let currentIndex = -1;

  const walk = (nodes: NavNode[]) => {
    for (const node of nodes) {
      // A collapsed folder links to its overview, which is also its first
      // child. Walk the children instead, so its pages are in the sequence.
      if (node.href && !node.collapsed) {
        if (node.current) {
          currentIndex = pages.length;
        }
        pages.push({ label: node.label, href: node.href });
      }
      walk(node.children);
    }
  };
  walk(sidebar);

  if (currentIndex === -1) {
    return {};
  }

  return { previous: pages[currentIndex - 1], next: pages[currentIndex + 1] };
}

// A page of a sidebar group, as the overview of its folder lists it.
export interface GroupPage {
  title: string;
  href: string;
  description: string;
}

// A sidebar group that has no heading of its own on the overview. The
// overview gets a section for it at its end, see GroupSections.astro.
export interface GroupSection {
  name: string;
  id: string;
  pages: GroupPage[];
}

export interface GroupOverview {
  // Where each group starts on the overview, by group name.
  anchors: Map<string, string>;
  // The heading above the generated sections, when there are any.
  heading?: { text: string; id: string };
  sections: GroupSection[];
}

export const GROUP_SECTIONS_HEADING = "All pages in this section";

// The overview of a folder is where its sidebar groups lead, from the
// breadcrumbs. A group with a heading of the same name on the overview
// links to that heading. The other groups get a section at the end of the
// overview, listing their pages in sidebar order. Both come from the
// sidebar tree, so the sidebar, the crumbs, and the overview always agree.
//
// Undefined for a folder without an overview.
export function groupOverview(folderPath: string): Promise<GroupOverview | undefined> {
  return cached(`groups:${folderPath}`, async () => {
    const [areaId, ...folderSegments] = folderPath.split("/");

    let folder: Folder | undefined = await folderTree(areaId);
    for (const segment of folderSegments) {
      folder = folder?.folders.get(segment);
    }

    if (!folder?.index) {
      return undefined;
    }

    const anchors = new Map<string, string>();
    const groups = folderItems(folder).filter((node) => node.sidebarGroup);

    // A collapsed folder's overview lists every page already, and so does
    // the glossary, A to Z (GlossaryIndex.astro). Their groups link to the
    // top of the overview, without a second listing.
    if (folder.index.data.sidebarCollapse || folderPath === "glossary") {
      return { anchors, sections: [] };
    }

    // Heading ids come from github-slugger (see src/lib/heading-anchors.ts),
    // so a group matches a heading when both make the same slug.
    const { headings } = await render(folder.index);
    const takenIds = new Set(headings.map((heading) => heading.slug));
    const missing: NavNode[] = [];

    for (const group of groups) {
      const id = slug(group.label);
      if (takenIds.has(id)) {
        anchors.set(group.label, id);
      } else {
        missing.push(group);
      }
    }

    if (missing.length === 0) {
      return { anchors, sections: [] };
    }

    // New ids never clash with the ones the page has. A clash gets a number,
    // the way github-slugger counts duplicates.
    const uniqueId = (text: string): string => {
      const base = slug(text);
      let id = base;
      for (let count = 1; takenIds.has(id); count++) {
        id = `${base}-${count}`;
      }
      takenIds.add(id);
      return id;
    };

    const heading = { text: GROUP_SECTIONS_HEADING, id: uniqueId(GROUP_SECTIONS_HEADING) };
    const byHref = new Map(folder.pages.map((page) => [hrefOf(page), page]));

    const sections = missing.map((group) => {
      const id = uniqueId(group.label);
      anchors.set(group.label, id);

      const pages = group.children.flatMap((node) => {
        const page = node.href ? byHref.get(node.href) : undefined;
        return page ? [{ title: page.data.title, href: hrefOf(page), description: page.data.description }] : [];
      });

      return { name: group.label, id, pages };
    });

    return { anchors, heading, sections };
  });
}

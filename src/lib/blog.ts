import { type CollectionEntry, getCollection } from "astro:content";

export type BlogPost = CollectionEntry<"blog">;

export const BLOG_TITLE = "Contributors blog";
export const BLOG_DESCRIPTION =
  "News for contributors: breaking changes for developers, design updates, and what is happening in the community.";

// Newest first.
export async function getPosts(): Promise<BlogPost[]> {
  const posts = await getCollection("blog");
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

// The URL of a post, in the format developers.home-assistant.io used:
// /blog/2024/02/12/light-color-mode-mandatory/. Keeping it means every link
// to an existing post, on this site and elsewhere, keeps working.
//
// It comes from the file name, not the entry id: the id is lowercased, and
// some older posts have capitals in their URL, like getCardSize.
export function postPath(post: BlogPost): string {
  const fileName = (post.filePath ?? post.id).split("/").pop() ?? post.id;
  const name = fileName.replace(/\.mdx?$/, "");

  const match = name.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
  if (!match) {
    throw new Error(`Blog post ${fileName} does not start with a date (YYYY-MM-DD-)`);
  }

  const [, year, month, day, slug] = match;
  return `${year}/${month}/${day}/${slug}`;
}

export function postHref(post: BlogPost): string {
  return `/blog/${postPath(post)}/`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Minutes to read a post, at 200 words a minute: a pace for technical text
// with code in it. At least one minute.
export function readingTime(post: BlogPost): number {
  const words = (post.body ?? "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// Titles of older posts put code in backticks, like `hass.data`. The parts of
// a title, with the code marked, so it can show as code instead of backticks.
export function titleParts(title: string): { text: string; code: boolean }[] {
  return title
    .split("`")
    .map((text, index) => ({ text, code: index % 2 === 1 }))
    .filter((part) => part.text);
}

// Words that say nothing about what a post is about.
const COMMON_WORDS = new Set([
  "about", "after", "also", "been", "before", "being", "changes", "from", "have",
  "home", "assistant", "into", "more", "must", "need", "new", "now", "only",
  "some", "that", "their", "them", "there", "these", "this", "used", "using",
  "were", "what", "when", "which", "will", "with", "would", "your", "core",
  "release", "integration", "integrations", "version", "upgrade", "upgraded",
]);

function topicWords(post: BlogPost): Set<string> {
  const text = `${post.data.title} ${post.data.description}`.toLowerCase();
  return new Set(
    text.match(/[a-z][a-z0-9_.]{3,}/g)?.filter((word) => !COMMON_WORDS.has(word)) ?? [],
  );
}

// Posts to read next: the ones that share the most topic words with this
// one, in their title and description. Sharing an area or an author counts
// a little too. When posts score the same, the one closest in time wins.
export function relatedPosts(post: BlogPost, posts: BlogPost[], count = 4): BlogPost[] {
  const words = topicWords(post);

  const score = (other: BlogPost) => {
    let total = 0;
    for (const word of topicWords(other)) {
      if (words.has(word)) total += 2;
    }
    total += other.data.areas.filter((area) => post.data.areas.includes(area)).length;
    total += other.data.authors.some((name) => post.data.authors.includes(name)) ? 1 : 0;
    return total;
  };

  const distance = (other: BlogPost) => Math.abs(other.data.date.valueOf() - post.data.date.valueOf());

  return posts
    .filter((other) => other.id !== post.id)
    .map((other) => ({ other, score: score(other) }))
    .sort((a, b) => b.score - a.score || distance(a.other) - distance(b.other))
    .slice(0, count)
    .map(({ other }) => other);
}

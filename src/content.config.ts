import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { BLOG_TOPIC_IDS } from "./data/blog-topics";

// One collection for all areas. The first folder of a page's path is its
// area: src/content/docs/design/foundations/color.md lives in "design".
const docs = defineCollection({
  loader: glob({ base: "./src/content/docs", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // Position in the sidebar, lowest first. Pages without one go last,
    // sorted by title.
    order: z.number().optional(),
    // Shorter label for the sidebar, when the title is too long.
    sidebarLabel: z.string().optional(),
    // Puts the page in a named group in the sidebar, without changing its
    // URL. Useful when one folder holds many pages.
    sidebarGroup: z.string().optional(),
    // On an index page: the order of the sidebar groups in its folder.
    sidebarGroups: z.array(z.string()).optional(),
    // On an index page: show only this overview in the sidebar, not the
    // pages of its folder. For large catalogs, like the rules of the quality
    // scale, whose overview links every page. The pages are still built,
    // and previous and next still walk through them.
    sidebarCollapse: z.boolean().optional(),
    // For pages that copy facts from elsewhere, which go stale when the
    // source changes: workflow schedules, bot settings, counts, versions.
    // `source` is where the facts come from, `lastVerified` the date someone
    // last checked the page against it. The page shows that date at the
    // bottom.
    source: z.url().optional(),
    lastVerified: z.coerce.date().optional(),
    // On a page of the glossary: how the term goes by in other places. The
    // page shows them in a box above the definition.
    term: z
      .object({
        // Other words for the same thing, like a plural or an abbreviation.
        // Search and the filter of the glossary find the term by these too.
        aliases: z.array(z.string()).default([]),
        // How the code calls it: class names, keys, files, or folders.
        code: z.array(z.string()).default([]),
        // What the UI calls it, when that is different from the term.
        ui: z.string().optional(),
        // Names it had before. Readers still come across them, but new text
        // must not use them.
        formerly: z.array(z.string()).default([]),
        // Other terms of the glossary, by the name of their page.
        related: z.array(z.string()).default([]),
        // Words that link to this term by themselves, in the text of every
        // page of the docs, the first time a page uses them. Only words that
        // mean this term wherever they appear: "state" also means the state
        // of a button, so it is not here. Lowercase words match any case,
        // words with a capital only match as written, like "Assist".
        autolink: z.array(z.string()).default([]),
      })
      .optional(),
  }),
});

const blogFiles = glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" });

// In production, a post with a date in the future waits for a build on or
// after that date, unless it sets `publishEarly`. Everywhere else, like
// deploy previews and `pnpm dev`, every post shows, so it can be reviewed.
// Netlify sets CONTEXT to "production" only for production builds.
//
// The post is removed here, and not where posts are read, because Astro
// copies the images of every post in the collection to the site.
const blog = defineCollection({
  loader: {
    name: "blog",
    load: async (context) => {
      await blogFiles.load(context);

      if (process.env.CONTEXT !== "production") {
        return;
      }

      for (const [id, { data }] of context.store.entries()) {
        if (!data.publishEarly && (data.date as Date).valueOf() > Date.now()) {
          context.store.delete(id);
        }
      }
    },
  },
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // Midnight UTC. Production leaves the post out until then, see above.
    date: z.coerce.date(),
    // Publishes the post right away, whatever its date.
    publishEarly: z.boolean().optional(),
    authors: z.array(z.string()).min(1),
    // Areas this post is about, or a topic of the blog itself, like
    // "announcements": see src/data/blog-topics.ts. Drives the tags, the
    // filters, and the feeds.
    areas: z.array(z.enum(BLOG_TOPIC_IDS)).min(1),
  }),
});

export const collections = { docs, blog };

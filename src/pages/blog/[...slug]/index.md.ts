// The Markdown version of every blog post, at <post URL>index.md, for
// language models and agents. See src/lib/markdown-export.ts.
import type { APIContext } from "astro";
import { type BlogPost, getPosts, postPath } from "../../../lib/blog";
import { postMarkdown } from "../../../lib/markdown-export";

export async function getStaticPaths() {
  return (await getPosts()).map((post) => ({
    params: { slug: postPath(post) },
    props: { post },
  }));
}

export async function GET({ props }: APIContext<{ post: BlogPost }>) {
  return new Response(await postMarkdown(props.post), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}

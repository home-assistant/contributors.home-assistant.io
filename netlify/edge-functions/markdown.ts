// Agents that ask for Markdown, with `Accept: text/markdown`, get the
// Markdown version of the page at <page URL>index.md (see
// src/lib/markdown-export.ts), at the URL of the page. Pages without one,
// like the home page, get their HTML as usual.

// True when text/markdown is one of the accepted types, and not refused
// with q=0.
function wantsMarkdown(accept: string): boolean {
  return accept.split(",").some((part) => {
    const [type, ...params] = part.split(";").map((value) => value.trim());
    const quality = params.find((param) => param.startsWith("q="));
    return type === "text/markdown" && (!quality || Number(quality.slice(2)) > 0);
  });
}

// The part of Netlify's Context this function uses.
interface Context {
  next(): Promise<Response>;
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  if (!url.pathname.endsWith("/")) {
    return;
  }

  if (wantsMarkdown(request.headers.get("accept") ?? "")) {
    // Relative to the page, so a path like //example.com/ stays on this site.
    // A redirect, like the catch-all of an old domain, is not the Markdown
    // version, so it falls through to the page as usual.
    const markdown = await fetch(new URL("index.md", url), { redirect: "manual" });
    if (markdown.ok) {
      return new Response(markdown.body, {
        headers: { "Content-Type": "text/markdown; charset=utf-8", Vary: "Accept" },
      });
    }
  }

  // The HTML at the same URL varies on Accept too, so a cache never hands
  // one to a client that asked for the other.
  const response = await context.next();
  const html = new Response(response.body, response);
  html.headers.append("Vary", "Accept");
  return html;
};

export const config = {
  path: "/*",
  excludedPath: ["/_astro/*", "/components/*", "/static/*", "/pagefind/*", "/og/*", "/symbols/*"],
};

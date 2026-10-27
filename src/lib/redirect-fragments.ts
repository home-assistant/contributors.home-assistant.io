// Old links to developers.home-assistant.io often point at a heading, like
// integration_fetching_data#coordinated-single-api-poll-for-data-for-all-entities.
// The redirect keeps that anchor, but the new page names its headings
// differently. This adds a small script to every page: when the anchor in
// the URL matches nothing on the page, it looks it up in
// /redirect-fragments.json and scrolls to the heading that took its place.
//
// The map comes from redirects/fragments.tsv (`pnpm fragments`), and is
// written to public/ by `pnpm redirects`. It is only fetched when an anchor
// misses, which is rare.

import type { AstroIntegration } from "astro";

const SCRIPT = `
const anchor = (() => {
  try {
    return decodeURIComponent(location.hash.slice(1));
  } catch {
    return "";
  }
})();

if (anchor && !document.getElementById(anchor)) {
  fetch("/redirect-fragments.json")
    .then((response) => response.json())
    .then((map) => {
      const heading = document.getElementById(map[location.pathname]?.[anchor] ?? "");
      if (heading) {
        history.replaceState(null, "", "#" + heading.id);
        heading.scrollIntoView();
      }
    })
    .catch(() => {});
}
`;

export function redirectFragments(): AstroIntegration {
  return {
    name: "redirect-fragments",
    hooks: {
      "astro:config:setup": ({ injectScript }) => {
        injectScript("page", SCRIPT);
      },
    },
  };
}

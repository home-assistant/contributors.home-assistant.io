export const SITE = {
  title: "Home Assistant Contributors",
  description:
    "Everything you need to contribute to Home Assistant: code, design, documentation, translations, and community.",
  repository: "https://github.com/home-assistant/contributors.home-assistant.io",
  branch: "main",
};

export function editUrl(filePath: string): string {
  return `${SITE.repository}/edit/${SITE.branch}/${filePath}`;
}

/** Every commit that changed this file, on GitHub. */
export function historyUrl(filePath: string): string {
  return `${SITE.repository}/commits/${SITE.branch}/${filePath}`;
}

// Privacy-first, self-hosted analytics by the Open Home Foundation.
export const PLAUSIBLE = {
  // The domain this site has in the Plausible site registry of
  // openhomefoundation.org (list/plausible-sites.json). The shared loader
  // looks up the script of the site there. Leave it empty to load no
  // analytics at all.
  site: "contributors.home-assistant.io",
  loader: "https://www.openhomefoundation.org/plausible.js",
  dashboard: "https://plausible.openhomefoundation.org/contributors.home-assistant.io",
  about:
    "https://www.openhomefoundation.org/blog/making-our-web-analytics-open-source-with-plausible/",
};

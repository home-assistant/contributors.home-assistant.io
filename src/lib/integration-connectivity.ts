// The connectivity values, from the file core generates from its own
// translations and icons: homeassistant/generated/integration_connectivity.json.
// Reading it from core at build time keeps the connectivity page in sync with
// core, without a copy to maintain here.
//
// Nothing here may fail the build. When the file can't be read, the page
// says so and links to the file in core.

import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

export const CONNECTIVITY_SOURCE =
  "https://github.com/home-assistant/core/blob/dev/homeassistant/generated/integration_connectivity.json";
const CONNECTIVITY_URL =
  "https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/generated/integration_connectivity.json";

// Keep the build moving when GitHub is slow.
const FETCH_TIMEOUT_MS = 10_000;
// A local build or `pnpm dev` reuses the file for a while, instead of asking
// GitHub on every run. A new build on Netlify is at least this old.
const CACHE_MAX_AGE_MS = 60 * 60 * 1000;
const CACHE_FILE = path.join(process.cwd(), "node_modules/.cache/integration-connectivity.json");

export interface IntegrationConnectivity {
  slug: string;
  name: string;
  description: string;
  icon: string;
}

let connectivity: Promise<IntegrationConnectivity[] | undefined> | undefined;

// Every page that shows the connectivity values shares one read per build.
export function getIntegrationConnectivity(): Promise<IntegrationConnectivity[] | undefined> {
  connectivity ??= loadConnectivity().catch((error) => {
    console.warn(`[integration-connectivity] Could not load the connectivity values: ${error}`);
    return undefined;
  });
  return connectivity;
}

async function loadConnectivity(): Promise<IntegrationConnectivity[]> {
  try {
    if (Date.now() - statSync(CACHE_FILE).mtimeMs < CACHE_MAX_AGE_MS) {
      return JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    }
  } catch {
    // No cached file yet.
  }

  const response = await fetch(CONNECTIVITY_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`GitHub answered with HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data) || !data.every((value) => value.slug && value.name && value.icon)) {
    throw new Error("the file is not a list of connectivity values");
  }

  mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(data));
  return data;
}

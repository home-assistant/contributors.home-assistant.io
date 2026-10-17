// The integration categories, from the file core generates from its own
// translations and icons: homeassistant/generated/integration_categories.json.
// Reading it from core at build time keeps the categories page in sync with
// core, without a copy to maintain here.
//
// Nothing here may fail the build. When the file can't be read, the page
// says so and links to the file in core.

import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

export const CATEGORIES_SOURCE =
  "https://github.com/home-assistant/core/blob/dev/homeassistant/generated/integration_categories.json";
const CATEGORIES_URL =
  "https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/generated/integration_categories.json";

// Keep the build moving when GitHub is slow.
const FETCH_TIMEOUT_MS = 10_000;
// A local build or `pnpm dev` reuses the file for a while, instead of asking
// GitHub on every run. A new build on Netlify is at least this old.
const CACHE_MAX_AGE_MS = 60 * 60 * 1000;
const CACHE_FILE = path.join(process.cwd(), "node_modules/.cache/integration-categories.json");

export interface IntegrationSubcategory {
  slug: string;
  name: string;
  icon: string;
}

export interface IntegrationCategory {
  slug: string;
  name: string;
  description: string;
  icon: string;
  subcategories: IntegrationSubcategory[];
}

let categories: Promise<IntegrationCategory[] | undefined> | undefined;

// Every page that shows the categories shares one read per build.
export function getIntegrationCategories(): Promise<IntegrationCategory[] | undefined> {
  categories ??= loadCategories().catch((error) => {
    console.warn(`[integration-categories] Could not load the categories: ${error}`);
    return undefined;
  });
  return categories;
}

async function loadCategories(): Promise<IntegrationCategory[]> {
  try {
    if (Date.now() - statSync(CACHE_FILE).mtimeMs < CACHE_MAX_AGE_MS) {
      return JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    }
  } catch {
    // No cached file yet.
  }

  const response = await fetch(CATEGORIES_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`GitHub answered with HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data) || !data.every((category) => category.slug && Array.isArray(category.subcategories))) {
    throw new Error("the file is not a list of categories");
  }

  mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(data));
  return data;
}

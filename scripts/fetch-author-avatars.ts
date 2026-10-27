// Downloads the GitHub avatars of blog authors to public/images/authors/,
// so the blog does not load images from GitHub. Only avatars that are not
// there yet: delete one to download it again.
//
// Authors and their GitHub usernames are in src/data/authors.ts.
//
// Usage:
//   pnpm avatars

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { AUTHORS } from "../src/data/authors.ts";

const OUTPUT_DIR = fileURLToPath(new URL("../public/images/authors/", import.meta.url));

// Twice the size they show at, for sharp avatars on high density screens.
const SIZE = 96;

await mkdir(OUTPUT_DIR, { recursive: true });

const usernames = [...new Set(Object.values(AUTHORS))];
let downloaded = 0;

for (const username of usernames) {
  const file = `${OUTPUT_DIR}${username.toLowerCase()}.png`;
  if (existsSync(file)) {
    continue;
  }

  const response = await fetch(`https://github.com/${username}.png?size=${SIZE}`);
  if (!response.ok) {
    console.warn(`No avatar for ${username}: ${response.status}`);
    continue;
  }

  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  downloaded += 1;
}

console.log(`Downloaded ${downloaded} avatars, ${usernames.length} authors in total.`);

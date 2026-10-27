// Reads files of one commit of a checkout with a single
// `git cat-file --batch`: a process per file is slow for thousands of files.

import { execFileSync } from "node:child_process";

export function readFiles(checkout: string, commit: string, files: string[]) {
  const output = execFileSync("git", ["cat-file", "--batch"], {
    cwd: checkout,
    input: files.map((file) => `${commit}:${file}`).join("\n"),
    maxBuffer: 1024 * 1024 * 1024,
  });

  const sources = new Map<string, string>();
  let offset = 0;
  for (const file of files) {
    const headerEnd = output.indexOf(10, offset);
    const size = Number(output.subarray(offset, headerEnd).toString().split(" ")[2]);
    sources.set(file, output.subarray(headerEnd + 1, headerEnd + 1 + size).toString("utf8"));
    offset = headerEnd + 1 + size + 1;
  }
  return sources;
}

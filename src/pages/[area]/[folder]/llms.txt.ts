// Every page of one folder of an area, for language models and agents. See
// src/lib/llms.ts.
import type { APIContext } from "astro";
import { allFolders, folderLlmsIndex, type LlmsFolder } from "../../../lib/llms";

export async function getStaticPaths() {
  return (await allFolders()).map((folder) => {
    const [area, name] = folder.path.split("/");
    return { params: { area, folder: name }, props: { folder } };
  });
}

export async function GET({ props }: APIContext<{ folder: LlmsFolder }>) {
  return new Response(await folderLlmsIndex(props.folder), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

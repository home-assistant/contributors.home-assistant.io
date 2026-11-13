// Every blog post, for language models and agents. See src/lib/llms.ts.
import { blogLlmsIndex } from "../../lib/llms";

export async function GET() {
  return new Response(await blogLlmsIndex(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

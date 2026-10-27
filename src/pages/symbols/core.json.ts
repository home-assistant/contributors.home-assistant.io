// The code symbols of core that the docs link to, for the cards on those
// links. See src/lib/code-symbols.ts and src/components/HoverCards.astro.
import index from "../../data/symbols/core.json";
import { symbolCards } from "../../lib/symbol-cards";

export async function GET() {
  return Response.json(await symbolCards(index, "python"));
}

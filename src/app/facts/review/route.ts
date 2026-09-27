import { FplError } from "@/lib/fpl/client";
import { reviewFacts } from "@/lib/facts/review";

// Plain-text review fact sheet. Optional ?gw=N picks the gameweek;
// ?part=1|2|3|league returns one section.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const gwParam = params.get("gw");
  const part = params.get("part") ?? undefined;
  const gw = gwParam ? Number(gwParam) : undefined;
  if (gw !== undefined && !(Number.isInteger(gw) && gw >= 1 && gw <= 38)) {
    return new Response("gw must be a whole number from 1 to 38", { status: 400 });
  }
  try {
    return new Response(await reviewFacts(gw, part), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    if (!(err instanceof FplError)) throw err;
    return new Response(`Couldn't load FPL data: ${err.message} (${err.path})`, { status: 502 });
  }
}

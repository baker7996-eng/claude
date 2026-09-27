import { FplError } from "@/lib/fpl/client";
import { statusFacts } from "@/lib/facts/status";

// Plain-text "is a preview or review due?" check for the scheduled job.
export async function GET() {
  try {
    return new Response(await statusFacts(), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    if (!(err instanceof FplError)) throw err;
    return new Response(`Couldn't load FPL data: ${err.message} (${err.path})`, { status: 502 });
  }
}

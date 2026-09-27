import { listWriteups, saveWriteup, slugFor, type Kind, type PredictedTie } from "@/lib/writeups";
import { hasWriteupToken, unauthorized } from "@/lib/writeup-token";

const MAX_MARKDOWN = 60_000;

/** The routine reads recent write-ups (to keep running jokes going). */
export async function GET(request: Request) {
  if (!hasWriteupToken(request)) return unauthorized();
  const latest = Math.min(6, Number(new URL(request.url).searchParams.get("latest")) || 2);
  const recent = (await listWriteups()).slice(0, latest);
  return new Response(recent.map((w) => `===== ${w.slug} =====\n${w.markdown}`).join("\n\n") || "No write-ups yet.", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * The routine publishes a write-up:
 * { gw, kind: "preview" | "review", markdown, test?, predictions?: [{ teams, predicted }] }
 */
export async function POST(request: Request) {
  if (!hasWriteupToken(request)) return unauthorized();
  let body: {
    gw?: unknown;
    kind?: unknown;
    markdown?: unknown;
    test?: unknown;
    predictions?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return new Response("Body must be JSON.", { status: 400 });
  }
  const gw = Number(body.gw);
  const kind = body.kind as Kind;
  const markdown = typeof body.markdown === "string" ? body.markdown.trim() : "";
  if (!Number.isInteger(gw) || gw < 1 || gw > 38) return new Response("gw must be 1-38.", { status: 400 });
  if (kind !== "preview" && kind !== "review") return new Response('kind must be "preview" or "review".', { status: 400 });
  if (!markdown || markdown.length > MAX_MARKDOWN) return new Response("markdown is empty or too long.", { status: 400 });

  let predictions: PredictedTie[] | undefined;
  if (body.predictions !== undefined) {
    const valid =
      Array.isArray(body.predictions) &&
      body.predictions.every(
        (t) =>
          Array.isArray(t?.teams) && t.teams.length === 2 && t.teams.every((x: unknown) => typeof x === "string") &&
          Array.isArray(t?.predicted) && t.predicted.length === 2 && t.predicted.every((x: unknown) => Number.isInteger(x)),
      );
    if (!valid) return new Response("predictions must be [{ teams: [a, b], predicted: [x, y] }].", { status: 400 });
    predictions = body.predictions as PredictedTie[];
  }

  const slug = await saveWriteup(gw, kind, markdown, body.test === true, predictions);
  const url = new URL(`/writeups/${slug}`, request.url).toString();
  return Response.json({ saved: slug === slugFor(gw, kind, body.test === true), slug, url });
}

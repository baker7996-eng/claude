import "server-only";

import { timingSafeEqual } from "node:crypto";

/**
 * The write-up routine proves itself with `Authorization: Bearer <token>`,
 * where the token is the WRITEUP_TOKEN setting (in Vercel and in the cloud
 * environment the routine runs in). No token configured = uploads disabled.
 */
export function hasWriteupToken(request: Request): boolean {
  const expected = process.env.WRITEUP_TOKEN;
  if (!expected) return false;
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const unauthorized = () =>
  new Response("Missing or wrong write-up token.", { status: 401 });

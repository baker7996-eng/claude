import { readFileSync } from "node:fs";
import path from "node:path";
import { hasWriteupToken, unauthorized } from "@/lib/writeup-token";

/** The house style guide, for the routine (it no longer needs the repo). */
export async function GET(request: Request) {
  if (!hasWriteupToken(request)) return unauthorized();
  return new Response(readFileSync(path.join(process.cwd(), "writeups/STYLE.md"), "utf8"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

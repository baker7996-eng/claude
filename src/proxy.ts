import { NextResponse, type NextRequest } from "next/server";
import { authSecret, decodeSession, SESSION_COOKIE } from "@/lib/session";

// Members only: anyone without a valid sign-in cookie is sent to /login.
// Pages re-check the session fully (including PIN changes) via viewer().
export function proxy(request: NextRequest) {
  if (!authSecret) return NextResponse.next(); // sign-in not switched on yet
  if (decodeSession(request.cookies.get(SESSION_COOKIE)?.value, authSecret)) return NextResponse.next();

  const login = new URL("/login", request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/") login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except the login page, the fact sheets the write-up job reads,
  // the write-up API (it checks its own token), app icons and manifest (phones
  // fetch these before signing in), and Next.js's own files.
  matcher: ["/((?!login|facts|api/writeups|_next|favicon.ico|icon|apple-icon|manifest.webmanifest).*)"],
};

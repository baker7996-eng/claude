import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed sign-in cookie: `<base64url payload>.<HMAC>`. The payload names the
 * league entry and the PIN version it was issued for, so changing or resetting
 * a PIN signs that team out everywhere. No server-only import: the proxy uses
 * this too.
 */
export const SESSION_COOKIE = "nfif_session";
export const SESSION_DAYS = 180;

export interface Session {
  entryId: number;
  pinVersion: number;
  expires: number; // ms since epoch
}

/** Sign-in is switched on only once AUTH_SECRET is set (Vercel settings). */
export const authSecret = process.env.AUTH_SECRET || null;

function sign(data: string, secret: string) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function encodeSession(session: Session, secret: string): string {
  const data = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${data}.${sign(data, secret)}`;
}

export function decodeSession(cookie: string | undefined, secret: string): Session | null {
  if (!cookie) return null;
  const [data, mac] = cookie.split(".");
  if (!data || !mac) return null;
  const expected = Buffer.from(sign(data, secret));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const session = JSON.parse(Buffer.from(data, "base64url").toString()) as Session;
    return session.expires > Date.now() ? session : null;
  } catch {
    return null;
  }
}

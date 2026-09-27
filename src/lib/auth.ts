import "server-only";

import { randomInt, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { ENTRY_ID } from "@/lib/config";
import { authSecret, decodeSession, encodeSession, SESSION_COOKIE, SESSION_DAYS } from "@/lib/session";
import { store } from "@/lib/store";

// Every team's PIN is stored hashed, with a version number that bumps on each
// change so older sign-ins stop working.
interface PinRecord {
  hash: string; // "salt:hash", scrypt
  version: number;
}

const MAX_FAILS = 5;
const LOCK_SECONDS = 15 * 60;

export const OWNER_ENTRY_ID = ENTRY_ID;

function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pin, salt, 32).toString("hex")}`;
}

function pinMatches(pin: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const given = scryptSync(pin, salt, 32);
  const expected = Buffer.from(hash, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export const isValidPin = (pin: string) => /^\d{4,8}$/.test(pin);

const pinKey = (entryId: number) => `pin:${entryId}`;
// Failed attempts are counted per team AND per device (IP address), so
// someone guessing wrong locks out only themselves, not the team's owner.
async function failKey(entryId: number) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  return `fails:${entryId}:${ip}`;
}

export async function pinRecord(entryId: number) {
  return store.get<PinRecord>(pinKey(entryId));
}

export async function setPin(entryId: number, pin: string) {
  const current = await pinRecord(entryId);
  await store.set(pinKey(entryId), { hash: hashPin(pin), version: (current?.version ?? 0) + 1 });
}

/** A fresh random 4-digit PIN for the owner to hand out. */
export async function resetPin(entryId: number) {
  const pin = String(randomInt(0, 10_000)).padStart(4, "0");
  await setPin(entryId, pin);
  return pin;
}

export type SignInResult = "ok" | "wrong" | "locked" | "no-pin";

/**
 * Check a team's PIN. The owner can sign in with OWNER_PIN until they set
 * their own. Five wrong attempts from one device lock that device out of that
 * team for 15 minutes.
 */
export async function checkPin(entryId: number, pin: string): Promise<SignInResult> {
  const key = await failKey(entryId);
  const fails = (await store.get<number>(key)) ?? 0;
  if (fails >= MAX_FAILS) return "locked";

  const record = await pinRecord(entryId);
  const ownerPin = entryId === OWNER_ENTRY_ID ? process.env.OWNER_PIN : undefined;
  if (!record && !ownerPin) return "no-pin";

  const ok = record ? pinMatches(pin, record.hash) : pin === ownerPin;
  if (!ok) {
    await store.incr(key, LOCK_SECONDS);
    return "wrong";
  }
  await store.del(key);
  return "ok";
}

export async function startSession(entryId: number) {
  if (!authSecret) return;
  const record = await pinRecord(entryId);
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  (await cookies()).set(
    SESSION_COOKIE,
    encodeSession({ entryId, pinVersion: record?.version ?? 0, expires }, authSecret),
    { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires },
  );
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Who is looking at the page. With sign-in switched off (no AUTH_SECRET yet)
 * everyone is treated as the owner, as before sign-in existed.
 */
export async function viewer(): Promise<{ entryId: number; isOwner: boolean; authEnabled: boolean } | null> {
  if (!authSecret) return { entryId: OWNER_ENTRY_ID, isOwner: true, authEnabled: false };
  const session = decodeSession((await cookies()).get(SESSION_COOKIE)?.value, authSecret);
  if (!session) return null;
  const record = await pinRecord(session.entryId);
  if ((record?.version ?? 0) !== session.pinVersion) return null;
  return { entryId: session.entryId, isOwner: session.entryId === OWNER_ENTRY_ID, authEnabled: true };
}

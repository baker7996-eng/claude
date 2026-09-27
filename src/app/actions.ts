"use server";

import { redirect } from "next/navigation";
import {
  checkPin,
  endSession,
  isValidPin,
  resetPin,
  setPin,
  startSession,
  viewer,
} from "@/lib/auth";

export interface FormState {
  error?: string;
  message?: string;
}

// Only allow redirects back into this site.
const safeNext = (next: FormDataEntryValue | null) =>
  typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const entryId = Number(form.get("entry"));
  const pin = String(form.get("pin") ?? "").trim();
  if (!entryId) return { error: "Pick your team." };
  if (!isValidPin(pin)) return { error: "PINs are 4 to 8 digits." };

  const result = await checkPin(entryId, pin);
  if (result === "locked") return { error: "Too many wrong tries. Wait 15 minutes and try again." };
  if (result === "no-pin") return { error: "This team has no PIN yet. Ask Ed for one." };
  if (result === "wrong") return { error: "Wrong PIN." };

  await startSession(entryId);
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  await endSession();
  redirect("/login");
}

export async function changePin(_: FormState, form: FormData): Promise<FormState> {
  const me = await viewer();
  if (!me) redirect("/login");
  const current = String(form.get("current") ?? "").trim();
  const next = String(form.get("new") ?? "").trim();
  if (!isValidPin(next)) return { error: "New PIN must be 4 to 8 digits." };
  if (next !== String(form.get("confirm") ?? "").trim()) return { error: "The new PINs don't match." };

  const result = await checkPin(me.entryId, current);
  if (result === "locked") return { error: "Too many wrong tries. Wait 15 minutes and try again." };
  if (result !== "ok") return { error: "Your current PIN is wrong." };

  await setPin(me.entryId, next);
  await startSession(me.entryId); // keep this device signed in on the new PIN
  return { message: "PIN changed. Other devices will need the new PIN." };
}

/** Owner only: issue a new PIN for a team (shown once). */
export async function issuePin(_: FormState, form: FormData): Promise<FormState> {
  const me = await viewer();
  if (!me?.isOwner) return { error: "Only the league admin can do that." };
  const entryId = Number(form.get("entry"));
  const team = String(form.get("team") ?? "");
  const pin = await resetPin(entryId);
  if (entryId === me.entryId) await startSession(entryId);
  return { message: `${team}: new PIN ${pin}` };
}

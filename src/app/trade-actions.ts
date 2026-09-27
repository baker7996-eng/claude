"use server";

import { redirect } from "next/navigation";
import { viewer } from "@/lib/auth";
import { loadLeague } from "@/lib/facts/league";
import { fpl } from "@/lib/fpl/client";
import { addOffer, setListing, updateOffer, type OfferStatus } from "@/lib/trades";

const back = (msg: string) => redirect(`/league/trades?msg=${encodeURIComponent(msg)}`);

/** Which players each league entry owns right now. */
async function ownership() {
  const lg = await loadLeague();
  const status = await fpl.elementStatus(lg.leagueId);
  return new Map(status.element_status.map((s) => [s.element, s.owner]));
}

export async function saveListing(form: FormData) {
  const me = await viewer();
  if (!me) redirect("/login?next=/league/trades");
  const owners = await ownership();
  // Only players you actually own can go on your block.
  const players = form
    .getAll("player")
    .map(Number)
    .filter((id) => owners.get(id) === me.entryId);
  await setListing(me.entryId, players, String(form.get("note") ?? "").trim());
  back(players.length ? "Your trade block is updated." : "Your trade block is cleared.");
}

export async function makeOffer(form: FormData) {
  const me = await viewer();
  if (!me) redirect("/login?next=/league/trades");
  const owners = await ownership();
  const want = Number(form.get("want"));
  const to = owners.get(want);
  const give = form.getAll("give").map(Number).filter((id) => owners.get(id) === me.entryId);
  if (!to || to === me.entryId) back("That player isn't on someone else's team any more.");
  if (give.length === 0) back("Pick at least one of your players to offer.");
  await addOffer({ from: me.entryId, to: to!, want: [want], give, message: String(form.get("message") ?? "").trim() });
  back("Offer sent. They'll see it on their Trade block page.");
}

export async function answerOffer(form: FormData) {
  const me = await viewer();
  if (!me) redirect("/login?next=/league/trades");
  const status = String(form.get("status")) as OfferStatus;
  if (!["accepted", "declined", "withdrawn"].includes(status)) back("Unknown action.");
  const ok = await updateOffer(String(form.get("id")), me.entryId, status);
  back(
    !ok
      ? "That offer has already been dealt with."
      : status === "accepted"
        ? "Accepted! Now make the trade in the FPL Draft app."
        : status === "declined"
          ? "Offer declined."
          : "Offer withdrawn.",
  );
}

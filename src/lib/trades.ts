import "server-only";

import { randomBytes } from "node:crypto";
import { store } from "@/lib/store";

export interface BlockListing {
  players: number[]; // element ids the manager is happy to trade
  note: string;
  updatedAt: string;
}

export type OfferStatus = "open" | "accepted" | "declined" | "withdrawn";

export interface Offer {
  id: string;
  from: number; // entry_id making the offer
  to: number; // entry_id receiving it
  want: number[]; // their players
  give: number[]; // the offerer's players
  message: string;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
}

const BLOCK_KEY = "trade:block";
const OFFERS_KEY = "trade:offers";

export async function getBlock(): Promise<Record<string, BlockListing>> {
  return (await store.get<Record<string, BlockListing>>(BLOCK_KEY)) ?? {};
}

export async function setListing(entryId: number, players: number[], note: string) {
  const block = await getBlock();
  if (players.length === 0 && !note) delete block[entryId];
  else block[entryId] = { players, note: note.slice(0, 200), updatedAt: new Date().toISOString() };
  await store.set(BLOCK_KEY, block);
}

export async function getOffers(): Promise<Offer[]> {
  return (await store.get<Offer[]>(OFFERS_KEY)) ?? [];
}

export async function addOffer(offer: Omit<Offer, "id" | "status" | "createdAt" | "updatedAt">) {
  const offers = await getOffers();
  const now = new Date().toISOString();
  offers.push({ ...offer, message: offer.message.slice(0, 300), id: randomBytes(6).toString("hex"), status: "open", createdAt: now, updatedAt: now });
  // Keep the list small: drop settled offers older than 30 days.
  const cutoff = Date.now() - 30 * 86_400_000;
  await store.set(
    OFFERS_KEY,
    offers.filter((o) => o.status === "open" || Date.parse(o.updatedAt) > cutoff),
  );
}

/** Change an offer's status if `by` is allowed to (recipient answers, sender withdraws). */
export async function updateOffer(id: string, by: number, status: OfferStatus) {
  const offers = await getOffers();
  const offer = offers.find((o) => o.id === id);
  if (!offer || offer.status !== "open") return false;
  const allowed = status === "withdrawn" ? offer.from === by : offer.to === by;
  if (!allowed) return false;
  offer.status = status;
  offer.updatedAt = new Date().toISOString();
  await store.set(OFFERS_KEY, offers);
  return true;
}

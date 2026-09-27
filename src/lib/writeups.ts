import "server-only";

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import predictionsFile from "../../writeups/predictions.json";
import type { LeagueDetails } from "@/lib/fpl/types";
import { store } from "@/lib/store";

// Write-ups come from two places: markdown files committed in /writeups (the
// early ones) and uploads from the write-up routine, stored in Redis.
const DIR = path.join(process.cwd(), "writeups");
const FILE = /^gw(\d+)-(preview|review)\.md$/;
const INDEX_KEY = "writeups:index"; // slugs of uploaded (non-test) write-ups
const writeupKey = (slug: string) => `writeup:${slug}`;
const PREDICTIONS_KEY = "predictions:uploaded";

export type Kind = "preview" | "review";

export interface Writeup {
  slug: string; // "gw05-review", or "test-gw05-review" for test uploads
  gw: number;
  kind: Kind;
  title: string; // the "## Gameweek N — hook" line, without the hashes
  markdown: string;
}

export const slugFor = (gw: number, kind: Kind, test = false) =>
  `${test ? "test-" : ""}gw${String(gw).padStart(2, "0")}-${kind}`;

function toWriteup(slug: string, gw: number, kind: Kind, markdown: string): Writeup {
  const heading = markdown.split("\n").find((l) => l.startsWith("## "));
  return { slug, gw, kind, title: heading?.slice(3).trim() ?? `Gameweek ${gw}`, markdown };
}

function fileWriteups(): Writeup[] {
  let files: string[] = [];
  try {
    files = readdirSync(DIR);
  } catch {
    return [];
  }
  return files
    .map((file) => FILE.exec(file))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) =>
      toWriteup(m[0].replace(/\.md$/, ""), Number(m[1]), m[2] as Kind, readFileSync(path.join(DIR, m[0]), "utf8")),
    );
}

/** Every published write-up, newest gameweek first (review before preview). */
export async function listWriteups(): Promise<Writeup[]> {
  const slugs = (await store.get<string[]>(INDEX_KEY)) ?? [];
  const uploaded = (await Promise.all(slugs.map((s) => store.get<Writeup>(writeupKey(s))))).filter(
    (w): w is Writeup => w !== null,
  );
  const bySlug = new Map(fileWriteups().map((w) => [w.slug, w]));
  for (const w of uploaded) bySlug.set(w.slug, w); // uploads win
  return [...bySlug.values()].sort((a, b) => b.gw - a.gw || (a.kind === "review" ? -1 : 1));
}

export async function getWriteup(slug: string): Promise<Writeup | null> {
  return (await store.get<Writeup>(writeupKey(slug))) ?? fileWriteups().find((w) => w.slug === slug) ?? null;
}

export async function hasWriteup(gw: number, kind: Kind) {
  return (await listWriteups()).some((w) => w.gw === gw && w.kind === kind);
}

export interface PredictedTie {
  teams: [string, string];
  predicted: [number, number];
}

/** Save an uploaded write-up (and a preview's predictions). */
export async function saveWriteup(gw: number, kind: Kind, markdown: string, test: boolean, predictions?: PredictedTie[]) {
  const slug = slugFor(gw, kind, test);
  await store.set(writeupKey(slug), toWriteup(slug, gw, kind, markdown));
  if (test) return slug;
  const index = (await store.get<string[]>(INDEX_KEY)) ?? [];
  if (!index.includes(slug)) await store.set(INDEX_KEY, [...index, slug]);
  if (kind === "preview" && predictions?.length) {
    const saved = (await store.get<{ gw: number; ties: PredictedTie[] }[]>(PREDICTIONS_KEY)) ?? [];
    await store.set(PREDICTIONS_KEY, [...saved.filter((g) => g.gw !== gw), { gw, ties: predictions }]);
  }
  return slug;
}

export type Verdict = "hit" | "miss" | "pending";

export interface ScoredTie {
  teams: [string, string];
  predicted: [number, number];
  actual: [number, number] | null;
  verdict: Verdict;
}

/**
 * Logged predictions (committed file plus uploads) compared with real
 * results. A hit means the right winner (or a predicted draw that was a draw).
 */
export async function scoredPredictions(league: LeagueDetails) {
  const name = new Map(league.league_entries.map((e) => [e.id, e.entry_name]));
  const uploaded = (await store.get<{ gw: number; ties: PredictedTie[] }[]>(PREDICTIONS_KEY)) ?? [];
  const byGw = new Map<number, PredictedTie[]>(
    predictionsFile.gameweeks.map((g) => [g.gw, g.ties as PredictedTie[]]),
  );
  for (const g of uploaded) byGw.set(g.gw, g.ties);

  return [...byGw]
    .map(([gw, ties]) => ({
      gw,
      ties: ties.map((t): ScoredTie => {
        const match = league.matches.find(
          (m) =>
            m.event === gw &&
            name.get(m.league_entry_1) === t.teams[0] &&
            name.get(m.league_entry_2) === t.teams[1],
        );
        if (!match?.finished) return { ...t, actual: null, verdict: "pending" };
        const actual: [number, number] = [match.league_entry_1_points, match.league_entry_2_points];
        const sign = (a: number, b: number) => Math.sign(a - b);
        return { ...t, actual, verdict: sign(...t.predicted) === sign(...actual) ? "hit" : "miss" };
      }),
    }))
    .sort((a, b) => b.gw - a.gw);
}

export function predictionRecord(scored: Awaited<ReturnType<typeof scoredPredictions>>) {
  const all = scored.flatMap((g) => g.ties);
  return {
    hits: all.filter((t) => t.verdict === "hit").length,
    misses: all.filter((t) => t.verdict === "miss").length,
  };
}

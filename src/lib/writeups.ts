import "server-only";

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import predictionsFile from "../../writeups/predictions.json";
import type { LeagueDetails } from "@/lib/fpl/types";

const DIR = path.join(process.cwd(), "writeups");
const FILE = /^gw(\d+)-(preview|review)\.md$/;

export type Kind = "preview" | "review";

export interface Writeup {
  slug: string; // "gw05-review"
  gw: number;
  kind: Kind;
  title: string; // the "## Gameweek N — hook" line, without the hashes
  markdown: string;
}

/** Every saved write-up, newest gameweek first (review before preview). */
export function listWriteups(): Writeup[] {
  let files: string[] = [];
  try {
    files = readdirSync(DIR);
  } catch {
    return [];
  }
  return files
    .map((file) => FILE.exec(file))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => {
      const markdown = readFileSync(path.join(DIR, m[0]), "utf8");
      const heading = markdown.split("\n").find((l) => l.startsWith("## "));
      return {
        slug: m[0].replace(/\.md$/, ""),
        gw: Number(m[1]),
        kind: m[2] as Kind,
        title: heading?.slice(3).trim() ?? `Gameweek ${Number(m[1])}`,
        markdown,
      };
    })
    .sort((a, b) => b.gw - a.gw || (a.kind === "review" ? -1 : 1));
}

export function hasWriteup(gw: number, kind: Kind) {
  return listWriteups().some((w) => w.gw === gw && w.kind === kind);
}

export type Verdict = "hit" | "miss" | "pending";

export interface ScoredTie {
  teams: [string, string];
  predicted: [number, number];
  actual: [number, number] | null;
  verdict: Verdict;
}

/**
 * Logged predictions compared with real results. A hit means the right
 * winner (or a predicted draw that was a draw).
 */
export function scoredPredictions(league: LeagueDetails) {
  const name = new Map(league.league_entries.map((e) => [e.id, e.entry_name]));
  return predictionsFile.gameweeks
    .map((g) => ({
      gw: g.gw,
      ties: g.ties.map((t): ScoredTie => {
        const match = league.matches.find(
          (m) =>
            m.event === g.gw &&
            name.get(m.league_entry_1) === t.teams[0] &&
            name.get(m.league_entry_2) === t.teams[1],
        );
        const predicted = t.predicted as [number, number];
        if (!match?.finished) {
          return { teams: t.teams as [string, string], predicted, actual: null, verdict: "pending" };
        }
        const actual: [number, number] = [match.league_entry_1_points, match.league_entry_2_points];
        const sign = (a: number, b: number) => Math.sign(a - b);
        return {
          teams: t.teams as [string, string],
          predicted,
          actual,
          verdict: sign(...predicted) === sign(...actual) ? "hit" : "miss",
        };
      }),
    }))
    .sort((a, b) => b.gw - a.gw);
}

export function predictionRecord(scored: ReturnType<typeof scoredPredictions>) {
  const all = scored.flatMap((g) => g.ties);
  return {
    hits: all.filter((t) => t.verdict === "hit").length,
    misses: all.filter((t) => t.verdict === "miss").length,
  };
}

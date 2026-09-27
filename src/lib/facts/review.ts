import "server-only";

import { fpl } from "@/lib/fpl/client";
import type { LeagueEntry, LiveStats, Player } from "@/lib/fpl/types";
import {
  countedXI,
  fixtureLabel,
  loadLeague,
  pointsByGameweek,
  type League,
} from "./league";
import { Sheet, tableText } from "./text";

const FORM_WEEKS = 4;

/**
 * Plain-text fact sheet for a finished gameweek: every H2H result, every
 * player's points with the reason, and a check that each XI adds up to the
 * score FPL recorded. Written to be read by a person or by Claude.
 */
export async function reviewFacts(requestedGw?: number, part?: string): Promise<string> {
  const lg = await loadLeague();
  const gw = requestedGw ?? latestFinishedGameweek(lg);
  if (!gw) return "No gameweek has finished yet.";

  const matches = lg.league.matches.filter((m) => m.event === gw);
  if (matches.length === 0) return `No league matches found for gameweek ${gw}.`;

  const [live, fixtures, form, status] = await Promise.all([
    fpl.live(gw),
    fpl.fixtures(gw),
    pointsByGameweek(gw - FORM_WEEKS + 1, gw),
    fpl.elementStatus(lg.leagueId),
  ]);
  const stats = (id: number): LiveStats | undefined => live.elements[id]?.stats;
  const points = (id: number) => stats(id)?.total_points ?? 0;
  const fixtureOf = (p: Player) => fixtureLabel(p.team, fixtures, lg.teamShort);

  const sides = new Map<number, Side>();
  await Promise.all(
    matches.flatMap((m) => [m.league_entry_1, m.league_entry_2]).map(async (id) => {
      const entry = lg.entries.get(id)!;
      const picks = await fpl.entryPicks(entry.entry_id, gw);
      sides.set(id, { entry, picks: picks.picks, subs: picks.subs, counted: countedXI(picks) });
    }),
  );

  const out = new Sheet();
  const allFinished = matches.every((m) => m.finished);
  out.push(`# ${lg.league.league.name} — Gameweek ${gw} review facts`);
  out.push(
    allFinished
      ? "All matches finished. Scores are final."
      : "WARNING: this gameweek is not finished; scores are provisional.",
  );
  out.push(
    `Player lines: name (club position) points, then minutes and what scored.`,
    `Tags: XI = started and counted, AUTO-SUB = came off the bench and counted,`,
    `BENCH = did not count, OUT = started but was auto-subbed out.`,
    `form = points in gameweeks ${Math.max(1, gw - FORM_WEEKS + 1)}-${gw}.`,
    `Parts: add ?part=1, 2 or 3 for one head-to-head, or ?part=league for results, league-wide stats, table and checks.`,
    "",
  );

  out.section("league");

  out.push("## Premier League results");
  for (const f of fixtures) {
    out.push(`- ${lg.teamName(f.team_h)} ${f.team_h_score ?? "?"}-${f.team_a_score ?? "?"} ${lg.teamName(f.team_a)}`);
  }
  out.push("");

  const checks: string[] = [];
  for (const [i, m] of matches.entries()) {
    out.section(String(i + 1));
    const a = sides.get(m.league_entry_1)!;
    const b = sides.get(m.league_entry_2)!;
    out.push(`## ${a.entry.entry_name} v ${b.entry.entry_name}`);
    out.push(
      `${lg.manager(a.entry)} ${m.league_entry_1_points} – ${m.league_entry_2_points} ${lg.manager(b.entry)}`,
      "",
    );
    for (const [side, score] of [
      [a, m.league_entry_1_points],
      [b, m.league_entry_2_points],
    ] as const) {
      out.push(...sideText(side, score, lg, { stats, points, fixtureOf, form }));
      const total = [...side.counted].reduce((sum, id) => sum + points(id), 0);
      const check = `${side.entry.entry_name}: counted XI adds up to ${total}, FPL score ${score} — ${total === score ? "OK" : "MISMATCH"}`;
      checks.push(check);
      out.push(`Check: ${check}`, "");
    }
  }

  out.section("league");

  out.push("## Around the league");
  const owners = new Map(status.element_status.map((s) => [s.element, s.owner]));
  const scored = lg.bootstrap.elements
    .filter((p) => (stats(p.id)?.minutes ?? 0) > 0)
    .sort((x, y) => points(y.id) - points(x.id));
  const counting = [...sides.values()].flatMap((s) =>
    [...s.counted].map((id) => ({ id, team: s.entry.entry_name })),
  );
  const top = [...counting].sort((x, y) => points(y.id) - points(x.id)).slice(0, 5);
  out.push(
    "Top scorers that counted for a manager: " +
      top.map((t) => `${name(lg.player(t.id))} ${points(t.id)} (${t.team})`).join(", "),
  );
  const unowned = scored.filter((p) => !owners.get(p.id)).slice(0, 5);
  out.push(
    "Top scorers currently unowned (free agents now; ownership may have changed since): " +
      unowned.map((p) => `${p.web_name} (${lg.teamShort(p.team)}) ${points(p.id)}`).join(", "),
  );
  out.push("Points from counted players, by club (clubs with 3+ counted players):");
  const byClub = new Map<number, { players: number; points: number }>();
  for (const { id } of counting) {
    const p = lg.player(id);
    if (!p) continue;
    const c = byClub.get(p.team) ?? { players: 0, points: 0 };
    c.players += 1;
    c.points += points(id);
    byClub.set(p.team, c);
  }
  for (const [team, c] of [...byClub].filter(([, c]) => c.players >= 3).sort((x, y) => y[1].points - x[1].points)) {
    out.push(`- ${lg.teamName(team)}: ${c.players} players, ${c.points} pts (${fixtureLabel(team, fixtures, lg.teamShort)})`);
  }
  out.push("");

  out.push("## League table", ...tableText(lg.table()), "");
  out.push("## Checks", ...checks.map((c) => `- ${c}`));
  return out.render(part);
}

interface Side {
  entry: LeagueEntry;
  picks: { element: number; position: number }[];
  subs: { element_in: number; element_out: number }[];
  counted: Set<number>;
}

interface Ctx {
  stats: (id: number) => LiveStats | undefined;
  points: (id: number) => number;
  fixtureOf: (p: Player) => string;
  form: (id: number) => number[];
}

function sideText(side: Side, score: number, lg: League, ctx: Ctx): string[] {
  const subbedIn = new Set(side.subs.map((s) => s.element_in));
  const subbedOut = new Set(side.subs.map((s) => s.element_out));
  const lines = [`### ${side.entry.entry_name} (${lg.manager(side.entry)}) — ${score}`];

  const tagged = side.picks.map((pick) => {
    const tag = subbedIn.has(pick.element)
      ? "AUTO-SUB"
      : subbedOut.has(pick.element)
        ? "OUT"
        : pick.position <= 11
          ? "XI"
          : "BENCH";
    return { id: pick.element, tag, counts: side.counted.has(pick.element) };
  });
  tagged.sort((x, y) => Number(y.counts) - Number(x.counts) || ctx.points(y.id) - ctx.points(x.id));

  for (const { id, tag } of tagged) {
    const p = lg.player(id);
    if (!p) {
      lines.push(`- [${tag}] unknown player id ${id}`);
      continue;
    }
    lines.push(
      `- [${tag}] ${p.web_name} (${lg.teamShort(p.team)} ${lg.position(p)}) ${ctx.points(id)} — ${statText(ctx.stats(id), p.element_type)} | ${ctx.fixtureOf(p)} | form ${ctx.form(id).join(",")}`,
    );
  }

  const blanks = tagged.filter((t) => t.tag !== "BENCH" && (ctx.stats(t.id)?.minutes ?? 0) === 0);
  if (blanks.length) {
    lines.push(`Picked to start but played 0 minutes: ${blanks.map((t) => name(lg.player(t.id))).join(", ")}`);
  }
  const bench = tagged.filter((t) => !t.counts && t.tag === "BENCH");
  const benchPoints = bench.reduce((s, t) => s + ctx.points(t.id), 0);
  lines.push(
    `Points left on the bench: ${benchPoints}` +
      (bench.length ? ` (${bench.map((t) => `${name(lg.player(t.id))} ${ctx.points(t.id)}`).join(", ")})` : ""),
  );

  const byFixture = new Map<string, { pts: number; who: string[] }>();
  for (const t of tagged.filter((t) => t.counts)) {
    const p = lg.player(t.id);
    if (!p) continue;
    const key = ctx.fixtureOf(p);
    const f = byFixture.get(key) ?? { pts: 0, who: [] };
    f.pts += ctx.points(t.id);
    f.who.push(`${p.web_name} ${ctx.points(t.id)}`);
    byFixture.set(key, f);
  }
  lines.push("Counted points by real fixture:");
  for (const [fixture, f] of [...byFixture].sort((x, y) => y[1].pts - x[1].pts)) {
    lines.push(`  - ${fixture}: ${f.pts} (${f.who.join(", ")})`);
  }
  lines.push("");
  return lines;
}

// Clean sheets score for GKP/DEF/MID; goals conceded only cost GKP/DEF.
function statText(s: LiveStats | undefined, elementType: number): string {
  if (!s || s.minutes === 0) return "0'";
  const parts = [`${s.minutes}'`];
  const add = (n: number, label: string) => n && parts.push(`${n} ${label}`);
  add(s.goals_scored, s.goals_scored === 1 ? "goal" : "goals");
  add(s.assists, s.assists === 1 ? "assist" : "assists");
  if (elementType <= 3) add(s.clean_sheets, "clean sheet");
  if (elementType <= 2) add(s.goals_conceded, "conceded");
  add(s.saves, "saves");
  add(s.penalties_saved, "pen saved");
  add(s.penalties_missed, "pen missed");
  add(s.own_goals, "own goal");
  add(s.yellow_cards, "yellow");
  add(s.red_cards, "red");
  add(s.bonus, "bonus");
  return parts.join(", ");
}

function name(p: Player | undefined) {
  return p?.web_name ?? "unknown";
}

function latestFinishedGameweek(lg: League): number | null {
  const events = [...new Set(lg.league.matches.map((m) => m.event))].sort((a, b) => b - a);
  return (
    events.find((gw) => lg.league.matches.filter((m) => m.event === gw).every((m) => m.finished)) ??
    null
  );
}

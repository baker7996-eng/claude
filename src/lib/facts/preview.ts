import "server-only";

import { fpl } from "@/lib/fpl/client";
import type { Player } from "@/lib/fpl/types";
import { loadLeague, picksOrNull, pointsByGameweek } from "./league";
import { Sheet, tableText, ukTime } from "./text";

const FORM_WEEKS = 4;

/**
 * Plain-text fact sheet for an upcoming gameweek: the three H2H ties, each
 * squad with its real fixture, recent form and FPL's injury news, and which
 * managers are stacked into the same Premier League match.
 */
export async function previewFacts(requestedGw?: number, part?: string): Promise<string> {
  const lg = await loadLeague();
  const gw = requestedGw ?? lg.game.next_event;
  if (!gw) return "The season is over: there is no next gameweek.";

  const lastFinished = lg.game.current_event_finished
    ? lg.game.current_event
    : lg.game.current_event - 1;
  const matches = lg.league.matches.filter((m) => m.event === gw);
  if (matches.length === 0) return `No league matches found for gameweek ${gw}.`;

  const [fixtures, form] = await Promise.all([
    fpl.fixtures(gw),
    pointsByGameweek(lastFinished - FORM_WEEKS + 1, lastFinished),
  ]);
  const event = lg.bootstrap.events.data.find((e) => e.id === gw);

  const opponent = (p: Player) => {
    const f = fixtures.filter((f) => f.team_h === p.team || f.team_a === p.team);
    if (f.length === 0) return "NO FIXTURE";
    return f
      .map((f) =>
        f.team_h === p.team
          ? `v ${lg.teamShort(f.team_a)} (H)`
          : `at ${lg.teamShort(f.team_h)} (A)`,
      )
      .join(" & ");
  };
  // FPL's news text usually states the chance already ("75% chance of playing").
  const news = (p: Player) => {
    if (!p.news) return "";
    const chance = p.chance_of_playing_next_round;
    const extra = chance === null || p.news.includes("%") ? "" : ` [${chance}% chance of playing]`;
    return ` | NEWS: ${p.news}${extra}`;
  };

  const out = new Sheet();
  out.push(`# ${lg.league.league.name} — Gameweek ${gw} preview facts`);
  out.push(`FPL Draft deadline: ${ukTime(event?.deadline_time ?? null)} (UK time).`);
  out.push(
    `Player lines: name (club position) fixture | form = points in gameweeks ${Math.max(1, lastFinished - FORM_WEEKS + 1)}-${lastFinished} | season = season total | NEWS = FPL's injury/availability note.`,
    `Parts: add ?part=1, 2 or 3 for one head-to-head, or ?part=league for fixtures, stacking and the table.`,
    "",
  );

  out.section("league");
  out.push("## Premier League fixtures");
  for (const f of [...fixtures].sort((a, b) => (a.kickoff_time ?? "").localeCompare(b.kickoff_time ?? ""))) {
    out.push(`- ${ukTime(f.kickoff_time)}: ${lg.teamName(f.team_h)} v ${lg.teamName(f.team_a)}`);
  }
  out.push("");

  // Starting XI per league entry, used for the stacking section below.
  const xis = new Map<string, Player[]>();

  for (const [i, m] of matches.entries()) {
    out.section(String(i + 1));
    const sides = [m.league_entry_1, m.league_entry_2].map((id) => lg.entries.get(id)!);
    out.push(`## ${sides[0].entry_name} v ${sides[1].entry_name}`);
    out.push(`${lg.manager(sides[0])} v ${lg.manager(sides[1])}`, "");
    for (const entry of sides) {
      const current = await picksOrNull(entry.entry_id, gw);
      const picks = current ?? (await fpl.entryPicks(entry.entry_id, lastFinished));
      out.push(
        `### ${entry.entry_name} (${lg.manager(entry)})`,
        current
          ? `Line-up: gameweek ${gw} picks.`
          : `Line-up: gameweek ${gw} picks not published yet, so this is the gameweek ${lastFinished} XI and bench.`,
      );
      const xi: Player[] = [];
      for (const pick of [...picks.picks].sort((a, b) => a.position - b.position)) {
        const p = lg.player(pick.element);
        const tag = pick.position <= 11 ? "XI" : "BENCH";
        if (!p) {
          out.push(`- [${tag}] unknown player id ${pick.element}`);
          continue;
        }
        if (pick.position <= 11) xi.push(p);
        out.push(
          `- [${tag}] ${p.web_name} (${lg.teamShort(p.team)} ${lg.position(p)}) ${opponent(p)} | form ${form(p.id).join(",")} | season ${p.total_points}${news(p)}`,
        );
      }
      xis.set(entry.entry_name, xi);
      out.push("");
    }
  }

  out.section("league");
  out.push("## Stacking: starters per real fixture (3+ from one manager flagged)");
  for (const f of fixtures) {
    const inFixture = [...xis].flatMap(([team, xi]) => {
      const players = xi.filter((p) => p.team === f.team_h || p.team === f.team_a);
      return players.length ? [{ team, players }] : [];
    });
    if (inFixture.length === 0) continue;
    const label = `${lg.teamShort(f.team_h)} v ${lg.teamShort(f.team_a)}`;
    const detail = inFixture
      .map(
        ({ team, players }) =>
          `${team} ${players.length}${players.length >= 3 ? " (STACKED)" : ""}: ${players.map((p) => p.web_name).join(", ")}`,
      )
      .join("; ");
    out.push(`- ${label} — ${detail}`);
  }
  out.push("");

  out.push("## League table", ...tableText(lg.table()));
  return out.render(part);
}

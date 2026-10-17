import "server-only";

import { countedXI, loadLeague, picksOrNull, pointsByGameweek } from "@/lib/facts/league";
import { fpl } from "@/lib/fpl/client";
import type { Fixture } from "@/lib/fpl/types";

export type PlayStatus = "played" | "playing" | "to-play" | "no-fixture";

const FORM_WEEKS = 4;
// Fixture difficulty (1 easiest - 5 hardest) -> points multiplier, as in My team advice.
const DIFFICULTY_FACTOR: Record<number, number> = { 1: 1.3, 2: 1.15, 3: 1, 4: 0.85, 5: 0.7 };

/**
 * A gameweek's head-to-heads from live data: every player's points so far
 * and whether their match is done, in progress or still to come.
 */
export async function loadMatchday(entryId: number, requestedGw?: number) {
  const lg = await loadLeague();
  const gw = requestedGw ?? lg.game.current_event;
  const live = !lg.game.current_event_finished && gw === lg.game.current_event;
  const [points, fixtures, form, rated] = await Promise.all([
    live ? fpl.liveNow(gw) : fpl.live(gw),
    live ? fpl.fixturesNow(gw) : fpl.fixtures(gw),
    pointsByGameweek(gw - FORM_WEEKS, gw - 1),
    fpl.difficulty(),
  ]);

  // What a player should still add this gameweek: the My team model (60%
  // last-4 form + 40% points per game, scaled by fixture difficulty and
  // chance of playing), for the part of each match not yet played.
  const stillToCome = (playerId: number, fs: Fixture[], fullMatch = false) => {
    const p = lg.player(playerId);
    if (!p) return 0;
    const recent = form(playerId);
    const base =
      0.6 * (recent.reduce((a, b) => a + b, 0) / Math.max(1, recent.length)) + 0.4 * Number(p.points_per_game || 0);
    const availability =
      p.chance_of_playing_next_round !== null
        ? p.chance_of_playing_next_round / 100
        : p.status === "a" || p.status === "d"
          ? 1
          : 0;
    return fs.reduce((sum, f) => {
      if (!fullMatch && (f.finished || f.finished_provisional)) return sum;
      const home = f.team_h === p.team;
      const r = rated.find((x) => x.event === gw && x.team_h === f.team_h && x.team_a === f.team_a);
      const factor = DIFFICULTY_FACTOR[r ? (home ? r.team_h_difficulty : r.team_a_difficulty) : 3] ?? 1;
      const left = f.started && !fullMatch ? Math.max(0, 90 - (f.minutes ?? 0)) / 90 : availability;
      return sum + base * factor * left;
    }, 0);
  };

  const teamFixtures = (teamId: number) => fixtures.filter((f) => f.team_h === teamId || f.team_a === teamId);
  const statusOf = (fs: Fixture[]): PlayStatus => {
    if (fs.length === 0) return "no-fixture";
    if (fs.every((f) => f.finished || f.finished_provisional)) return "played";
    if (fs.some((f) => f.started && !(f.finished || f.finished_provisional))) return "playing";
    return fs.some((f) => f.started) ? "playing" : "to-play";
  };

  const side = async (leagueEntry: number) => {
    const entry = lg.entries.get(leagueEntry)!;
    const picks = await picksOrNull(entry.entry_id, gw);
    if (!picks)
      return { team: entry.entry_name, entryId: entry.entry_id, total: 0, projected: 0, original: 0, toPlay: 0, players: [] };
    const counted = countedXI(picks);
    const players = [...picks.picks]
      .sort((a, b) => a.position - b.position)
      .map((pick) => {
        const p = lg.player(pick.element);
        const fs = p ? teamFixtures(p.team) : [];
        const stats = points.elements[pick.element]?.stats;
        return {
          id: pick.element,
          name: p?.web_name ?? "?",
          club: p ? lg.teamShort(p.team) : "",
          position: p ? lg.position(p) : "",
          points: stats?.total_points ?? 0,
          minutes: stats?.minutes ?? 0,
          counts: counted.has(pick.element),
          bench: pick.position > 11,
          status: statusOf(fs),
          expected: stillToCome(pick.element, fs),
          preMatch: stillToCome(pick.element, fs, true),
          fixture: fs
            .map((f) =>
              f.started
                ? `${lg.teamShort(f.team_h)} ${f.team_h_score ?? 0}-${f.team_a_score ?? 0} ${lg.teamShort(f.team_a)}`
                : `${f.team_h === p?.team ? "v" : "at"} ${lg.teamShort(f.team_h === p?.team ? f.team_a : f.team_h)}`,
            )
            .join(" & "),
        };
      });
    const xi = players.filter((p) => p.counts);
    const total = xi.reduce((s, p) => s + p.points, 0);
    // Starters who are done with 0 minutes will be auto-subbed by FPL at the
    // end of the gameweek: count the next bench player who has (or may yet)
    // play, keeping goalkeeper for goalkeeper.
    const bench = players.filter((p) => !p.counts && p.bench);
    let extra = 0;
    for (const p of xi.filter((p) => p.status === "played" && p.minutes === 0)) {
      const i = bench.findIndex((b) => (b.position === "GKP") === (p.position === "GKP") && (b.minutes > 0 || b.expected > 0));
      if (i < 0) continue;
      const [sub] = bench.splice(i, 1);
      extra += sub.points + sub.expected;
    }
    return {
      team: entry.entry_name,
      entryId: entry.entry_id,
      total,
      // The pre-kick-off view: every counted player's full expected points.
      original: Math.round(xi.reduce((s, p) => s + p.preMatch, 0)),
      projected: Math.round(total + extra + xi.reduce((s, p) => s + p.expected, 0)),
      toPlay: xi.filter((p) => p.status === "to-play" || p.status === "playing").length,
      players,
    };
  };

  const matches = lg.league.matches.filter((m) => m.event === gw);
  const ties = await Promise.all(
    matches.map(async (m) => ({ home: await side(m.league_entry_1), away: await side(m.league_entry_2) })),
  );
  const mine = ties.find((t) => t.home.entryId === entryId || t.away.entryId === entryId);
  const flipped = mine && mine.away.entryId === entryId;

  const nextEvent = lg.bootstrap.events.data.find((e) => new Date(e.deadline_time) > new Date());
  const firstKickoff = fixtures
    .map((f) => f.kickoff_time)
    .filter((k): k is string => !!k)
    .sort()[0];

  return {
    gw,
    live,
    finished: lg.game.current_event_finished && gw === lg.game.current_event,
    me: mine ? (flipped ? mine.away : mine.home) : null,
    them: mine ? (flipped ? mine.home : mine.away) : null,
    others: ties.filter((t) => t !== mine),
    firstKickoff,
    next: nextEvent ? { gw: nextEvent.id, deadline: nextEvent.deadline_time } : null,
  };
}

export type Matchday = Awaited<ReturnType<typeof loadMatchday>>;

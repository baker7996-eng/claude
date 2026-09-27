import "server-only";

import { countedXI, loadLeague, picksOrNull } from "@/lib/facts/league";
import { fpl } from "@/lib/fpl/client";
import type { Fixture } from "@/lib/fpl/types";

export type PlayStatus = "played" | "playing" | "to-play" | "no-fixture";

/**
 * A gameweek's head-to-heads from live data: every player's points so far
 * and whether their match is done, in progress or still to come.
 */
export async function loadMatchday(entryId: number, requestedGw?: number) {
  const lg = await loadLeague();
  const gw = requestedGw ?? lg.game.current_event;
  const live = !lg.game.current_event_finished && gw === lg.game.current_event;
  const [points, fixtures] = await Promise.all([
    live ? fpl.liveNow(gw) : fpl.live(gw),
    live ? fpl.fixturesNow(gw) : fpl.fixtures(gw),
  ]);

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
    if (!picks) return { team: entry.entry_name, entryId: entry.entry_id, total: 0, toPlay: 0, players: [] };
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
    return {
      team: entry.entry_name,
      entryId: entry.entry_id,
      total: xi.reduce((s, p) => s + p.points, 0),
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

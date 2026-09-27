import "server-only";

import { loadLeague, picksOrNull } from "@/lib/facts/league";
import { fpl } from "@/lib/fpl/client";
import type { Match, Player } from "@/lib/fpl/types";

export type Outcome = "W" | "D" | "L";

/** Everything the home page shows, from live FPL data. */
export async function loadHome(entryId: number) {
  const lg = await loadLeague();
  const { game, league, bootstrap } = lg;

  const me = league.league_entries.find((e) => e.entry_id === entryId)!;
  const lastFinished = game.current_event_finished ? game.current_event : game.current_event - 1;
  const upcomingGw = game.current_event_finished ? game.next_event : game.current_event;

  const mine = (m: Match) => m.league_entry_1 === me.id || m.league_entry_2 === me.id;
  const side = (m: Match) => {
    const home = m.league_entry_1 === me.id;
    const us = home ? m.league_entry_1_points : m.league_entry_2_points;
    const them = home ? m.league_entry_2_points : m.league_entry_1_points;
    const opponentId = home ? m.league_entry_2 : m.league_entry_1;
    const outcome: Outcome = us > them ? "W" : us < them ? "L" : "D";
    return { us, them, outcome, opponent: lg.entries.get(opponentId)! };
  };

  const standing = (entryId: number) => lg.table().find((r) => r.team === lg.entries.get(entryId)?.entry_name);

  // Next head-to-head.
  const nextMatch = upcomingGw
    ? league.matches.find((m) => m.event === upcomingGw && mine(m))
    : undefined;
  const event = bootstrap.events.data.find((e) => e.id === upcomingGw);

  // Results so far, most recent last.
  const played = league.matches.filter((m) => m.finished && mine(m)).map((m) => ({ event: m.event, ...side(m) }));

  // Squads: ours and the next opponent's (latest published picks).
  const squadFor = async (entryId: number) =>
    (upcomingGw ? await picksOrNull(entryId, upcomingGw) : null) ??
    (lastFinished > 0 ? await fpl.entryPicks(entryId, lastFinished) : null);

  const next = nextMatch ? side(nextMatch) : null;
  const [myPicks, theirPicks, fixtures, lastLive, status] = await Promise.all([
    squadFor(entryId),
    next ? squadFor(next.opponent.entry_id) : null,
    upcomingGw ? fpl.fixtures(upcomingGw) : [],
    lastFinished > 0 ? fpl.live(lastFinished) : null,
    fpl.elementStatus(lg.leagueId),
  ]);

  const starters = (picks: typeof myPicks) =>
    (picks?.picks ?? [])
      .filter((pick) => pick.position <= 11)
      .map((pick) => lg.player(pick.element))
      .filter((p): p is Player => !!p);

  // The real fixture each manager has most starters in.
  const biggestStack = (xi: Player[]) => {
    let best: { label: string; players: Player[] } | null = null;
    for (const f of fixtures) {
      const players = xi.filter((p) => p.team === f.team_h || p.team === f.team_a);
      if (players.length > (best?.players.length ?? 0)) {
        best = { label: `${lg.teamShort(f.team_h)} v ${lg.teamShort(f.team_a)}`, players };
      }
    }
    return best;
  };

  const injuries = (myPicks?.picks ?? [])
    .map((pick) => ({ pick, player: lg.player(pick.element) }))
    .filter(({ player }) => player && (player.news || player.status !== "a"))
    .map(({ pick, player }) => ({
      name: player!.web_name,
      club: lg.teamShort(player!.team),
      news: shortNews(player!.news),
      starting: pick.position <= 11,
      chance: player!.chance_of_playing_next_round,
    }))
    .sort((a, b) => Number(b.starting) - Number(a.starting) || (a.chance ?? 0) - (b.chance ?? 0));

  const owners = new Map(status.element_status.map((s) => [s.element, s.owner]));
  const lastPoints = (id: number) => lastLive?.elements[id]?.stats.total_points ?? 0;
  const freeAgents = bootstrap.elements
    .filter((p) => !owners.get(p.id) && p.status === "a")
    .sort((a, b) => lastPoints(b.id) - lastPoints(a.id))
    .slice(0, 5)
    .map((p) => ({
      name: p.web_name,
      club: lg.teamShort(p.team),
      position: lg.position(p),
      points: lastPoints(p.id),
    }));

  return {
    leagueName: league.league.name,
    me: { name: me.entry_name, entryId: me.entry_id, standing: standing(me.id) },
    gw: upcomingGw,
    lastFinished,
    next: next && {
      opponent: next.opponent.entry_name,
      opponentManager: lg.manager(next.opponent),
      opponentStanding: standing(next.opponent.id),
      waivers: event?.waivers_time ?? null,
      deadline: event?.deadline_time ?? null,
      myStack: biggestStack(starters(myPicks)),
      theirStack: biggestStack(starters(theirPicks)),
    },
    last: played.at(-1) ?? null,
    form: played.slice(-5).map((p) => p.outcome),
    table: lg.table(),
    injuries,
    freeAgents,
  };
}

export type HomeData = Awaited<ReturnType<typeof loadHome>>;

// "Hamstring injury - 75% chance of playing" -> "hamstring"
function shortNews(news: string): string {
  const first = news.split(" - ")[0].replace(/ injury$/i, "");
  return first.charAt(0).toLowerCase() + first.slice(1);
}

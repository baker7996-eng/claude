import "server-only";

import { ENTRY_ID } from "@/lib/config";
import { fpl, FplError } from "@/lib/fpl/client";
import { titleCase } from "./text";
import type {
  BootstrapStatic,
  EntryEventPicks,
  EventLive,
  Fixture,
  LeagueDetails,
  LeagueEntry,
  Player,
} from "@/lib/fpl/types";

const POSITIONS: Record<number, string> = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };

export interface TableRow {
  rank: number;
  team: string;
  won: number;
  drawn: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  points: number;
}

/** Everything about the league that both the review and the preview need. */
export async function loadLeague() {
  const [game, bootstrap, { entry }] = await Promise.all([
    fpl.game(),
    fpl.bootstrap(),
    fpl.entry(ENTRY_ID),
  ]);
  const leagueId = entry.league_set[0];
  const league = await fpl.league(leagueId);
  return { game, bootstrap, league, leagueId, ...lookups(bootstrap, league) };
}

export type League = Awaited<ReturnType<typeof loadLeague>>;

function lookups(bootstrap: BootstrapStatic, league: LeagueDetails) {
  const players = new Map(bootstrap.elements.map((p) => [p.id, p]));
  const teams = new Map(bootstrap.teams.map((t) => [t.id, t]));
  const entries = new Map(league.league_entries.map((e) => [e.id, e]));

  const player = (id: number): Player | undefined => players.get(id);
  const teamShort = (id: number) => teams.get(id)?.short_name ?? `team ${id}`;
  const teamName = (id: number) => teams.get(id)?.name ?? `team ${id}`;
  const position = (p: Player) => POSITIONS[p.element_type] ?? "?";
  const manager = (e: LeagueEntry) => titleCase(`${e.player_first_name} ${e.player_last_name}`);

  const table = (): TableRow[] =>
    [...league.standings]
      .sort((a, b) => a.rank - b.rank)
      .map((s) => ({
        rank: s.rank,
        team: entries.get(s.league_entry)?.entry_name ?? "?",
        won: s.matches_won,
        drawn: s.matches_drawn,
        lost: s.matches_lost,
        pointsFor: s.points_for,
        pointsAgainst: s.points_against,
        points: s.total,
      }));

  return { player, teamShort, teamName, position, manager, entries, table };
}

/** A manager's picks for a gameweek, or null if they haven't been published yet. */
export async function picksOrNull(entryId: number, event: number) {
  try {
    return await fpl.entryPicks(entryId, event);
  } catch (err) {
    if (err instanceof FplError && err.status === 404) return null;
    throw err;
  }
}

/** The eleven players whose points actually counted, after automatic subs. */
export function countedXI(picks: EntryEventPicks): Set<number> {
  const xi = new Set(picks.picks.filter((p) => p.position <= 11).map((p) => p.element));
  for (const sub of picks.subs) {
    xi.delete(sub.element_out);
    xi.add(sub.element_in);
  }
  return xi;
}

/** Points per gameweek for every player over a range of gameweeks. */
export async function pointsByGameweek(from: number, to: number) {
  const events = [];
  for (let gw = Math.max(1, from); gw <= to; gw++) events.push(gw);
  const lives = await Promise.all(events.map((gw) => fpl.live(gw)));
  return (playerId: number) =>
    lives.map((live) => live.elements[playerId]?.stats.total_points ?? 0);
}

/** "MCI 5-3 SUN" style label for a team's fixture(s) in a gameweek. */
export function fixtureLabel(
  teamId: number,
  fixtures: Fixture[],
  teamShort: (id: number) => string,
): string {
  const mine = fixtures.filter((f) => f.team_h === teamId || f.team_a === teamId);
  if (mine.length === 0) return "no fixture";
  return mine
    .map((f) => {
      const score =
        f.team_h_score === null ? "v" : `${f.team_h_score}-${f.team_a_score}`;
      return `${teamShort(f.team_h)} ${score} ${teamShort(f.team_a)}`;
    })
    .join(" & ");
}

export type { EventLive, Fixture };

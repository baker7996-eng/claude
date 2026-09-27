import "server-only";

import { fpl } from "@/lib/fpl/client";
import type { Player, RatedFixture } from "@/lib/fpl/types";
import { loadLeague, picksOrNull, pointsByGameweek } from "@/lib/facts/league";

const HORIZON = 3; // gameweeks the projection looks ahead
const TICKER = 5; // gameweeks shown in the fixture ticker
const FORM_WEEKS = 4;
const MIN_SWAP_GAIN = 2; // projected points over the horizon
const MIN_TRADE_GAIN = 2.5;

// Fixture difficulty (1 easiest - 5 hardest) -> points multiplier.
const DIFFICULTY_FACTOR: Record<number, number> = { 1: 1.3, 2: 1.15, 3: 1, 4: 0.85, 5: 0.7 };

export interface Fixture {
  gw: number;
  opponent: string;
  home: boolean;
  difficulty: number;
}

export interface Rated {
  id: number;
  name: string;
  club: string;
  position: string;
  elementType: number;
  form: number[];
  seasonPoints: number;
  projected: number; // points over the next HORIZON gameweeks
  availability: number; // 0-1 for the next gameweek
  news: string;
  fixtures: Fixture[]; // next TICKER gameweeks (may hold 0 or 2 per gameweek)
  draftRank: number | null;
}

/**
 * Private advice for one manager: fixture outlook for their squad, free
 * agents worth swapping in, and trades worth proposing to other managers.
 * Every figure is derived from FPL data; the projection is a simple,
 * explainable model, not a prediction service.
 */
export async function loadAdvice(entryId: number) {
  const lg = await loadLeague();
  const { game, league, bootstrap } = lg;
  const me = league.league_entries.find((e) => e.entry_id === entryId)!;

  const lastFinished = game.current_event_finished ? game.current_event : game.current_event - 1;
  const firstGw = (game.current_event_finished ? game.next_event : game.current_event) ?? lastFinished + 1;

  const [form, rated, status, myPicks] = await Promise.all([
    pointsByGameweek(lastFinished - FORM_WEEKS + 1, lastFinished),
    fpl.difficulty(),
    fpl.elementStatus(lg.leagueId),
    picksOrNull(entryId, firstGw).then((p) => p ?? fpl.entryPicks(entryId, lastFinished)),
  ]);

  const fixturesFor = (teamId: number): Fixture[] =>
    rated
      .filter(
        (f): f is RatedFixture & { event: number } =>
          f.event !== null &&
          f.event >= firstGw &&
          f.event < firstGw + TICKER &&
          (f.team_h === teamId || f.team_a === teamId),
      )
      .sort((a, b) => a.event - b.event)
      .map((f) => {
        const home = f.team_h === teamId;
        return {
          gw: f.event,
          opponent: lg.teamShort(home ? f.team_a : f.team_h),
          home,
          difficulty: home ? f.team_h_difficulty : f.team_a_difficulty,
        };
      });

  const rate = (p: Player): Rated => {
    const recent = form(p.id);
    const formAvg = recent.reduce((a, b) => a + b, 0) / Math.max(1, recent.length);
    const base = 0.6 * formAvg + 0.4 * Number(p.points_per_game || 0);
    const availability =
      p.chance_of_playing_next_round !== null
        ? p.chance_of_playing_next_round / 100
        : p.status === "a" || p.status === "d"
          ? 1
          : 0;
    const fixtures = fixturesFor(p.team);
    let projected = 0;
    for (let gw = firstGw; gw < firstGw + HORIZON; gw++) {
      const factor = fixtures
        .filter((f) => f.gw === gw)
        .reduce((sum, f) => sum + (DIFFICULTY_FACTOR[f.difficulty] ?? 1), 0);
      projected += base * factor * (gw === firstGw ? availability : 1);
    }
    return {
      id: p.id,
      name: p.web_name,
      club: lg.teamShort(p.team),
      position: lg.position(p),
      elementType: p.element_type,
      form: recent,
      seasonPoints: p.total_points,
      projected: Math.round(projected * 10) / 10,
      availability,
      news: p.news,
      fixtures,
      draftRank: p.draft_rank ?? null,
    };
  };

  const owner = new Map(status.element_status.map((s) => [s.element, s.owner]));
  const byId = new Map(bootstrap.elements.map((p) => [p.id, p]));
  const ratedCache = new Map<number, Rated>();
  const ratedPlayer = (id: number) => {
    if (!ratedCache.has(id)) ratedCache.set(id, rate(byId.get(id)!));
    return ratedCache.get(id)!;
  };

  // My squad, in pick order (XI then bench).
  const squad = [...myPicks.picks]
    .sort((a, b) => a.position - b.position)
    .filter((pick) => byId.has(pick.element))
    .map((pick) => ({ ...ratedPlayer(pick.element), starting: pick.position <= 11 }));

  // Free agents: swap the weakest squad player in the same position.
  const freeAgents = bootstrap.elements
    .filter((p) => !owner.get(p.id) && p.status !== "u")
    .map((p) => ratedPlayer(p.id));
  const usedDrops = new Map<number, number>();
  const swaps = freeAgents
    .map((add) => {
      const drop = squad
        .filter((p) => p.elementType === add.elementType)
        .sort((a, b) => a.projected - b.projected)[0];
      return drop ? { add, drop, gain: Math.round((add.projected - drop.projected) * 10) / 10 } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null && s.gain >= MIN_SWAP_GAIN)
    .sort((a, b) => b.gain - a.gain)
    .filter((s) => {
      const n = usedDrops.get(s.drop.id) ?? 0;
      usedDrops.set(s.drop.id, n + 1);
      return n < 2; // at most two suggestions per player to drop
    })
    .slice(0, 6);

  // Trades: their player is projected higher over the next few gameweeks
  // (form and fixtures), while ours has as many season points, so the offer
  // looks fair to them: sell reputation, buy form.
  const theirSquads = new Map<number, Rated[]>();
  for (const [element, ownerId] of owner) {
    if (!ownerId || ownerId === entryId || !byId.has(element)) continue;
    theirSquads.set(ownerId, [...(theirSquads.get(ownerId) ?? []), ratedPlayer(element)]);
  }
  const managerName = new Map(league.league_entries.map((e) => [e.entry_id, e]));
  const trades = [...theirSquads].flatMap(([ownerId, theirs]) =>
    squad.flatMap((give) =>
      theirs
        .filter((get) => get.elementType === give.elementType)
        .map((get) => {
          const gain = get.projected - give.projected;
          // Even on paper (season points) and actually available: nobody accepts
          // an injured player or one with half the points.
          const looksFair =
            give.seasonPoints >= get.seasonPoints * 0.9 && give.availability >= 0.75;
          const theirWeakest = theirs
            .filter((p) => p.elementType === give.elementType && p.id !== get.id)
            .sort((a, b) => a.projected - b.projected)[0];
          const fillsGap = !theirWeakest || give.projected > theirWeakest.projected;
          const entry = managerName.get(ownerId)!;
          return {
            give,
            get,
            gain: Math.round(gain * 10) / 10,
            looksFair,
            fillsGap,
            team: entry.entry_name,
            manager: lg.manager(entry).split(" ")[0],
            score: gain + (looksFair ? 2 : 0) + (fillsGap ? 1 : 0),
          };
        })
        .filter((t) => t.gain >= MIN_TRADE_GAIN && t.looksFair),
    ),
  );
  const perManager = new Map<string, number>();
  const usedPlayers = new Set<number>();
  const tradeIdeas = trades
    .sort((a, b) => b.score - a.score)
    .filter((t) => {
      if (usedPlayers.has(t.give.id) || usedPlayers.has(t.get.id)) return false;
      if ((perManager.get(t.team) ?? 0) >= 2) return false;
      usedPlayers.add(t.give.id).add(t.get.id);
      perManager.set(t.team, (perManager.get(t.team) ?? 0) + 1);
      return true;
    })
    .slice(0, 5);

  // Next few head-to-heads.
  const table = lg.table();
  const upcoming = league.matches
    .filter((m) => m.event >= firstGw && (m.league_entry_1 === me.id || m.league_entry_2 === me.id))
    .sort((a, b) => a.event - b.event)
    .slice(0, 3)
    .map((m) => {
      const opp = lg.entries.get(m.league_entry_1 === me.id ? m.league_entry_2 : m.league_entry_1)!;
      return { gw: m.event, opponent: opp.entry_name, standing: table.find((r) => r.team === opp.entry_name) };
    });

  return {
    teamName: me.entry_name,
    firstGw,
    lastFinished,
    horizon: HORIZON,
    tickerGws: Array.from({ length: TICKER }, (_, i) => firstGw + i),
    squad,
    swaps,
    trades: tradeIdeas,
    upcoming,
    waivers: bootstrap.events.data.find((e) => e.id === firstGw)?.waivers_time ?? null,
  };
}

export type Advice = Awaited<ReturnType<typeof loadAdvice>>;

import "server-only";

import type { Mood } from "@/components/face";
import { countedXI, type League } from "@/lib/facts/league";
import { fpl } from "@/lib/fpl/client";
import type { Match } from "@/lib/fpl/types";

export interface Result {
  gw: number;
  us: number;
  them: number;
  opponentId: number; // league_entry id
  outcome: "W" | "D" | "L";
}

/** Every finished (or live) result from one league entry's point of view. */
export function resultsFor(league: League["league"], entryId: number, includeLive = false): Result[] {
  return league.matches
    .filter((m) => (m.finished || (includeLive && m.league_entry_1_points + m.league_entry_2_points > 0)))
    .filter((m) => m.league_entry_1 === entryId || m.league_entry_2 === entryId)
    .map((m) => fromSide(m, entryId))
    .sort((a, b) => a.gw - b.gw);
}

function fromSide(m: Match, entryId: number): Result {
  const home = m.league_entry_1 === entryId;
  const us = home ? m.league_entry_1_points : m.league_entry_2_points;
  const them = home ? m.league_entry_2_points : m.league_entry_1_points;
  return {
    gw: m.event,
    us,
    them,
    opponentId: home ? m.league_entry_2 : m.league_entry_1,
    outcome: us > them ? "W" : us < them ? "L" : "D",
  };
}

const outcomeMood = { W: "happy", D: "neutral", L: "sad" } as const;

/**
 * Each manager's two moods: league (1st happy, 5th-6th sad, else neutral) and
 * match (current live score while a gameweek is in play, else last result).
 */
export function moods(lg: League) {
  const table = lg.table();
  const liveGw = lg.game.current_event_finished ? null : lg.game.current_event;
  return lg.league.league_entries.map((e) => {
    const row = table.find((r) => r.team === e.entry_name)!;
    const leagueMood: Mood = row.rank === 1 ? "happy" : row.rank >= 5 ? "sad" : "neutral";
    const live = liveGw
      ? lg.league.matches.find(
          (m) => m.event === liveGw && (m.league_entry_1 === e.id || m.league_entry_2 === e.id),
        )
      : undefined;
    const last = live ? fromSide(live, e.id) : resultsFor(lg.league, e.id).at(-1);
    return {
      entryId: e.entry_id,
      leagueEntry: e.id,
      team: e.entry_name,
      manager: lg.manager(e),
      rank: row.rank,
      leagueMood,
      match: last && {
        ...last,
        live: Boolean(live),
        opponent: lg.entries.get(last.opponentId)?.entry_name ?? "?",
        mood: outcomeMood[last.outcome] as Mood,
      },
    };
  });
}

/** Everyone's head-to-head record against everyone else. */
export function rivalries(lg: League) {
  const entries = lg.league.league_entries;
  const pairs = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      const games = resultsFor(lg.league, a.id).filter((r) => r.opponentId === b.id);
      if (games.length === 0) continue;
      const aWins = games.filter((g) => g.outcome === "W").length;
      const bWins = games.filter((g) => g.outcome === "L").length;
      pairs.push({
        slug: `${a.entry_id}-${b.entry_id}`,
        a: { id: a.id, entryId: a.entry_id, team: a.entry_name, manager: lg.manager(a) },
        b: { id: b.id, entryId: b.entry_id, team: b.entry_name, manager: lg.manager(b) },
        games,
        aWins,
        bWins,
        draws: games.length - aWins - bWins,
        aPoints: games.reduce((s, g) => s + g.us, 0),
        bPoints: games.reduce((s, g) => s + g.them, 0),
        // Grudge score: close games and a level record make a proper rivalry.
        grudge:
          games.filter((g) => Math.abs(g.us - g.them) <= 5).length * 2 +
          (games.length - Math.abs(aWins - bWins)),
      });
    }
  }
  return pairs;
}

export interface GameweekAwards {
  gw: number;
  benchWaste: { team: string; points: number; players: string[] } | null;
  ghosts: { team: string; players: string[] }[]; // starters with 0 minutes, not subbed
  biggestWin: { winner: string; loser: string; score: [number, number]; margin: number } | null;
  narrowestDefeat: { winner: string; loser: string; score: [number, number]; margin: number } | null;
}

/**
 * Weekly awards for every finished gameweek, plus the Saliba Award: the
 * longest run of gameweeks a manager has kept the same player who hasn't
 * played a minute.
 */
export async function awards(lg: League) {
  const finished = [...new Set(lg.league.matches.filter((m) => m.finished).map((m) => m.event))]
    .filter((gw) => lg.league.matches.filter((m) => m.event === gw).every((m) => m.finished))
    .sort((a, b) => a - b);
  const entries = lg.league.league_entries;
  const name = (id: number) => lg.player(id)?.web_name ?? "?";

  const weeks = await Promise.all(
    finished.map(async (gw) => {
      const [live, picks] = await Promise.all([
        fpl.finishedLive(gw),
        Promise.all(entries.map((e) => fpl.finishedPicks(e.entry_id, gw).catch(() => null))),
      ]);
      return { gw, live, picks };
    }),
  );

  const minutes = (live: (typeof weeks)[number]["live"], id: number) => live.elements[id]?.stats.minutes ?? 0;
  const points = (live: (typeof weeks)[number]["live"], id: number) => live.elements[id]?.stats.total_points ?? 0;

  const perGameweek: GameweekAwards[] = weeks.map(({ gw, live, picks }) => {
    let benchWaste: GameweekAwards["benchWaste"] = null;
    const ghosts: GameweekAwards["ghosts"] = [];
    entries.forEach((e, i) => {
      const p = picks[i];
      if (!p) return;
      const counted = countedXI(p);
      const bench = p.picks.filter((x) => x.position > 11 && !counted.has(x.element));
      const wasted = bench.reduce((s, x) => s + points(live, x.element), 0);
      if (wasted > 0 && (!benchWaste || wasted > benchWaste.points)) {
        benchWaste = {
          team: e.entry_name,
          points: wasted,
          players: bench.filter((x) => points(live, x.element) > 0).map((x) => `${name(x.element)} ${points(live, x.element)}`),
        };
      }
      const noShows = p.picks
        .filter((x) => x.position <= 11 && minutes(live, x.element) === 0)
        .map((x) => name(x.element));
      if (noShows.length) ghosts.push({ team: e.entry_name, players: noShows });
    });

    const results = lg.league.matches
      .filter((m) => m.event === gw)
      .map((m) => {
        const aWon = m.league_entry_1_points >= m.league_entry_2_points;
        return {
          winner: lg.entries.get(aWon ? m.league_entry_1 : m.league_entry_2)!.entry_name,
          loser: lg.entries.get(aWon ? m.league_entry_2 : m.league_entry_1)!.entry_name,
          score: (aWon
            ? [m.league_entry_1_points, m.league_entry_2_points]
            : [m.league_entry_2_points, m.league_entry_1_points]) as [number, number],
          margin: Math.abs(m.league_entry_1_points - m.league_entry_2_points),
        };
      })
      .filter((r) => r.margin > 0);
    const byMargin = [...results].sort((a, b) => b.margin - a.margin);
    return {
      gw,
      benchWaste,
      ghosts,
      biggestWin: byMargin[0] ?? null,
      narrowestDefeat: byMargin.at(-1) ?? null,
    };
  });

  // Saliba Award: longest current run of consecutive gameweeks a manager has
  // held one currently-injured player who played 0 minutes in each of them.
  let saliba: { team: string; player: string; gameweeks: number } | null = null;
  entries.forEach((e, i) => {
    const streaks = new Map<number, number>();
    for (const { live, picks } of weeks) {
      const p = picks[i];
      if (!p) continue;
      const held = new Set(p.picks.map((x) => x.element));
      for (const id of [...streaks.keys()]) if (!held.has(id)) streaks.delete(id);
      for (const id of held) {
        streaks.set(id, minutes(live, id) === 0 ? (streaks.get(id) ?? 0) + 1 : 0);
      }
    }
    for (const [id, run] of streaks) {
      // Only players FPL lists as injured/suspended/unavailable: an unused
      // backup goalkeeper also plays 0 minutes, but isn't the joke.
      if (lg.player(id)?.status === "a") continue;
      if (run >= 2 && (!saliba || run > saliba.gameweeks)) {
        saliba = { team: e.entry_name, player: name(id), gameweeks: run };
      }
    }
  });

  // Season records.
  const allScores = lg.league.matches
    .filter((m) => m.finished)
    .flatMap((m) => [
      { team: lg.entries.get(m.league_entry_1)!.entry_name, score: m.league_entry_1_points, gw: m.event },
      { team: lg.entries.get(m.league_entry_2)!.entry_name, score: m.league_entry_2_points, gw: m.event },
    ]);
  const highest = [...allScores].sort((a, b) => b.score - a.score)[0] ?? null;
  const lowest = [...allScores].sort((a, b) => a.score - b.score)[0] ?? null;
  const biggestEver = perGameweek
    .map((w) => w.biggestWin && { ...w.biggestWin, gw: w.gw })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.margin - a.margin)[0] ?? null;
  const worstBench = perGameweek
    .map((w) => w.benchWaste && { ...w.benchWaste, gw: w.gw })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.points - a.points)[0] ?? null;

  return {
    weeks: perGameweek.reverse(),
    saliba: saliba as { team: string; player: string; gameweeks: number } | null,
    records: { highest, lowest, biggestEver, worstBench },
  };
}

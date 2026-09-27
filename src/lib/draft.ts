import "server-only";

import { loadLeague, picksOrNull } from "@/lib/facts/league";
import { fpl } from "@/lib/fpl/client";
import type { Player } from "@/lib/fpl/types";

export const DRAFT_GW = 22; // second draft: 21 January 2027, before gameweek 22
const FIXTURE_WINDOW = 5;
const DIFFICULTY_FACTOR: Record<number, number> = { 1: 1.3, 2: 1.15, 3: 1, 4: 0.85, 5: 0.7 };
const SQUAD_SHAPE: Record<number, number> = { 1: 2, 2: 5, 3: 5, 4: 3 }; // GKP, DEF, MID, FWD

export interface DraftPlayer {
  id: number;
  name: string;
  club: string;
  position: string;
  elementType: number;
  score: number; // expected points per gameweek after the draft
  ppg: number;
  form: number;
  minutesShare: number; // 0-1 of available minutes played
  fixtures: string; // e.g. "BRE(H) LIV(a) ..."
  news: string;
  owner: string | null; // current team, or null if a free agent
  mine: boolean;
}

/**
 * Draft board for the mid-season redraft: every player ranked on points per
 * game and form, discounted for missed minutes, and scaled by fixture
 * difficulty for the five gameweeks after the draft.
 */
export async function loadDraft(entryId: number) {
  const lg = await loadLeague();
  const played = lg.game.current_event_finished ? lg.game.current_event : lg.game.current_event - 1;
  const [rated, status] = await Promise.all([fpl.difficulty(), fpl.elementStatus(lg.leagueId)]);
  const owner = new Map(status.element_status.map((s) => [s.element, s.owner]));
  const teamName = new Map(lg.league.league_entries.map((e) => [e.entry_id, e.entry_name]));

  const window = (teamId: number) =>
    rated
      .filter((f) => f.event !== null && f.event >= DRAFT_GW && f.event < DRAFT_GW + FIXTURE_WINDOW)
      .filter((f) => f.team_h === teamId || f.team_a === teamId)
      .sort((a, b) => (a.event ?? 0) - (b.event ?? 0));

  const board: DraftPlayer[] = lg.bootstrap.elements
    .filter((p) => p.status !== "u")
    .map((p: Player) => {
      const fs = window(p.team);
      const factor = fs.length
        ? fs.reduce((s, f) => s + (DIFFICULTY_FACTOR[f.team_h === p.team ? f.team_h_difficulty : f.team_a_difficulty] ?? 1), 0) / FIXTURE_WINDOW
        : 1;
      const ppg = Number(p.points_per_game) || 0;
      const form = Number(p.form) || 0;
      const minutesShare = played > 0 ? Math.min(1, p.minutes / (90 * played)) : 0;
      // Regular starters keep most of their value; bit-part players lose it.
      const score = (0.6 * ppg + 0.4 * form) * (0.5 + 0.5 * minutesShare) * factor;
      const ownerId = owner.get(p.id) ?? null;
      return {
        id: p.id,
        name: p.web_name,
        club: lg.teamShort(p.team),
        position: lg.position(p),
        elementType: p.element_type,
        score: Math.round(score * 10) / 10,
        ppg,
        form,
        minutesShare,
        fixtures: fs
          .map((f) => {
            const home = f.team_h === p.team;
            const opp = lg.teamShort(home ? f.team_a : f.team_h);
            return home ? opp : opp.toLowerCase();
          })
          .join(" "),
        news: p.news,
        owner: ownerId ? (teamName.get(ownerId) ?? null) : null,
        mine: ownerId === entryId,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Squad needs: how my current players rank against everyone else's squads,
  // position by position. The weakest positions come first.
  const picks = (await picksOrNull(entryId, lg.game.current_event)) ?? null;
  const mySquad = board.filter((p) => p.mine);
  const leagueSquads = new Map<string, DraftPlayer[]>();
  for (const p of board) if (p.owner) leagueSquads.set(p.owner, [...(leagueSquads.get(p.owner) ?? []), p]);
  const positionStrength = (squad: DraftPlayer[], type: number) =>
    squad
      .filter((p) => p.elementType === type)
      .sort((a, b) => b.score - a.score)
      .slice(0, SQUAD_SHAPE[type])
      .reduce((s, p) => s + p.score, 0);

  const needs = [1, 2, 3, 4]
    .map((type) => {
      const mine = positionStrength(mySquad, type);
      const all = [...leagueSquads.values()].map((sq) => positionStrength(sq, type)).sort((a, b) => b - a);
      const rank = all.findIndex((v) => v <= mine) + 1 || all.length;
      const label = { 1: "Goalkeepers", 2: "Defenders", 3: "Midfielders", 4: "Forwards" }[type]!;
      return {
        type,
        label,
        rank,
        of: all.length,
        targets: board.filter((p) => p.elementType === type && !p.mine).slice(0, 5),
      };
    })
    .sort((a, b) => b.rank - a.rank);

  return { board, needs, draftGw: DRAFT_GW, window: FIXTURE_WINDOW, hasPicks: Boolean(picks) };
}

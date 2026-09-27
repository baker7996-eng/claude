// Shapes of the (unofficial) FPL Draft API responses we use.
// Only the fields the app reads are typed; the API returns more.

export interface Game {
  current_event: number;
  current_event_finished: boolean;
  next_event: number | null;
  waivers_processed: boolean;
}

export interface Team {
  id: number;
  name: string;
  short_name: string;
}

export interface ElementType {
  id: number; // 1 GKP, 2 DEF, 3 MID, 4 FWD
  singular_name_short: string;
}

export interface Player {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team: number;
  element_type: number;
  status: string; // "a" available, "d" doubtful, "i" injured, "s" suspended, "u" unavailable
  news: string;
  chance_of_playing_next_round: number | null;
  total_points: number;
  event_points: number;
  form: string;
  points_per_game: string;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  expected_goals?: string;
  expected_assists?: string;
}

export interface Event {
  id: number;
  name: string;
  deadline_time: string;
  finished: boolean;
}

export interface BootstrapStatic {
  elements: Player[];
  teams: Team[];
  element_types: ElementType[];
  events: { current: number; next: number | null; data: Event[] };
}

export interface EntryPublic {
  entry: {
    id: number;
    name: string;
    player_first_name: string;
    player_last_name: string;
    league_set: number[];
    overall_points?: number;
  };
}

export interface LeagueEntry {
  id: number; // league-entry id (used in standings/matches)
  entry_id: number; // team id (used in /entry/{id} URLs)
  entry_name: string;
  player_first_name: string;
  player_last_name: string;
}

export interface Standing {
  league_entry: number;
  rank: number;
  last_rank: number | null;
  total: number; // league points (3 per win, 1 per draw)
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  points_for: number;
  points_against: number;
}

export interface Match {
  event: number;
  finished: boolean;
  league_entry_1: number;
  league_entry_1_points: number;
  league_entry_2: number;
  league_entry_2_points: number;
}

export interface LeagueDetails {
  league: { id: number; name: string; scoring: "h" | "c" }; // h = head-to-head, c = classic
  league_entries: LeagueEntry[];
  standings: Standing[];
  matches: Match[];
}

export interface ElementStatus {
  element_status: {
    element: number;
    owner: number | null; // entry_id of the owning team, null if a free agent
    status: string;
  }[];
}

export interface EntryEventPicks {
  picks: {
    element: number;
    position: number; // 1-11 starting, 12-15 bench
    is_captain: boolean;
    multiplier: number;
  }[];
  subs: { element_in: number; element_out: number; event: number }[];
}

export interface Fixture {
  id: number;
  event: number;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  kickoff_time: string | null;
  started: boolean;
  finished: boolean;
}

export interface LiveStats {
  total_points: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
}

export interface EventLive {
  elements: Record<string, { stats: LiveStats }>;
}

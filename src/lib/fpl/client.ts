import "server-only";

import type {
  BootstrapStatic,
  ElementStatus,
  EntryEventPicks,
  EntryPublic,
  EventLive,
  Fixture,
  Game,
  LeagueDetails,
  RatedFixture,
} from "./types";

// All FPL requests run on our server, never in the browser: the FPL site
// doesn't allow cross-origin requests, and this lets us cache responses.
const BASE_URL = "https://draft.premierleague.com/api";
const CLASSIC_URL = "https://fantasy.premierleague.com/api";

// Seconds to reuse a cached response before fetching fresh data.
const REVALIDATE_SECONDS = 300;

export class FplError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "FplError";
  }
}

async function get<T>(path: string, base = BASE_URL): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
  } catch (err) {
    throw new FplError(
      `Could not reach the FPL Draft API (${(err as Error).message})`,
      path,
    );
  }
  if (!res.ok) {
    throw new FplError(`FPL Draft API returned ${res.status}`, path, res.status);
  }
  return res.json() as Promise<T>;
}

export const fpl = {
  game: () => get<Game>("/game"),
  bootstrap: () => get<BootstrapStatic>("/bootstrap-static"),
  entry: (entryId: number) => get<EntryPublic>(`/entry/${entryId}/public`),
  entryPicks: (entryId: number, event: number) =>
    get<EntryEventPicks>(`/entry/${entryId}/event/${event}`),
  league: (leagueId: number) =>
    get<LeagueDetails>(`/league/${leagueId}/details`),
  elementStatus: (leagueId: number) =>
    get<ElementStatus>(`/league/${leagueId}/element-status`),
  live: (event: number) => get<EventLive>(`/event/${event}/live`),
  fixtures: (event: number) => get<Fixture[]>(`/event/${event}/fixtures`),
  // The main FPL game rates each fixture's difficulty (1 easy - 5 hard);
  // Draft doesn't. Team ids are the same in both games.
  difficulty: () => get<RatedFixture[]>("/fixtures/", CLASSIC_URL),
};

import { ENTRY_ID } from "@/lib/config";
import { fpl, FplError } from "@/lib/fpl/client";

// Always render on request so the page shows current FPL data
// (individual API responses are still cached for a few minutes).
export const dynamic = "force-dynamic";

async function loadOverview() {
  const [game, { entry }] = await Promise.all([
    fpl.game(),
    fpl.entry(ENTRY_ID),
  ]);
  const leagueId = entry.league_set[0];
  const league = leagueId ? await fpl.league(leagueId) : null;
  return { game, entry, league };
}

export default async function Home() {
  const data = await loadOverview().catch((err) => {
    if (err instanceof FplError) return err;
    throw err;
  });
  if (data instanceof FplError) return <FplErrorPanel error={data} />;
  const { game, entry, league } = data;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-black/10 p-5 dark:border-white/15">
        <p className="text-sm opacity-70">Your team</p>
        <h2 className="text-xl font-semibold">{entry.name}</h2>
        <p className="text-sm opacity-70">
          {entry.player_first_name} {entry.player_last_name}
        </p>
      </section>

      <section className="rounded-xl border border-black/10 p-5 dark:border-white/15">
        <p className="text-sm opacity-70">League</p>
        <h2 className="text-xl font-semibold">
          {league?.league.name ?? "No league found"}
        </h2>
        {league && (
          <p className="text-sm opacity-70">
            {league.league_entries.length} teams ·{" "}
            {league.league.scoring === "h" ? "Head-to-head" : "Classic"}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-black/10 p-5 dark:border-white/15">
        <p className="text-sm opacity-70">Gameweek</p>
        <h2 className="text-xl font-semibold">GW {game.current_event}</h2>
        <p className="text-sm opacity-70">
          {game.current_event_finished ? "Finished" : "In progress"}
        </p>
      </section>

      <section className="rounded-xl border border-black/10 p-5 dark:border-white/15">
        <p className="text-sm opacity-70">Fact sheets</p>
        <ul className="mt-2 space-y-2">
          <li>
            <a className="font-semibold underline" href="/facts/review">
              Latest gameweek review
            </a>
          </li>
          {game.next_event && (
            <li>
              <a className="font-semibold underline" href="/facts/preview">
                Gameweek {game.next_event} preview
              </a>
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

function FplErrorPanel({ error }: { error: FplError }) {
  return (
    <section className="rounded-xl border border-red-500/40 bg-red-500/5 p-5">
      <h2 className="font-semibold">Couldn&apos;t load FPL data</h2>
      <p className="mt-1 text-sm">{error.message}</p>
      <p className="mt-1 text-sm opacity-70">Request: {error.path}</p>
    </section>
  );
}

import { Panel } from "@/components/ui";
import { ENTRY_ID } from "@/lib/config";
import { loadLeague } from "@/lib/facts/league";

export const dynamic = "force-dynamic";

export default async function LeaguePage() {
  const lg = await loadLeague();
  const myName = lg.league.league_entries.find((e) => e.entry_id === ENTRY_ID)?.entry_name;
  const name = (id: number) => lg.entries.get(id)?.entry_name ?? "?";

  const finished = lg.league.matches.filter((m) => m.finished);
  const gameweeks = [...new Set(finished.map((m) => m.event))].sort((a, b) => b - a);

  return (
    <div className="grid items-start gap-3 md:gap-4 lg:grid-cols-5">
      <Panel title="Table" className="lg:col-span-3">
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[22rem] tabular-nums">
            <thead className="display text-xs tracking-[0.1em] text-soft">
              <tr>
                <th className="py-2 text-left font-semibold">#</th>
                <th className="py-2 text-left font-semibold">Team</th>
                {["W", "D", "L", "PF", "PA", "Pts"].map((h) => (
                  <th key={h} className="py-2 text-right font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line border-t border-line">
              {lg.table().map((r) => (
                <tr key={r.team} className={r.team === myName ? "text-lime" : ""}>
                  <td className="display w-6 py-2.5 text-base text-soft">{r.rank}</td>
                  <td className="py-2.5 pr-2">{r.team}</td>
                  <td className="py-2.5 text-right">{r.won}</td>
                  <td className="py-2.5 text-right">{r.drawn}</td>
                  <td className="py-2.5 text-right">{r.lost}</td>
                  <td className="py-2.5 text-right text-soft">{r.pointsFor}</td>
                  <td className="py-2.5 text-right text-soft">{r.pointsAgainst}</td>
                  <td className="display py-2.5 text-right text-lg">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Results" className="lg:col-span-2">
        {gameweeks.length === 0 && <p className="text-sm text-soft">No results yet.</p>}
        <div className="space-y-4">
          {gameweeks.map((gw) => (
            <div key={gw}>
              <p className="display mb-1 text-sm tracking-[0.12em] text-lime">Gameweek {gw}</p>
              <ul className="divide-y divide-line">
                {finished
                  .filter((m) => m.event === gw)
                  .map((m) => {
                    const a = name(m.league_entry_1);
                    const b = name(m.league_entry_2);
                    return (
                      <li key={`${a}-${b}`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2 text-sm">
                        <span className={`truncate ${a === myName ? "text-lime" : ""}`}>{a}</span>
                        <span className="display text-lg tabular-nums">
                          {m.league_entry_1_points}–{m.league_entry_2_points}
                        </span>
                        <span className={`truncate text-right ${b === myName ? "text-lime" : ""}`}>{b}</span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

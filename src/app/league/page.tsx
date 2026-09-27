import { Face } from "@/components/face";
import { Panel } from "@/components/ui";
import { moods } from "@/lib/league-stats";
import type { League } from "@/lib/facts/league";
import { redirect } from "next/navigation";
import { viewer } from "@/lib/auth";
import { loadLeague } from "@/lib/facts/league";

export const dynamic = "force-dynamic";

export default async function LeaguePage() {
  const me = await viewer();
  if (!me) redirect("/login?next=/league");
  const lg = await loadLeague();
  const myName = lg.league.league_entries.find((e) => e.entry_id === me.entryId)?.entry_name;
  const name = (id: number) => lg.entries.get(id)?.entry_name ?? "?";

  const finished = lg.league.matches.filter((m) => m.finished);
  const gameweeks = [...new Set(finished.map((m) => m.event))].sort((a, b) => b - a);

  const mood = new Map(moods(lg).map((m) => [m.team, m]));

  return (
    <div className="grid items-start gap-3 md:gap-4 lg:grid-cols-5">
      <MoodBoard lg={lg} myName={myName} />
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
                  <td className="py-2.5 pr-2">
                    <span className="flex items-center gap-2">
                      <Face seed={mood.get(r.team)?.entryId ?? 0} mood={mood.get(r.team)?.leagueMood ?? "neutral"} size={30} label={`${r.team}: ${mood.get(r.team)?.leagueMood}`} />
                      {r.team}
                    </span>
                  </td>
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

const MATCH_WORDS = { W: "Winning", D: "Drawing", L: "Losing" } as const;
const PAST_WORDS = { W: "Won", D: "Drew", L: "Lost" } as const;

/** Every manager's face, feeling their league position and latest match. */
function MoodBoard({ lg, myName }: { lg: League; myName?: string }) {
  const all = moods(lg).sort((a, b) => a.rank - b.rank);
  return (
    <Panel title="Mood board" className="lg:col-span-5">
      <p className="mb-3 text-xs text-soft">
        Big face: how their match is going. Little face: how they feel about the table.
      </p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {all.map((m) => (
          <li
            key={m.team}
            className={`relative flex flex-col items-center rounded-md border px-2 py-3 text-center ${
              m.team === myName ? "border-lime/60" : "border-line"
            }`}
          >
            <div className="relative">
              <Face seed={m.entryId} mood={m.match?.mood ?? m.leagueMood} size={72} label={`${m.manager}, ${m.match?.mood ?? m.leagueMood}`} />
              <span className="absolute -right-3 -bottom-1 rounded-full border border-line bg-panel p-0.5">
                <Face seed={m.entryId} mood={m.leagueMood} size={26} label={`${m.rank} in the table`} />
              </span>
            </div>
            <p className="display mt-2 text-base">{m.team}</p>
            <p className="text-xs text-soft">
              {m.rank === 1 ? "Top of the league" : `${m.rank}${["st", "nd", "rd"][m.rank - 1] ?? "th"} in the table`}
            </p>
            {m.match && (
              <p className="mt-1 text-xs">
                {(m.match.live ? MATCH_WORDS : PAST_WORDS)[m.match.outcome]}{" "}
                <span className="display text-sm">{m.match.us}–{m.match.them}</span>
                <span className="block text-soft">
                  v {m.match.opponent} · GW{m.match.gw}
                  {m.match.live && <span className="ml-1 text-lime">LIVE</span>}
                </span>
              </p>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

import Link from "next/link";
import { Chip, Panel } from "@/components/ui";
import { loadLeague } from "@/lib/facts/league";
import { listWriteups, predictionRecord, scoredPredictions, type Verdict } from "@/lib/writeups";

export const dynamic = "force-dynamic";

export default async function WriteupsPage() {
  const writeups = listWriteups();
  const lg = await loadLeague();
  const scored = scoredPredictions(lg.league);
  const { hits, misses } = predictionRecord(scored);

  return (
    <div className="grid items-start gap-3 md:gap-4 lg:grid-cols-5">
      <Panel title="Write-ups" className="lg:col-span-3">
        <p className="mb-2 text-xs text-soft">
          Previews land the day before the deadline, reviews once FPL confirms the gameweek.
        </p>
        {writeups.length === 0 ? (
          <p className="py-2 text-sm text-soft">Nothing written yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {writeups.map((w) => (
              <li key={w.slug}>
                <Link href={`/writeups/${w.slug}`} className="group flex items-center justify-between gap-3 py-3">
                  <span>
                    <span className="display block text-xs tracking-[0.14em] text-lime">
                      GW {w.gw} · {w.kind}
                    </span>
                    <span className="group-hover:underline">{w.title.replace(/^Gameweek \d+\s*—\s*/, "")}</span>
                  </span>
                  <span className="text-soft">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Prediction record" className="lg:col-span-2">
        <p className="mb-3 text-sm text-soft">
          Right winner: <span className="display text-lg text-lime">{hits}</span> hits,{" "}
          <span className="display text-lg text-loss">{misses}</span> misses
        </p>
        <div className="space-y-4">
          {scored.map((g) => (
            <div key={g.gw}>
              <p className="display mb-1 text-sm tracking-[0.12em] text-lime">Gameweek {g.gw}</p>
              <ul className="divide-y divide-line text-sm">
                {g.ties.map((t) => (
                  <li key={t.teams.join()} className="flex items-center justify-between gap-2 py-2">
                    <span className="min-w-0">
                      <span className="block truncate">{t.teams.join(" v ")}</span>
                      <span className="text-xs text-soft">
                        Said {t.predicted.join("–")}
                        {t.actual && ` · was ${t.actual.join("–")}`}
                      </span>
                    </span>
                    <VerdictChip verdict={t.verdict} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function VerdictChip({ verdict }: { verdict: Verdict }) {
  if (verdict === "hit") return <Chip tone="lime">HIT</Chip>;
  if (verdict === "miss") return <Chip tone="loss">MISS</Chip>;
  return <Chip tone="amber">TBC</Chip>;
}

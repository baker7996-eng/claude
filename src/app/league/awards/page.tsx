import { redirect } from "next/navigation";
import { Chip, Panel } from "@/components/ui";
import { viewer } from "@/lib/auth";
import { loadLeague } from "@/lib/facts/league";
import { awards } from "@/lib/league-stats";

export const dynamic = "force-dynamic";

export default async function AwardsPage() {
  const me = await viewer();
  if (!me) redirect("/login?next=/league/awards");
  const lg = await loadLeague();
  const { weeks, saliba, records } = await awards(lg);

  return (
    <div className="grid items-start gap-3 md:gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-3 md:gap-4">
        <Panel title="The Saliba Award">
          <p className="mb-2 text-xs text-soft">
            Longest run holding an injured player who hasn&apos;t played a minute.
          </p>
          {saliba ? (
            <p>
              <span className="display text-2xl text-loss">{saliba.team}</span>
              <span className="block text-sm">
                {saliba.player}: <span className="display text-lg">{saliba.gameweeks}</span> gameweeks and counting
              </span>
            </p>
          ) : (
            <p className="text-sm text-soft">Nobody&apos;s hoarding the injured. Suspicious.</p>
          )}
        </Panel>

        <Panel title="Season records">
          <ul className="divide-y divide-line text-sm">
            {records.highest && (
              <Record label="Highest score" value={records.highest.score} who={`${records.highest.team}, GW${records.highest.gw}`} tone="lime" />
            )}
            {records.lowest && (
              <Record label="Lowest score" value={records.lowest.score} who={`${records.lowest.team}, GW${records.lowest.gw}`} tone="loss" />
            )}
            {records.biggestEver && (
              <Record
                label="Biggest win"
                value={records.biggestEver.margin}
                who={`${records.biggestEver.winner} ${records.biggestEver.score.join("–")} ${records.biggestEver.loser}, GW${records.biggestEver.gw}`}
                tone="lime"
              />
            )}
            {records.worstBench && (
              <Record
                label="Most points benched"
                value={records.worstBench.points}
                who={`${records.worstBench.team}, GW${records.worstBench.gw}`}
                tone="amber"
              />
            )}
          </ul>
        </Panel>
      </div>

      <div className="flex flex-col gap-3 md:gap-4 lg:col-span-2">
        {weeks.map((w) => (
          <Panel key={w.gw} title={`Gameweek ${w.gw}`}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {w.biggestWin && (
                <Award emoji="🔨" title="Biggest win">
                  {w.biggestWin.winner} {w.biggestWin.score.join("–")} {w.biggestWin.loser}{" "}
                  <span className="text-soft">(by {w.biggestWin.margin})</span>
                </Award>
              )}
              {w.narrowestDefeat && (
                <Award emoji="😬" title="Narrowest defeat">
                  {w.narrowestDefeat.loser}, beaten {w.narrowestDefeat.score.join("–")} by {w.narrowestDefeat.winner}{" "}
                  <span className="text-soft">(by {w.narrowestDefeat.margin})</span>
                </Award>
              )}
              {w.benchWaste && (
                <Award emoji="🪑" title="Bench of shame">
                  {w.benchWaste.team}: {w.benchWaste.points} pts left on the bench
                  <span className="block text-xs text-soft">{w.benchWaste.players.join(", ")}</span>
                </Award>
              )}
              <Award emoji="👻" title="Ghost starters (0 minutes)">
                {w.ghosts.length === 0 ? (
                  <span className="text-soft">Everyone who started, played. A miracle.</span>
                ) : (
                  w.ghosts.map((g) => (
                    <span key={g.team} className="block">
                      {g.team}: <span className="text-soft">{g.players.join(", ")}</span>
                    </span>
                  ))
                )}
              </Award>
            </ul>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function Award({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-[3px] border border-line px-3 py-2.5 text-sm">
      <p className="display mb-1 text-xs tracking-[0.14em] text-lime">
        <span aria-hidden className="mr-1">{emoji}</span>
        {title}
      </p>
      {children}
    </li>
  );
}

function Record({ label, value, who, tone }: { label: string; value: number; who: string; tone: "lime" | "loss" | "amber" }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span>
        {label}
        <span className="block text-xs text-soft">{who}</span>
      </span>
      <Chip tone={tone}>{value}</Chip>
    </li>
  );
}

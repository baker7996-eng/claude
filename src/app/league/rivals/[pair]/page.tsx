import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Face } from "@/components/face";
import { Panel } from "@/components/ui";
import { viewer } from "@/lib/auth";
import { loadLeague } from "@/lib/facts/league";
import { rivalries } from "@/lib/league-stats";

export const dynamic = "force-dynamic";

export default async function RivalryPage({ params }: PageProps<"/league/rivals/[pair]">) {
  const { pair } = await params;
  const me = await viewer();
  if (!me) redirect(`/login?next=/league/rivals/${pair}`);
  const lg = await loadLeague();
  const p = rivalries(lg).find((r) => r.slug === pair);
  if (!p) notFound();

  const aMood = p.aWins > p.bWins ? "happy" : p.aWins < p.bWins ? "sad" : "neutral";
  const bMood = aMood === "happy" ? "sad" : aMood === "sad" ? "happy" : "neutral";
  const margins = p.games.map((g) => ({ ...g, margin: g.us - g.them }));
  const biggestA = [...margins].sort((x, y) => y.margin - x.margin)[0];
  const biggestB = [...margins].sort((x, y) => x.margin - y.margin)[0];

  return (
    <div className="mx-auto max-w-3xl space-y-3 md:space-y-4">
      <Link href="/league/rivals" className="text-xs font-semibold text-lime hover:underline">
        ← All rivalries
      </Link>
      <section className="rounded-md border border-line bg-panel px-4 py-5 md:px-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          <Side team={p.a.team} manager={p.a.manager} seed={p.a.entryId} mood={aMood} />
          <div>
            <p className="display text-4xl md:text-6xl">
              {p.aWins}
              <span className="text-soft">–</span>
              {p.bWins}
            </p>
            <p className="text-xs text-soft">
              {p.draws ? `${p.draws} drawn · ` : ""}
              {p.games.length} meetings
            </p>
          </div>
          <Side team={p.b.team} manager={p.b.manager} seed={p.b.entryId} mood={bMood} />
        </div>
        <p className="mt-4 text-center text-sm text-soft">
          Points in these games: {p.aPoints}–{p.bPoints}
        </p>
      </section>

      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        <Panel title="Biggest wins">
          <ul className="divide-y divide-line text-sm">
            {biggestA && biggestA.margin > 0 && (
              <li className="py-2">
                {p.a.team} {biggestA.us}–{biggestA.them} <span className="text-soft">GW{biggestA.gw}</span>
              </li>
            )}
            {biggestB && biggestB.margin < 0 && (
              <li className="py-2">
                {p.b.team} {biggestB.them}–{biggestB.us} <span className="text-soft">GW{biggestB.gw}</span>
              </li>
            )}
          </ul>
        </Panel>
        <Panel title="Every meeting">
          <ul className="divide-y divide-line text-sm">
            {[...p.games].reverse().map((g) => (
              <li key={g.gw} className="flex justify-between py-2">
                <span className="text-soft">GW{g.gw}</span>
                <span className="display text-base">
                  <span className={g.outcome === "W" ? "text-lime" : ""}>{g.us}</span>–
                  <span className={g.outcome === "L" ? "text-lime" : ""}>{g.them}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Side({ team, manager, seed, mood }: { team: string; manager: string; seed: number; mood: "happy" | "neutral" | "sad" }) {
  return (
    <div className="flex flex-col items-center">
      <Face seed={seed} mood={mood} size={80} label={`${team}, ${mood}`} />
      <p className="display mt-2 text-lg md:text-2xl">{team}</p>
      <p className="text-xs text-soft">{manager}</p>
    </div>
  );
}

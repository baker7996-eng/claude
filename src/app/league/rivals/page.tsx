import Link from "next/link";
import { redirect } from "next/navigation";
import { Face } from "@/components/face";
import { Panel } from "@/components/ui";
import { viewer } from "@/lib/auth";
import { loadLeague } from "@/lib/facts/league";
import { rivalries } from "@/lib/league-stats";

export const dynamic = "force-dynamic";

export default async function RivalsPage() {
  const me = await viewer();
  if (!me) redirect("/login?next=/league/rivals");
  const lg = await loadLeague();
  const pairs = rivalries(lg);
  const mine = pairs.filter((p) => p.a.entryId === me.entryId || p.b.entryId === me.entryId);
  const grudges = [...pairs].sort((a, b) => b.grudge - a.grudge).slice(0, 3);

  return (
    <div className="grid items-start gap-3 md:gap-4 lg:grid-cols-2">
      <Panel title="Your record against everyone">
        <ul className="divide-y divide-line">
          {mine.map((p) => {
            const meFirst = p.a.entryId === me.entryId;
            const them = meFirst ? p.b : p.a;
            const w = meFirst ? p.aWins : p.bWins;
            const l = meFirst ? p.bWins : p.aWins;
            const mood = w > l ? "happy" : w < l ? "sad" : "neutral";
            return (
              <li key={p.slug}>
                <Link href={`/league/rivals/${p.slug}`} className="group flex items-center gap-3 py-2.5">
                  <Face seed={them.entryId} mood={mood === "happy" ? "sad" : mood === "sad" ? "happy" : "neutral"} size={40} label={them.team} />
                  <span className="flex-1">
                    <span className="group-hover:underline">{them.team}</span>
                    <span className="block text-xs text-soft">{them.manager}</span>
                  </span>
                  <span className="display text-xl">
                    <span className="text-lime">{w}</span>
                    <span className="text-soft">–{p.draws}–</span>
                    <span className="text-loss">{l}</span>
                  </span>
                  <span className="text-soft">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-soft">Won–drawn–lost. Their face shows how they feel about it.</p>
      </Panel>

      <Panel title="Grudge matches">
        <p className="mb-2 text-xs text-soft">Closest records and tightest games in the league.</p>
        <ul className="divide-y divide-line">
          {grudges.map((p) => (
            <li key={p.slug}>
              <Link href={`/league/rivals/${p.slug}`} className="group flex items-center justify-between gap-3 py-2.5">
                <span className="group-hover:underline">
                  {p.a.team} v {p.b.team}
                  <span className="block text-xs text-soft">
                    {p.games.length} meetings · {p.aWins}–{p.draws}–{p.bWins}
                  </span>
                </span>
                <span className="text-soft">→</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mb-1 mt-4 text-xs text-soft">Every rivalry:</p>
        <div className="flex flex-wrap gap-1.5">
          {pairs.map((p) => (
            <Link
              key={p.slug}
              href={`/league/rivals/${p.slug}`}
              className="rounded-[3px] border border-line px-2 py-1 text-xs hover:border-lime"
            >
              {p.a.team} v {p.b.team}
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}

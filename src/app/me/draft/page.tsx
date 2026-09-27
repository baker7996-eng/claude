import Link from "next/link";
import { redirect } from "next/navigation";
import { Chip, Panel } from "@/components/ui";
import { viewer } from "@/lib/auth";
import { loadDraft } from "@/lib/draft";

export const dynamic = "force-dynamic";

const POSITIONS = ["ALL", "GKP", "DEF", "MID", "FWD"] as const;

export default async function DraftPage({ searchParams }: PageProps<"/me/draft">) {
  const me = await viewer();
  if (!me) redirect("/login?next=/me/draft");
  const { pos: posParam } = await searchParams;
  const pos = POSITIONS.includes(posParam as (typeof POSITIONS)[number]) ? (posParam as string) : "ALL";
  const { board, needs, draftGw, window } = await loadDraft(me.entryId);
  const shown = board.filter((p) => pos === "ALL" || p.position === pos).slice(0, 50);

  return (
    <div className="space-y-3 md:space-y-4">
      <div>
        <Link href="/me" className="text-xs font-semibold text-lime hover:underline">
          ← My team
        </Link>
        <p className="display mt-2 text-[13px] tracking-[0.16em] text-lime">Second draft · 21 January</p>
        <h1 className="display text-4xl font-extrabold md:text-5xl">Draft board</h1>
        <p className="mt-1 max-w-2xl text-sm text-soft">
          Every player ranked by expected points per gameweek after the draft: points per game and form,
          discounted if they don&apos;t play every minute, scaled by fixture difficulty for gameweeks {draftGw}–
          {draftGw + window - 1}. It updates as the season goes on.
        </p>
      </div>

      <Panel title="What your squad needs">
        <p className="mb-2 text-xs text-soft">
          Your best players in each position against the other squads in the league. Weakest first.
        </p>
        <ul className="grid gap-3 md:grid-cols-2">
          {needs.map((n) => (
            <li key={n.type} className="rounded-[3px] border border-line px-3 py-2.5">
              <div className="flex items-center justify-between">
                <p className="display text-lg">{n.label}</p>
                <Chip tone={n.rank >= n.of - 1 ? "loss" : n.rank <= 2 ? "lime" : "amber"}>
                  {n.rank} of {n.of}
                </Chip>
              </div>
              <p className="mt-1 text-xs text-soft">Best targets:</p>
              <p className="text-sm">
                {n.targets.map((t, i) => (
                  <span key={t.id}>
                    {i > 0 && ", "}
                    {t.name} <span className="text-soft">({t.club}, {t.score})</span>
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Rankings">
        <nav className="display mb-3 flex gap-1 text-sm">
          {POSITIONS.map((p) => (
            <Link
              key={p}
              href={p === "ALL" ? "/me/draft" : `/me/draft?pos=${p}`}
              className={`rounded-[3px] px-2.5 py-1 ${p === pos ? "bg-lime text-pitch" : "border border-line text-soft hover:text-ink"}`}
            >
              {p}
            </Link>
          ))}
        </nav>
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[34rem] text-sm tabular-nums">
            <thead className="display text-xs tracking-[0.1em] text-soft">
              <tr>
                <th className="py-2 text-left font-semibold">#</th>
                <th className="py-2 text-left font-semibold">Player</th>
                <th className="py-2 text-right font-semibold">Score</th>
                <th className="py-2 text-right font-semibold">PPG</th>
                <th className="py-2 text-right font-semibold">Mins</th>
                <th className="py-2 pl-3 text-left font-semibold">Fixtures</th>
                <th className="py-2 text-left font-semibold">Now with</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line border-t border-line">
              {shown.map((p, i) => (
                <tr key={p.id} className={p.mine ? "text-lime" : ""}>
                  <td className="display py-2 text-soft">{i + 1}</td>
                  <td className="py-2 pr-2">
                    {p.name}
                    <span className="ml-1.5 text-xs text-soft">
                      {p.club} · {p.position}
                    </span>
                    {p.news && <span className="block text-xs text-amber">{p.news}</span>}
                  </td>
                  <td className="display py-2 text-right text-base">{p.score}</td>
                  <td className="py-2 text-right">{p.ppg.toFixed(1)}</td>
                  <td className="py-2 text-right text-soft">{Math.round(p.minutesShare * 100)}%</td>
                  <td className="py-2 pl-3 text-xs text-soft">{p.fixtures}</td>
                  <td className="py-2 text-xs">{p.mine ? "You" : (p.owner ?? <span className="text-lime">Free</span>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-soft">Fixtures: capitals home, lower case away. Your players in lime.</p>
      </Panel>
    </div>
  );
}

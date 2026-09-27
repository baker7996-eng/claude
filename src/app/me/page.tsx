import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { Chip, Panel } from "@/components/ui";
import { loadAdvice, type Advice, type Fixture, type Rated } from "@/lib/advice";
import { viewer } from "@/lib/auth";
import { ukTime } from "@/lib/facts/text";

export const dynamic = "force-dynamic";

export default async function MyTeamPage() {
  const me = await viewer();
  if (!me) redirect("/login?next=/me");
  const advice = await loadAdvice(me.entryId);

  return (
    <div className="space-y-3 md:space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="display text-[13px] tracking-[0.16em] text-lime">My team · private</p>
          <h1 className="display text-4xl font-extrabold md:text-5xl">{advice.teamName}</h1>
          <p className="mt-1 text-sm text-soft">
            Advice for gameweeks {advice.firstGw}–{advice.firstGw + advice.horizon - 1}.
            {advice.waivers && ` Waivers: ${ukTime(advice.waivers)}.`} Only you can see this page.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold">
          <Link href="/me/draft" className="text-lime hover:underline">
            Draft board
          </Link>
          <Link href="/league/trades" className="text-lime hover:underline">
            Trade block
          </Link>
          {me.isOwner && (
            <Link href="/admin" className="text-lime hover:underline">
              League PINs
            </Link>
          )}
          {me.authEnabled && (
            <>
              <Link href="/me/pin" className="text-lime hover:underline">
                Change PIN
              </Link>
              <form action={signOut}>
                <button type="submit" className="text-soft hover:text-ink">
                  Sign out
                </button>
              </form>
            </>
          )}
        </div>
      </header>

      <div className="grid items-start gap-3 md:gap-4 lg:grid-cols-2">
        <Swaps advice={advice} />
        <Trades advice={advice} />
      </div>
      <FixtureOutlook advice={advice} />
      <Upcoming advice={advice} />
      <p className="text-xs text-soft">
        How this works: projected points = recent form (last 4 gameweeks, 60%) and season points per game
        (40%), scaled by each fixture&apos;s FPL difficulty rating and by FPL&apos;s chance-of-playing for
        next week. A guide, not gospel.
      </p>
    </div>
  );
}

function Swaps({ advice }: { advice: Advice }) {
  return (
    <Panel title="Waiver targets">
      <p className="mb-2 text-xs text-soft">
        Unowned players projected to beat your weakest player in the same position over the next{" "}
        {advice.horizon} gameweeks.
      </p>
      {advice.swaps.length === 0 ? (
        <p className="py-2 text-sm text-soft">Nobody on the wire beats what you&apos;ve got. Enjoy it.</p>
      ) : (
        <ul className="divide-y divide-line">
          {advice.swaps.map(({ add, drop, gain }) => (
            <li key={`${add.id}-${drop.id}`} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <p>
                  <span className="text-lime">+ {add.name}</span>{" "}
                  <span className="text-soft">for</span> <span className="text-loss">− {drop.name}</span>
                </p>
                <Chip tone="lime">+{gain}</Chip>
              </div>
              <Compare a={add} b={drop} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Trades({ advice }: { advice: Advice }) {
  return (
    <Panel title="Trades to propose">
      <p className="mb-2 text-xs text-soft">
        Like-for-like swaps where their player is in better form or has kinder fixtures, but yours has
        as many season points, so it looks fair from their side.
      </p>
      {advice.trades.length === 0 ? (
        <p className="py-2 text-sm text-soft">No sensible trades this week.</p>
      ) : (
        <ul className="divide-y divide-line">
          {advice.trades.map((t) => (
            <li key={`${t.give.id}-${t.get.id}`} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <p>
                  Offer <span className="text-loss">{t.give.name}</span> to {t.manager} for{" "}
                  <span className="text-lime">{t.get.name}</span>
                  <span className="block text-xs text-soft">{t.team}</span>
                </p>
                <Chip tone="lime">+{t.gain}</Chip>
              </div>
              <Compare a={t.get} b={t.give} />
              <p className="mt-1.5 text-xs text-soft">
                Why they might say yes: {t.give.name} has {t.give.seasonPoints} season points to{" "}
                {t.get.name}&apos;s {t.get.seasonPoints}, so it reads as a fair swap
                {t.fillsGap && ` and would be one of their better ${t.give.position}s`}.
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Side-by-side mini comparison: projection, form and next fixtures. */
function Compare({ a, b }: { a: Rated; b: Rated }) {
  return (
    <div className="mt-2 grid gap-1 text-xs">
      {[a, b].map((p) => (
        <div key={p.id} className="grid grid-cols-[5.5rem_1fr] items-center gap-2 sm:grid-cols-[7rem_1fr]">
          <span className="truncate text-soft">
            {p.name} <span className="text-soft/70">{p.club}</span>
          </span>
          <span className="flex flex-wrap items-center gap-1">
            <span className="display mr-1 text-sm text-ink">{p.projected}</span>
            <span className="mr-1 text-soft">form {p.form.join(",")}</span>
            {p.fixtures.slice(0, 3).map((f, i) => (
              <FixtureChip key={i} f={f} />
            ))}
            {p.availability < 1 && <Chip tone={p.availability === 0 ? "loss" : "amber"}>{Math.round(p.availability * 100)}%</Chip>}
          </span>
        </div>
      ))}
    </div>
  );
}

const difficultyTone: Record<number, string> = {
  1: "bg-lime/25 text-lime",
  2: "bg-lime/12 text-lime",
  3: "bg-line text-ink",
  4: "bg-amber/15 text-amber",
  5: "bg-loss/15 text-loss",
};

function FixtureChip({ f }: { f: Fixture }) {
  return (
    <span
      title={`GW${f.gw}: ${f.home ? "home to" : "away at"} ${f.opponent}, difficulty ${f.difficulty}`}
      className={`display rounded-[3px] px-1.5 py-0.5 text-[12px] ${difficultyTone[f.difficulty] ?? ""}`}
    >
      {f.home ? f.opponent : f.opponent.toLowerCase()}
    </span>
  );
}

function FixtureOutlook({ advice }: { advice: Advice }) {
  return (
    <Panel title="Fixture outlook">
      <p className="mb-2 text-xs text-soft">
        Capitals = home, lower case = away. Green easy, amber tough, red hardest (FPL difficulty).
      </p>
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full text-sm tabular-nums">
          <thead className="display text-xs tracking-[0.1em] text-soft">
            <tr>
              <th className="py-2 text-left font-semibold">Player</th>
              <th className="py-2 text-right font-semibold">Proj</th>
              {advice.tickerGws.map((gw, i) => (
                <th key={gw} className={`py-2 text-center font-semibold ${i >= 3 ? "hidden sm:table-cell" : ""}`}>
                  GW{gw}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line border-t border-line">
            {advice.squad.map((p) => (
              <tr key={p.id} className={p.starting ? "" : "text-soft"}>
                <td className="py-2 pr-2">
                  {p.name}
                  <span className="ml-1.5 block text-xs text-soft sm:inline">
                    {p.club} · {p.position}
                    {!p.starting && " · bench"}
                  </span>
                  {p.news && <span className="block text-xs text-amber">{p.news}</span>}
                </td>
                <td className="display py-2 text-right text-base">{p.projected}</td>
                {advice.tickerGws.map((gw, i) => {
                  const fs = p.fixtures.filter((f) => f.gw === gw);
                  return (
                    <td key={gw} className={`py-2 text-center ${i >= 3 ? "hidden sm:table-cell" : ""}`}>
                      {fs.length === 0 ? (
                        <span className="text-xs text-loss">blank</span>
                      ) : (
                        <span className="inline-flex gap-0.5">
                          {fs.map((f, i) => (
                            <FixtureChip key={i} f={f} />
                          ))}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Upcoming({ advice }: { advice: Advice }) {
  if (advice.upcoming.length === 0) return null;
  return (
    <Panel title="Next opponents">
      <ul className="grid gap-2 sm:grid-cols-3">
        {advice.upcoming.map((u) => (
          <li key={u.gw} className="rounded-[3px] border border-line px-3 py-2">
            <span className="display block text-xs tracking-[0.14em] text-lime">GW {u.gw}</span>
            {u.opponent}
            {u.standing && (
              <span className="block text-xs text-soft">
                {u.standing.rank} in the table · {u.standing.points} pts · {u.standing.pointsFor} scored
              </span>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

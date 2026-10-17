import Link from "next/link";
import { redirect } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { Face, type Mood } from "@/components/face";
import { Panel } from "@/components/ui";
import { viewer } from "@/lib/auth";
import { ukTime } from "@/lib/facts/text";
import { loadMatchday, type Matchday, type PlayStatus } from "@/lib/matchday";

export const dynamic = "force-dynamic";

type Side = NonNullable<Matchday["me"]>;

export default async function MatchdayPage({ searchParams }: PageProps<"/matchday">) {
  const me = await viewer();
  if (!me) redirect("/login?next=/matchday");
  const { gw: gwParam, team: teamParam } = await searchParams;
  const gw = Number(gwParam);
  const team = Number(teamParam);
  // Anyone's match can be opened with ?team=<entry id>; default is your own.
  const viewpoint = Number.isInteger(team) && team > 0 ? team : me.entryId;
  const md = await loadMatchday(viewpoint, Number.isInteger(gw) && gw > 0 ? gw : undefined);

  if (!md.me || !md.them) {
    return (
      <Panel title="Matchday">
        <p className="text-sm text-soft">No head-to-head for that team in gameweek {md.gw}.</p>
      </Panel>
    );
  }
  const mood = (a: number, b: number): Mood => (a > b ? "happy" : a < b ? "sad" : "neutral");
  const mine = md.me.entryId === me.entryId;
  const hrefFor = (entryId: number) =>
    `/matchday?${new URLSearchParams({ ...(gwParam ? { gw: String(md.gw) } : {}), ...(entryId !== me.entryId ? { team: String(entryId) } : {}) })}`;
  const ties = [{ home: md.me, away: md.them }, ...md.others].sort((a, b) =>
    a.home.entryId === me.entryId || a.away.entryId === me.entryId ? -1 : b.home.entryId === me.entryId || b.away.entryId === me.entryId ? 1 : 0,
  );

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="display text-[13px] tracking-[0.16em] text-lime">
          Gameweek {md.gw} · {md.live ? "Live" : md.finished ? "Full time" : "Result"}
        </p>
        {md.live ? (
          <AutoRefresh seconds={60} />
        ) : (
          md.next && (
            <p className="text-xs text-soft">
              Next up: gameweek {md.next.gw}, deadline {ukTime(md.next.deadline)}. This page goes live when it kicks off.
            </p>
          )
        )}
      </div>

      {/* Scoreboard */}
      <section className="rounded-md border border-line bg-[radial-gradient(120%_90%_at_50%_0%,#2a3a10_0%,#141a17_60%)] px-4 py-5 md:px-8 md:py-7">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center md:gap-6">
          <Scorer side={md.me} mood={mood(md.me.total, md.them.total)} you={mine} />
          <div>
            <p className="display text-5xl font-extrabold md:text-7xl">
              <span className={mine ? "text-lime" : ""}>{md.me.total}</span>
              <span className="text-soft">–</span>
              {md.them.total}
            </p>
            {!md.finished && (md.me.toPlay > 0 || md.them.toPlay > 0) && (
              <div className="mt-1 space-y-0.5 text-xs text-soft md:text-sm">
                <p>
                  Updated prediction{" "}
                  <span className="display text-base text-ink md:text-xl">
                    {md.me.projected}–{md.them.projected}
                  </span>
                </p>
                <p>
                  Original prediction{" "}
                  <span className="display text-sm text-ink md:text-base">
                    {md.me.original}–{md.them.original}
                  </span>
                </p>
              </div>
            )}
          </div>
          <Scorer side={md.them} mood={mood(md.them.total, md.me.total)} />
        </div>
      </section>

      {/* Every match this gameweek; tap one to open it */}
      <p className="display mt-1 text-xs tracking-[0.14em] text-soft">All matches · tap one to open it</p>
      <nav aria-label="Matches this gameweek" className="grid gap-2 sm:grid-cols-3">
        {ties.map((t) => {
          const open = t.home.entryId === md.me!.entryId || t.away.entryId === md.me!.entryId;
          return (
            <Link
              key={t.home.entryId}
              href={hrefFor(t.home.entryId === me.entryId || t.away.entryId !== me.entryId ? t.home.entryId : t.away.entryId)}
              aria-current={open ? "page" : undefined}
              className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[3px] border px-3 py-2 text-sm ${
                open ? "border-lime bg-panel" : "border-line hover:border-soft"
              }`}
            >
              <span className="truncate">{t.home.team}</span>
              <span className="display text-lg">
                {t.home.total}–{t.away.total}
              </span>
              <span className="truncate text-right">{t.away.team}</span>
            </Link>
          );
        })}
      </nav>

      <div className="grid items-start gap-3 md:grid-cols-2 md:gap-4">
        <Lineup side={md.me} title={mine ? "Your XI" : md.me.team} />
        <Lineup side={md.them} title={md.them.team} />
      </div>

      <p className="text-xs text-soft">
        Totals count your starting XI (and any automatic subs FPL has made). Bonus points are provisional until
        FPL confirms them. The updated prediction changes with every refresh: points so far plus what each player
        should add in the minutes left (form, fixture difficulty and chance of playing). The original prediction is the expected points of each full XI before any games.{" "}
        {md.gw > 1 && (
          <Link href={`/matchday?gw=${md.gw - 1}${mine ? "" : `&team=${md.me.entryId}`}`} className="text-lime hover:underline">
            Previous gameweek
          </Link>
        )}
      </p>
    </div>
  );
}

function Scorer({ side, mood, you }: { side: Side; mood: Mood; you?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <Face seed={side.entryId} mood={mood} size={76} label={`${side.team}, ${mood}`} />
      <p className={`display mt-2 text-base md:text-2xl ${you ? "text-lime" : ""}`}>{side.team}</p>
      <p className="text-xs text-soft">{side.toPlay ? `${side.toPlay} still to play` : "All played"}</p>
    </div>
  );
}

const STATUS: Record<PlayStatus, { dot: string; label: string }> = {
  played: { dot: "bg-soft", label: "Played" },
  playing: { dot: "bg-lime animate-pulse", label: "Playing now" },
  "to-play": { dot: "border border-soft", label: "Still to play" },
  "no-fixture": { dot: "bg-loss", label: "No fixture" },
};

function Lineup({ side, title }: { side: Side; title: string }) {
  const xi = side.players.filter((p) => !p.bench);
  const bench = side.players.filter((p) => p.bench);
  const row = (p: Side["players"][number]) => (
    <li key={p.id} className={`flex items-center gap-2.5 py-2 ${p.counts ? "" : "text-soft"}`}>
      <span className={`size-2.5 shrink-0 rounded-full ${STATUS[p.status].dot}`} title={STATUS[p.status].label} />
      <span className="min-w-0 flex-1">
        <PlayerName name={p.name} points={p.points} />
        <span className="ml-1.5 text-xs text-soft">
          {p.position} · {p.fixture}
          {p.status !== "to-play" && ` · ${p.minutes}'`}
          {p.counts && p.expected >= 0.5 && ` · exp +${Math.round(p.expected)}`}
        </span>
      </span>
      <span className={`display text-lg ${p.points >= 12 ? "text-amber" : p.points >= 7 ? "text-lime" : p.points < 0 ? "text-loss" : ""}`}>
        {p.points}
      </span>
    </li>
  );
  return (
    <Panel title={title}>
      <ul className="divide-y divide-line">{xi.map(row)}</ul>
      <p className="display mt-3 mb-1 text-xs tracking-[0.14em] text-soft">Bench</p>
      <ul className="divide-y divide-line">{bench.map(row)}</ul>
      <p className="mt-2 flex flex-wrap gap-3 text-[11px] text-soft">
        {(["playing", "to-play", "played"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className={`size-2 rounded-full ${STATUS[s].dot}`} />
            {STATUS[s].label}
          </span>
        ))}
        <span>⭐ 7+ points</span>
        <span>🔥 12+ points</span>
      </p>
    </Panel>
  );
}

/** 7+ points earns a star; 12+ sets the name on fire. */
function PlayerName({ name, points }: { name: string; points: number }) {
  if (points >= 12)
    return (
      <span className="font-semibold">
        <span className="on-fire">{name}</span>{" "}
        <span aria-label="on fire" className="flame">
          🔥
        </span>
      </span>
    );
  if (points >= 7)
    return (
      <span className="font-semibold">
        {name} <span aria-label="star">⭐</span>
      </span>
    );
  return <>{name}</>;
}

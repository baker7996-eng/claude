import { redirect } from "next/navigation";
import { Chip, FormStrip, Panel, Rows } from "@/components/ui";
import { viewer } from "@/lib/auth";
import { ukTime } from "@/lib/facts/text";
import { FplError } from "@/lib/fpl/client";
import { loadHome, type HomeData } from "@/lib/home";

// Always render on request so the page shows current FPL data
// (individual API responses are still cached for a few minutes).
export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await viewer();
  if (!me) redirect("/login");
  const data = await loadHome(me.entryId).catch((err) => {
    if (err instanceof FplError) return err;
    throw err;
  });
  if (data instanceof FplError) return <FplErrorPanel error={data} />;

  return (
    // Three columns on a laptop, two on a tablet, one stacked column on a phone.
    <div className="grid items-start gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
      <NextMatch data={data} />
      <div className="flex flex-col gap-3 md:gap-4">
        <InjuryWatch data={data} />
        <LastResult data={data} />
      </div>
      <LeagueTable data={data} />
      <OnTheWire data={data} />
    </div>
  );
}

function NextMatch({ data }: { data: HomeData }) {
  const { next, me } = data;
  if (!next) {
    return (
      <Panel title="Season over" className="md:col-span-2 lg:col-span-3">
        <p className="text-soft">No more head-to-heads this season.</p>
      </Panel>
    );
  }
  const stacks = [
    next.myStack && `You have ${next.myStack.players.length} in ${next.myStack.label}.`,
    next.theirStack &&
      `${next.opponentManager.split(" ")[0]} has ${next.theirStack.players.length} in ${next.theirStack.label}.`,
  ].filter(Boolean);

  return (
    <section className="relative overflow-hidden rounded-md border border-line bg-[radial-gradient(120%_90%_at_100%_0%,#2a3a10_0%,#141a17_55%)] px-4 py-5 md:col-span-2 md:px-8 md:py-8 lg:col-span-3">
      <div
        aria-hidden
        className="absolute -right-8 -bottom-16 size-44 rounded-full border-2 border-lime/10 md:size-72"
      />
      <p className="display text-[13px] tracking-[0.16em] text-lime">
        Gameweek {data.gw} · Head-to-head
      </p>
      <div className="my-3 md:my-5 md:flex md:items-baseline md:gap-5">
        <p className="display text-[40px] font-extrabold leading-[0.92] md:text-6xl">{next.opponent}</p>
        <p className="display my-1 text-lg text-soft md:text-2xl">v</p>
        <p className="display text-[40px] font-extrabold leading-[0.92] text-lime md:text-6xl">{me.name}</p>
      </div>
      {stacks.length > 0 && <p className="mb-4 max-w-2xl text-sm text-soft">{stacks.join(" ")}</p>}
      <dl className="relative grid grid-cols-2 gap-x-4 gap-y-3 text-xs text-soft sm:flex sm:gap-8">
        <Stat label="Waivers" value={ukTime(next.waivers)} />
        <Stat label="Deadline" value={ukTime(next.deadline)} />
        <Stat label="Them" value={standingText(next.opponentStanding)} />
        <Stat label="You" value={standingText(me.standing)} />
      </dl>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="display mt-0.5 text-[19px] text-ink">{value}</dd>
    </div>
  );
}

function InjuryWatch({ data }: { data: HomeData }) {
  return (
    <Panel title="Injury watch">
      {data.injuries.length === 0 ? (
        <p className="py-2 text-sm text-soft">Everyone&apos;s fit. Enjoy it while it lasts.</p>
      ) : (
        <Rows>
          {data.injuries.map((p) => (
            <li key={p.name} className="flex items-center justify-between gap-3 py-2">
              <span>
                {p.name}
                <span className="ml-1.5 text-xs text-soft">
                  {p.club} · {p.news}
                  {!p.starting && " · bench"}
                </span>
              </span>
              {p.chance === null || p.chance > 0 ? (
                <Chip tone="amber">{p.chance ?? "?"}%</Chip>
              ) : (
                <Chip tone="loss">OUT</Chip>
              )}
            </li>
          ))}
        </Rows>
      )}
    </Panel>
  );
}

function LastResult({ data }: { data: HomeData }) {
  const { last, form } = data;
  if (!last) return null;
  const tone = { W: "bg-lime", D: "bg-soft", L: "bg-loss" }[last.outcome];
  return (
    <Panel title="Last result" link={{ href: "/facts/review", label: "Facts" }}>
      <div className="mb-3 flex items-center gap-3">
        <span className={`display grid size-8 place-items-center rounded-[3px] text-xl font-extrabold text-pitch ${tone}`}>
          {last.outcome}
        </span>
        <span className="display text-[46px] font-extrabold">
          {last.us}–{last.them}
        </span>
        <span className="text-sm text-soft">
          v {last.opponent.entry_name}
          <br />
          GW {last.event}
        </span>
      </div>
      <FormStrip results={form} />
      <p className="mt-1.5 text-xs text-soft">Last {form.length} results, oldest first</p>
    </Panel>
  );
}

function LeagueTable({ data }: { data: HomeData }) {
  return (
    <Panel title="Table" link={{ href: "/league", label: "Full" }}>
      <table className="w-full tabular-nums">
        <tbody className="divide-y divide-line">
          {data.table.map((r) => (
            <tr key={r.team} className={r.team === data.me.name ? "text-lime" : ""}>
              <td className="display w-6 py-2 text-base text-soft">{r.rank}</td>
              <td className="py-2">{r.team}</td>
              <td className="py-2 pr-3 text-right text-sm text-soft">{r.pointsFor}</td>
              <td className="display py-2 text-right text-lg">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function OnTheWire({ data }: { data: HomeData }) {
  return (
    <Panel title="On the wire">
      <p className="mb-1 text-xs text-soft">Best unowned players in GW {data.lastFinished}</p>
      <Rows>
        {data.freeAgents.map((p) => (
          <li key={p.name} className="flex items-center justify-between py-2">
            <span>
              {p.name}
              <span className="ml-1.5 text-xs text-soft">
                {p.club} · {p.position}
              </span>
            </span>
            <Chip tone="lime">{p.points}</Chip>
          </li>
        ))}
      </Rows>
    </Panel>
  );
}

function standingText(s: HomeData["me"]["standing"]) {
  return s ? `${ordinal(s.rank)} · ${s.points}` : "–";
}

function ordinal(n: number) {
  const suffix = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
  return `${n}${suffix}`;
}

function FplErrorPanel({ error }: { error: FplError }) {
  return (
    <section className="rounded-md border border-loss/40 bg-loss/5 p-5">
      <h2 className="display text-xl">Couldn&apos;t load FPL data</h2>
      <p className="mt-1 text-sm">{error.message}</p>
      <p className="mt-1 text-sm text-soft">Request: {error.path}</p>
    </section>
  );
}

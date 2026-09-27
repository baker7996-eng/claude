import { redirect } from "next/navigation";
import { answerOffer, makeOffer, saveListing } from "@/app/trade-actions";
import { Chip, Panel } from "@/components/ui";
import { viewer } from "@/lib/auth";
import { loadLeague } from "@/lib/facts/league";
import { fpl } from "@/lib/fpl/client";
import type { Player } from "@/lib/fpl/types";
import { getBlock, getOffers, type Offer } from "@/lib/trades";

export const dynamic = "force-dynamic";

const button =
  "display rounded-[3px] bg-lime px-3 py-1.5 text-sm text-pitch hover:brightness-110";
const ghostButton =
  "display rounded-[3px] border border-line px-3 py-1.5 text-sm hover:border-soft";

export default async function TradesPage({ searchParams }: PageProps<"/league/trades">) {
  const me = await viewer();
  if (!me) redirect("/login?next=/league/trades");
  const { msg } = await searchParams;

  const lg = await loadLeague();
  const [status, block, offers] = await Promise.all([fpl.elementStatus(lg.leagueId), getBlock(), getOffers()]);
  const owner = new Map(status.element_status.map((s) => [s.element, s.owner]));
  const team = (entryId: number) => lg.league.league_entries.find((e) => e.entry_id === entryId);
  const player = (id: number) => lg.player(id);
  const mySquad = status.element_status
    .filter((s) => s.owner === me.entryId)
    .map((s) => player(s.element))
    .filter((p): p is Player => !!p)
    .sort((a, b) => a.element_type - b.element_type || b.total_points - a.total_points);

  const myListing = block[me.entryId];
  // Listings from everyone else, only players they still own.
  const others = Object.entries(block)
    .map(([entryId, l]) => ({ entryId: Number(entryId), ...l, players: l.players.filter((id) => owner.get(id) === Number(entryId)) }))
    .filter((l) => l.entryId !== me.entryId && (l.players.length || l.note));

  const incoming = offers.filter((o) => o.to === me.entryId);
  const outgoing = offers.filter((o) => o.from === me.entryId);

  const line = (id: number) => {
    const p = player(id);
    return p ? `${p.web_name} (${lg.teamShort(p.team)} ${lg.position(p)})` : "unknown player";
  };

  return (
    <div className="space-y-3 md:space-y-4">
      {typeof msg === "string" && (
        <p className="rounded-md border border-lime/40 bg-lime/10 px-4 py-2.5 text-sm text-lime" role="status">
          {msg}
        </p>
      )}

      <div className="grid items-start gap-3 md:gap-4 lg:grid-cols-5">
        <Panel title="The board" className="lg:col-span-3">
          <p className="mb-2 text-xs text-soft">
            Players other managers are happy to trade. Make an offer and they&apos;ll see it on this page.
            Agreed deals are done in the FPL Draft app.
          </p>
          {others.length === 0 ? (
            <p className="py-2 text-sm text-soft">Nobody&apos;s listed anyone yet. Go first and set the market.</p>
          ) : (
            <div className="space-y-4">
              {others.map((l) => (
                <div key={l.entryId}>
                  <p className="display text-base text-lime">{team(l.entryId)?.entry_name}</p>
                  {l.note && <p className="mb-1 text-sm italic text-soft">&ldquo;{l.note}&rdquo;</p>}
                  <ul className="divide-y divide-line">
                    {l.players.map((id) => {
                      const p = player(id)!;
                      return (
                        <li key={id} className="py-2.5">
                          <details className="group">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                              <span>
                                {p.web_name}
                                <span className="ml-1.5 text-xs text-soft">
                                  {lg.teamShort(p.team)} · {lg.position(p)} · {p.total_points} pts · form {p.form}
                                </span>
                                {p.news && <span className="block text-xs text-amber">{p.news}</span>}
                              </span>
                              <span className={`${ghostButton} shrink-0 group-open:border-lime`}>Offer</span>
                            </summary>
                            <form action={makeOffer} className="mt-2 space-y-2 rounded-[3px] border border-line p-3">
                              <input type="hidden" name="want" value={id} />
                              <p className="text-xs text-soft">What would you give for {p.web_name}?</p>
                              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                                {mySquad.map((mine) => (
                                  <label key={mine.id} className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" name="give" value={mine.id} className="accent-lime" />
                                    {mine.web_name}
                                    <span className="text-xs text-soft">
                                      {lg.position(mine)} · {mine.total_points}
                                    </span>
                                  </label>
                                ))}
                              </div>
                              <input
                                name="message"
                                maxLength={300}
                                placeholder="Add a message (optional)"
                                className="w-full rounded-[3px] border border-line bg-pitch px-3 py-2 text-sm outline-none focus:border-lime"
                              />
                              <button type="submit" className={button}>
                                Send offer
                              </button>
                            </form>
                          </details>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-3 md:gap-4 lg:col-span-2">
          <Panel title="Offers for you">
            <OfferList offers={incoming} line={line} team={team} side="incoming" />
          </Panel>
          <Panel title="Offers you've made">
            <OfferList offers={outgoing} line={line} team={team} side="outgoing" />
          </Panel>
          <Panel title="Your trade block">
            <form action={saveListing} className="space-y-3">
              <p className="text-xs text-soft">Tick who you&apos;d trade. Everyone can see this list.</p>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {mySquad.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="player"
                      value={p.id}
                      defaultChecked={myListing?.players.includes(p.id)}
                      className="accent-lime"
                    />
                    {p.web_name}
                    <span className="text-xs text-soft">{lg.position(p)}</span>
                  </label>
                ))}
              </div>
              <input
                name="note"
                maxLength={200}
                defaultValue={myListing?.note ?? ""}
                placeholder='A note, e.g. "Looking for a striker"'
                className="w-full rounded-[3px] border border-line bg-pitch px-3 py-2 text-sm outline-none focus:border-lime"
              />
              <button type="submit" className={button}>
                Save my block
              </button>
            </form>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function OfferList({
  offers,
  line,
  team,
  side,
}: {
  offers: Offer[];
  line: (id: number) => string;
  team: (entryId: number) => { entry_name: string } | undefined;
  side: "incoming" | "outgoing";
}) {
  if (offers.length === 0) return <p className="py-1 text-sm text-soft">None yet.</p>;
  const tone = { open: "amber", accepted: "lime", declined: "loss", withdrawn: "loss" } as const;
  return (
    <ul className="divide-y divide-line">
      {[...offers].reverse().map((o) => (
        <li key={o.id} className="space-y-1.5 py-2.5 text-sm">
          <div className="flex items-start justify-between gap-2">
            <p>
              {side === "incoming" ? team(o.from)?.entry_name : `To ${team(o.to)?.entry_name}`}
              <span className="block text-xs text-soft">
                {side === "incoming" ? "Wants" : "You want"} {o.want.map(line).join(", ")}
              </span>
              <span className="block text-xs text-soft">
                {side === "incoming" ? "Offers" : "You offer"} {o.give.map(line).join(", ")}
              </span>
              {o.message && <span className="block text-xs italic">&ldquo;{o.message}&rdquo;</span>}
            </p>
            <Chip tone={tone[o.status]}>{o.status.toUpperCase()}</Chip>
          </div>
          {o.status === "open" && (
            <form action={answerOffer} className="flex gap-2">
              <input type="hidden" name="id" value={o.id} />
              {side === "incoming" ? (
                <>
                  <button type="submit" name="status" value="accepted" className={button}>
                    Accept
                  </button>
                  <button type="submit" name="status" value="declined" className={ghostButton}>
                    Decline
                  </button>
                </>
              ) : (
                <button type="submit" name="status" value="withdrawn" className={ghostButton}>
                  Withdraw
                </button>
              )}
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}

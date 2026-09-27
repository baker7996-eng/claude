import { redirect } from "next/navigation";
import { IssuePinButton } from "@/components/forms";
import { Panel } from "@/components/ui";
import { pinRecord, viewer } from "@/lib/auth";
import { loadLeague } from "@/lib/facts/league";
import { hasDatabase } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await viewer();
  if (!me) redirect("/login?next=/admin");
  if (!me.isOwner) redirect("/");

  const lg = await loadLeague();
  const teams = await Promise.all(
    lg.league.league_entries.map(async (e) => ({
      id: e.entry_id,
      name: e.entry_name,
      manager: lg.manager(e),
      hasPin: Boolean(await pinRecord(e.entry_id)),
    })),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      {(!me.authEnabled || !hasDatabase) && (
        <p className="rounded-md border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
          {!me.authEnabled && "Sign-in is off: add AUTH_SECRET in Vercel to switch it on. "}
          {!hasDatabase && "No database connected: PINs won't be saved. Connect Upstash Redis in Vercel."}
        </p>
      )}
      <Panel title="League PINs">
        <p className="mb-2 text-sm text-soft">
          &quot;New PIN&quot; creates a 4-digit PIN and shows it once: send it to that manager privately.
          It replaces their old PIN and signs them out everywhere.
        </p>
        <ul className="divide-y divide-line">
          {teams.map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-3 py-3">
              <span>
                {t.name}
                <span className="block text-xs text-soft">
                  {t.manager} · {t.hasPin ? "PIN set" : "no PIN yet"}
                </span>
              </span>
              <IssuePinButton entryId={t.id} team={t.name} />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

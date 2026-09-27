import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms";
import { Panel } from "@/components/ui";
import { viewer } from "@/lib/auth";
import { loadLeague } from "@/lib/facts/league";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const me = await viewer();
  if (me?.authEnabled) redirect(typeof next === "string" ? next : "/");

  const lg = await loadLeague();
  const teams = lg.league.league_entries
    .map((e) => ({ id: e.entry_id, name: e.entry_name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-sm pt-4 md:pt-12">
      <Panel title="Members only">
        <p className="mb-4 text-sm text-soft">
          Pick your team and enter your PIN. No PIN yet? Ask Ed. You can change it once you&apos;re in.
        </p>
        <LoginForm teams={teams} next={typeof next === "string" ? next : undefined} />
      </Panel>
    </div>
  );
}

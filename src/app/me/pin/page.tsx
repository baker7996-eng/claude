import Link from "next/link";
import { redirect } from "next/navigation";
import { ChangePinForm } from "@/components/forms";
import { Panel } from "@/components/ui";
import { viewer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ChangePinPage() {
  const me = await viewer();
  if (!me) redirect("/login?next=/me/pin");
  return (
    <div className="mx-auto max-w-sm">
      <Link href="/me" className="text-xs font-semibold text-lime hover:underline">
        ← My team
      </Link>
      <Panel title="Change your PIN" className="mt-3">
        <ChangePinForm />
      </Panel>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { changePin, issuePin, signIn, type FormState } from "@/app/actions";

const input =
  "w-full rounded-[3px] border border-line bg-pitch px-3 py-2.5 text-base text-ink outline-none focus:border-lime";
const button =
  "display rounded-[3px] bg-lime px-4 py-2.5 text-base text-pitch hover:brightness-110 disabled:opacity-50";

function Feedback({ state }: { state: FormState }) {
  if (state.error) return <p className="text-sm text-loss" role="alert">{state.error}</p>;
  if (state.message) return <p className="text-sm text-lime" role="status">{state.message}</p>;
  return null;
}

function PinInput({ name, label }: { name: string; label: string }) {
  return (
    <label className="block text-sm text-soft">
      {label}
      <input
        name={name}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        pattern="\d{4,8}"
        minLength={4}
        maxLength={8}
        required
        className={`${input} mt-1 tracking-[0.3em]`}
      />
    </label>
  );
}

export function LoginForm({ teams, next }: { teams: { id: number; name: string }[]; next?: string }) {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/"} />
      <label className="block text-sm text-soft">
        Your team
        <select name="entry" required defaultValue="" className={`${input} mt-1`}>
          <option value="" disabled>
            Choose…
          </option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <PinInput name="pin" label="PIN" />
      <Feedback state={state} />
      <button type="submit" disabled={pending} className={`${button} w-full`}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}

export function ChangePinForm() {
  const [state, action, pending] = useActionState(changePin, {});
  return (
    <form action={action} className="space-y-4">
      <PinInput name="current" label="Current PIN" />
      <PinInput name="new" label="New PIN (4 to 8 digits)" />
      <PinInput name="confirm" label="New PIN again" />
      <Feedback state={state} />
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Saving…" : "Change PIN"}
      </button>
    </form>
  );
}

export function IssuePinButton({ entryId, team }: { entryId: number; team: string }) {
  const [state, action, pending] = useActionState(issuePin, {});
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="entry" value={entryId} />
      <input type="hidden" name="team" value={team} />
      <button
        type="submit"
        disabled={pending}
        className="display rounded-[3px] border border-line px-3 py-1.5 text-sm hover:border-lime disabled:opacity-50"
      >
        {pending ? "…" : "New PIN"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

"use client";
import Link from "next/link";
import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { unlock } from "../actions";

export function UnlockForm({ next }: { next: string }) {
  const [state, action] = useActionState(unlock, undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="sr-only" htmlFor="pin">PIN</label>
      <input
        id="pin"
        name="pin"
        type="password"
        inputMode="numeric"
        pattern="\d{4}"
        maxLength={4}
        autoFocus
        required
        className="field text-center font-display text-3xl tracking-[0.6em]"
      />
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary w-full" pending="Checking…">Unlock</SubmitButton>
      <Link href="/profiles" className="btn btn-quiet w-full">Back to readers</Link>
      <p className="hint">Forgot it? Sign out, use “Forgot password”, then set a new PIN in Settings.</p>
    </form>
  );
}

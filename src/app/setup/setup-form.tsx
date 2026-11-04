"use client";
import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { ChildFields } from "@/components/child-fields";
import { completeSetup } from "@/app/parent/actions";

export function SetupForm() {
  const [state, action] = useActionState(completeSetup, undefined);
  return (
    <form action={action} className="mt-6 space-y-8">
      <fieldset className="space-y-4">
        <legend className="font-display text-lg">Grown-ups PIN</legend>
        <p className="hint">Kids need this PIN to open billing and settings. Pick one they don&apos;t know.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="pin">4-digit PIN</label>
            <input className="field tracking-[0.5em]" id="pin" name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} type="password" required />
          </div>
          <div>
            <label className="label" htmlFor="pin_confirm">Type it again</label>
            <input className="field tracking-[0.5em]" id="pin_confirm" name="pin_confirm" inputMode="numeric" pattern="\d{4}" maxLength={4} type="password" required />
          </div>
        </div>
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="font-display text-lg">First reader</legend>
        <ChildFields idPrefix="first" />
      </fieldset>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary w-full" pending="Setting up…">Start reading</SubmitButton>
    </form>
  );
}

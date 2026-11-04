"use client";
import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { changePin, deleteAccount, updateSettings } from "../../actions";

export function SettingsForm({ displayName, weeklyDigest }: { displayName: string; weeklyDigest: boolean }) {
  const [state, action] = useActionState(updateSettings, undefined);
  return (
    <form action={action} className="mt-4 space-y-4">
      <div>
        <label className="label" htmlFor="display_name">Your first name</label>
        <input className="field max-w-sm" id="display_name" name="display_name" defaultValue={displayName} maxLength={60} />
      </div>
      <label className="flex items-center gap-3">
        <input type="checkbox" name="weekly_digest" defaultChecked={weeklyDigest} className="h-5 w-5 accent-ink" />
        Email me a weekly summary of what my kids read
      </label>
      <FormMessage state={state} />
      <SubmitButton>Save settings</SubmitButton>
    </form>
  );
}

export function PinForm() {
  const [state, action] = useActionState(changePin, undefined);
  return (
    <form action={action} className="mt-4 grid max-w-md gap-4 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="new-pin">New PIN</label>
        <input className="field tracking-[0.5em]" id="new-pin" name="pin" type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} required />
      </div>
      <div>
        <label className="label" htmlFor="new-pin2">Type it again</label>
        <input className="field tracking-[0.5em]" id="new-pin2" name="pin_confirm" type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} required />
      </div>
      <div className="sm:col-span-2 space-y-3">
        <FormMessage state={state} />
        <SubmitButton>Change PIN</SubmitButton>
      </div>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccount, undefined);
  return (
    <form action={action} className="mt-4 space-y-3">
      <div>
        <label className="label" htmlFor="confirm">Type DELETE to confirm</label>
        <input className="field max-w-xs" id="confirm" name="confirm" autoComplete="off" required />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-danger" pending="Deleting…">Delete my account</SubmitButton>
    </form>
  );
}

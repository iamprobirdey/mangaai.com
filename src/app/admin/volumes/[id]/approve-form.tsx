"use client";
import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { approveVolume } from "../../actions";

export function ApproveForm({ chapterId }: { chapterId: string }) {
  const [state, action] = useActionState(approveVolume, undefined);
  return (
    <form action={action} className="mt-3 space-y-4">
      <input type="hidden" name="id" value={chapterId} />
      <label className="flex items-start gap-3">
        <input type="checkbox" name="checked" className="mt-1 h-5 w-5 accent-ink" required />
        I&apos;ve looked at every page and it&apos;s suitable for this series&apos; age range.
      </label>
      <p className="hint">Approving publishes the volume right away.</p>
      <FormMessage state={state} />
      <SubmitButton pending="Publishing…">Approve and publish</SubmitButton>
    </form>
  );
}

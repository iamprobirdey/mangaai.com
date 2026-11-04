"use client";
import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { approveChapter } from "../../actions";

export function ApproveForm({ chapterId, defaultRelease }: { chapterId: string; defaultRelease: string }) {
  const [state, action] = useActionState(approveChapter, undefined);
  // datetime-local has no timezone; send the browser's offset so the server stores the right instant.

  return (
    <form action={action} className="mt-3 space-y-4">
      <input type="hidden" name="id" value={chapterId} />
      <input
        type="hidden"
        name="tz_offset"
        defaultValue="0"
        ref={(el) => {
          if (el) el.value = String(new Date().getTimezoneOffset());
        }}
      />
      <div>
        <label className="label" htmlFor="publish_at">Release time</label>
        <input className="field max-w-xs" id="publish_at" name="publish_at" type="datetime-local" defaultValue={defaultRelease} />
        <p className="hint mt-1">Leave as is for the next release day, or clear it to publish right away.</p>
      </div>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="checked" className="mt-1 h-5 w-5 accent-ink" required />
        I&apos;ve looked at every page and it&apos;s suitable for this series&apos; age range.
      </label>
      <FormMessage state={state} />
      <SubmitButton pending="Approving…">Approve chapter</SubmitButton>
    </form>
  );
}

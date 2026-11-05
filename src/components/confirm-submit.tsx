"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * A destructive submit button that asks first. The first click only reveals the warning and a
 * real "Yes, delete" submit; nothing is sent until that second click. Put it inside the <form>.
 */
export function ConfirmSubmit({ label, warning, confirmLabel = "Yes, delete it" }: { label: string; warning: string; confirmLabel?: string }) {
  const [asking, setAsking] = useState(false);
  const { pending } = useFormStatus();

  if (!asking) {
    return (
      <button type="button" className="btn btn-danger" onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  }
  return (
    <div role="alertdialog" aria-live="assertive" className="rounded-lg border-[3px] border-pop p-4">
      <p className="font-bold">{warning}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="submit" className="btn btn-danger" disabled={pending}>
          {pending ? "Deleting…" : confirmLabel}
        </button>
        <button type="button" className="btn" onClick={() => setAsking(false)} disabled={pending} autoFocus>
          Cancel
        </button>
      </div>
    </div>
  );
}

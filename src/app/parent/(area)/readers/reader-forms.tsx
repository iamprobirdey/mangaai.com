"use client";
import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { ChildFields } from "@/components/child-fields";
import type { Child } from "@/lib/dal";
import { createChild, updateChild } from "../../actions";

export function EditReaderForm({
  child,
  series,
  hiddenIds,
}: {
  child: Child;
  series: { id: string; title: string }[];
  hiddenIds: string[];
}) {
  const [state, action] = useActionState(updateChild, undefined);
  return (
    <form action={action} className="mt-4 space-y-5">
      <input type="hidden" name="id" value={child.id} />
      <ChildFields
        idPrefix={child.id}
        nickname={child.nickname}
        avatar={child.avatar}
        ageBand={child.age_band}
        dailyLimit={child.daily_limit_minutes}
      />
      {series.length ? (
        <fieldset>
          <legend className="label">Hide series</legend>
          <p className="hint mb-2">Ticked series won&apos;t appear for {child.nickname}.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {series.map((s) => (
              <label key={s.id} className="flex items-center gap-2">
                <input type="checkbox" name={`hide:${s.id}`} defaultChecked={hiddenIds.includes(s.id)} className="h-5 w-5 accent-ink" />
                {s.title}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <FormMessage state={state} />
      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}

export function AddReaderForm() {
  const [state, action] = useActionState(createChild, undefined);
  return (
    <form action={action} className="mt-4 space-y-5">
      <ChildFields idPrefix="new" />
      <FormMessage state={state} />
      <SubmitButton pending="Adding…">Add reader</SubmitButton>
    </form>
  );
}

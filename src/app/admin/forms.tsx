"use client";
import { useActionState, type ReactNode } from "react";
import { FormMessage, SubmitButton, type FormState } from "@/components/forms";

/** Generic client wrapper so server-rendered fields can post to a server action and show its message. */
export function ActionForm({
  action,
  children,
  submit,
  className = "space-y-4",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  submit: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      <FormMessage state={state} />
      <SubmitButton>{submit}</SubmitButton>
    </form>
  );
}

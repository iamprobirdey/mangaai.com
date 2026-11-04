"use client";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export type FormState = { error?: string; ok?: string } | undefined;

export function SubmitButton({
  children,
  pending,
  className = "btn btn-primary",
}: {
  children: ReactNode;
  pending?: ReactNode;
  className?: string;
}) {
  const status = useFormStatus();
  return (
    <button type="submit" className={className} disabled={status.pending} aria-busy={status.pending}>
      {status.pending ? (pending ?? "Saving…") : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <p role={state.error ? "alert" : "status"} className={`text-sm font-bold ${state.error ? "text-alert" : "text-leaf"}`}>
      {state.error ?? state.ok}
    </p>
  );
}

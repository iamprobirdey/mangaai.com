"use client";
import type { ReactNode } from "react";
import { rememberReader } from "@/components/service-worker";

export function ReaderButton({ childId, action, children }: { childId: string; action: () => Promise<void>; children: ReactNode }) {
  return (
    <form action={action} onSubmit={() => rememberReader(childId)}>
      {children}
    </form>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-display text-xl text-ink" aria-label="MangaAI home">
      <span aria-hidden className="grid h-9 w-9 place-items-center rounded-lg border-[3px] border-ink bg-sun text-base">
        漫
      </span>
      MangaAI
    </Link>
  );
}

export function Cover({
  src,
  title,
  className = "",
  alt = "",
}: {
  src: string | null;
  title: string;
  className?: string;
  /** Leave empty when the title is shown next to the cover; set it on pages where the cover stands alone. */
  alt?: string;
}) {
  return (
    <div className={`relative aspect-[3/4] overflow-hidden rounded-lg border-[3px] border-ink bg-tone-deep screentone ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="absolute inset-0 grid place-items-center p-3 text-center font-display text-sm">{title}</span>
      )}
    </div>
  );
}

export function PageShell({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return <main className={`mx-auto w-full ${narrow ? "max-w-md" : "max-w-6xl"} flex-1 px-4 py-8 sm:px-6`}>{children}</main>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  const color = tone === "error" ? "border-alert text-alert" : tone === "success" ? "border-leaf text-leaf" : "border-ink";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-lg border-2 bg-paper px-4 py-3 text-sm font-bold ${color}`}>
      {children}
    </div>
  );
}

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="panel-flat p-4">
      <div className="text-sm text-ink-soft">{label}</div>
      <div className="mt-1 font-display text-2xl">{value}</div>
      {note ? <div className="hint mt-1">{note}</div> : null}
    </div>
  );
}

"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Direction } from "@/lib/constants";

type Page = { n: number; url: string; w: number; h: number };
type EarnedBadge = { key: string; icon: string; name: string };

type Props = {
  chapterId: string;
  title: string;
  chapterTitle: string;
  direction: Direction;
  pages: Page[];
  startPage: number;
  seriesHref: string;
  next: { href: string; label: string; locked: boolean } | null;
  childId: string;
  avatar: string;
};

const HEARTBEAT_SECONDS = 30;
const noopSubscribe = () => () => {};

function storageGet(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function storageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode: the hint just shows again next time */
  }
}

export function Reader(props: Props) {
  const { chapterId, pages, direction } = props;
  const total = pages.length;
  const vertical = direction === "vertical";
  const rtl = direction === "rtl";

  // index === total means the "chapter finished" screen.
  const [index, setIndex] = useState(Math.max(0, props.startPage - 1));
  const [chrome, setChrome] = useState(true);
  const [zoomed, setZoomed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [earned, setEarned] = useState<EarnedBadge[]>([]);
  const [toast, setToast] = useState<EarnedBadge[] | null>(null);
  const hintKey = `mg_rtl_hint_${props.childId}`;
  const hintSeen = useSyncExternalStore(noopSubscribe, () => storageGet(hintKey) === "1", () => true);
  const [hintDismissed, setHintDismissed] = useState(false);
  const showHint = rtl && !hintSeen && !hintDismissed;
  const lastSent = useRef(0);
  const swipe = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const verticalRefs = useRef<(HTMLElement | null)[]>([]);

  const atEnd = index >= total;
  const go = useCallback((delta: number) => {
    setZoomed(false);
    setIndex((i) => Math.min(total, Math.max(0, i + delta)));
  }, [total]);

  // Save progress shortly after the page changes.
  useEffect(() => {
    const page = Math.min(index + 1, total);
    if (page === lastSent.current) return;
    const t = setTimeout(async () => {
      lastSent.current = page;
      try {
        const res = await fetch("/api/progress", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chapterId, page }),
        });
        if (res.ok) {
          const data = (await res.json()) as { badges: EarnedBadge[] };
          if (data.badges.length) {
            setEarned((e) => [...e, ...data.badges]);
            setToast(data.badges);
          }
        }
      } catch {
        lastSent.current = 0; // retry on the next page turn
      }
    }, index >= total ? 0 : 600);
    return () => clearTimeout(t);
  }, [index, total, chapterId]);

  // Reading-time heartbeat (only while the page is visible) and the daily limit.
  useEffect(() => {
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/heartbeat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chapterId, seconds: HEARTBEAT_SECONDS }),
        });
        if (res.ok && ((await res.json()) as { locked: boolean }).locked) setLocked(true);
      } catch {
        /* offline: try again next tick */
      }
    }, HEARTBEAT_SECONDS * 1000);
    return () => clearInterval(id);
  }, [chapterId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Preload the next two pages.
  useEffect(() => {
    if (vertical) return;
    for (const p of pages.slice(index + 1, index + 3)) {
      const img = new Image();
      img.src = p.url;
    }
  }, [index, pages, vertical]);

  // Keyboard: arrows follow the reading direction.
  useEffect(() => {
    if (vertical) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(false);
      if (e.key === "ArrowRight") go(rtl ? -1 : 1);
      if (e.key === "ArrowLeft") go(rtl ? 1 : -1);
      if (e.key === " " && !zoomed) {
        e.preventDefault();
        go(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, rtl, vertical, zoomed]);

  // Vertical mode: track which page is on screen, and jump to the saved page on open.
  useEffect(() => {
    if (!vertical) return;
    verticalRefs.current[props.startPage - 1]?.scrollIntoView({ block: "start" });
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setIndex(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { threshold: 0.5 },
    );
    verticalRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [vertical, props.startPage]);

  function onStageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (zoomed || swipe.current?.moved) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    if (x < 0.33) go(rtl ? 1 : -1);
    else if (x > 0.67) go(rtl ? -1 : 1);
    else setChrome((c) => !c);
  }

  function onPointerDown(e: React.PointerEvent) {
    swipe.current = { x: e.clientX, y: e.clientY, moved: false };
  }
  function onPointerUp(e: React.PointerEvent) {
    const s = swipe.current;
    if (!s || zoomed) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      s.moved = true;
      // Manga (rtl): drag the page to the right to move forward. Comics (ltr): drag left.
      go(rtl ? (dx > 0 ? 1 : -1) : dx < 0 ? 1 : -1);
      setTimeout(() => (swipe.current = null), 50);
    }
  }

  const page = pages[Math.min(index, total - 1)];
  const progressPct = Math.round((Math.min(index + 1, total) / total) * 100);

  const endScreen = (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center text-paper">
      <div className="text-6xl" aria-hidden>{props.avatar}</div>
      <h2 className="mt-4 text-3xl">You finished it!</h2>
      <p className="mt-2 text-lg">{props.chapterTitle}</p>
      {earned.length ? (
        <ul className="mt-6 flex flex-wrap justify-center gap-3">
          {earned.map((b) => (
            <li key={b.key} className="animate-pop-in rounded-xl border-[3px] border-paper bg-pop px-4 py-3 font-bold">
              <span aria-hidden>{b.icon}</span> New badge: {b.name}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-8 flex w-full flex-col gap-3">
        {props.next ? (
          props.next.locked ? (
            <p className="rounded-lg border-2 border-paper p-4">The next chapter is for members. Ask a grown-up to unlock it.</p>
          ) : (
            <Link href={props.next.href} className="btn btn-primary text-lg">Read {props.next.label}</Link>
          )
        ) : (
          <p className="rounded-lg border-2 border-paper p-4">You&apos;re all caught up. New chapters are coming soon!</p>
        )}
        <Link href={props.seriesHref} className="btn">Back to the series</Link>
        {!vertical ? (
          <button type="button" className="btn btn-quiet text-paper" onClick={() => go(-1)}>Read the last page again</button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 flex flex-col bg-ink text-paper select-none" dir="ltr">
      {/* Top bar */}
      <header
        className={`absolute inset-x-0 top-0 z-20 flex items-center gap-3 bg-ink/95 px-3 py-2 transition-opacity ${chrome || atEnd ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <Link href={props.seriesHref} className="btn min-h-0 px-3 py-1" aria-label="Close reader">✕</Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm">{props.title}</p>
          <p className="truncate text-sm opacity-80">{props.chapterTitle}</p>
        </div>
        <p className="shrink-0 text-sm font-bold" aria-live="polite">
          {atEnd ? "Done" : `${index + 1} / ${total}`}
        </p>
        {!vertical && !atEnd ? (
          <button type="button" className="btn min-h-0 px-3 py-1" onClick={() => setZoomed((z) => !z)} aria-pressed={zoomed}>
            {zoomed ? "Fit" : "Zoom"}
          </button>
        ) : null}
      </header>

      {/* Pages */}
      {vertical ? (
        <div className="flex-1 overflow-y-auto pt-14" onClick={() => setChrome((c) => !c)}>
          <div className="mx-auto max-w-3xl">
            {pages.map((p, i) => (
              <section key={p.n} ref={(el) => { verticalRefs.current[i] = el; }} data-index={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  width={p.w}
                  height={p.h}
                  alt={`Page ${p.n}`}
                  loading={Math.abs(i - (props.startPage - 1)) < 3 ? "eager" : "lazy"}
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  className="block h-auto w-full"
                />
              </section>
            ))}
            <section ref={(el) => { verticalRefs.current[total] = el; }} data-index={total}>
              {endScreen}
            </section>
          </div>
        </div>
      ) : atEnd ? (
        <div className="flex-1 overflow-y-auto pt-14">{endScreen}</div>
      ) : (
        <div
          className={`relative flex-1 ${zoomed ? "overflow-auto" : "flex items-center justify-center overflow-hidden"}`}
          onClick={onStageClick}
          onDoubleClick={() => setZoomed((z) => !z)}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          style={{ touchAction: zoomed ? "auto" : "pan-y pinch-zoom" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={page.n}
            src={page.url}
            width={page.w}
            height={page.h}
            alt={`Page ${page.n} of ${total}`}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            className={zoomed ? "block h-auto max-w-none" : "block h-auto max-h-dvh w-auto max-w-full object-contain"}
            style={zoomed ? { width: "200%" } : undefined}
          />
        </div>
      )}

      {/* Bottom bar */}
      {!vertical && !atEnd ? (
        <footer
          className={`absolute inset-x-0 bottom-0 z-20 flex items-center gap-3 bg-ink/95 px-3 py-3 transition-opacity ${chrome ? "opacity-100" : "pointer-events-none opacity-0"}`}
          dir={rtl ? "rtl" : "ltr"}
        >
          <button type="button" className="btn min-h-0 px-4 py-1" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous page">
            {rtl ? "→" : "←"}
          </button>
          <label className="sr-only" htmlFor="page-slider">Page</label>
          <input
            id="page-slider"
            type="range"
            min={1}
            max={total}
            value={index + 1}
            onChange={(e) => setIndex(Number(e.target.value) - 1)}
            className="flex-1 accent-sun"
          />
          <button type="button" className="btn btn-primary min-h-0 px-4 py-1" onClick={() => go(1)} aria-label="Next page">
            {rtl ? "←" : "→"}
          </button>
        </footer>
      ) : null}
      <div className="absolute inset-x-0 top-0 z-30 h-1 bg-paper/20" aria-hidden>
        <div className="h-full bg-sun" style={{ width: `${atEnd ? 100 : progressPct}%` }} />
      </div>

      {showHint ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-ink/80 p-6">
          <div className="bubble max-w-sm text-ink">
            <p className="font-display text-xl">Manga reads right to left!</p>
            <p className="mt-2">Start at the top right of each page. Tap the left side, or swipe right, to turn the page.</p>
            <button
              type="button"
              className="btn btn-primary mt-4"
              autoFocus
              onClick={() => {
                storageSet(hintKey, "1");
                setHintDismissed(true);
              }}
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}

      {locked ? (
        <div className="absolute inset-0 z-50 grid place-items-center bg-ink/95 p-6 text-center" role="dialog" aria-modal="true" aria-labelledby="timeup">
          <div>
            <div className="text-6xl" aria-hidden>🌙</div>
            <h2 id="timeup" className="mt-3 text-2xl">Reading time is done for today</h2>
            <p className="mt-2">We saved your page. See you tomorrow!</p>
            <Link href="/read" className="btn btn-primary mt-6">OK</Link>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 z-40 flex justify-center px-4" role="status">
          <div className="animate-pop-in rounded-xl border-[3px] border-paper bg-pop px-5 py-3 text-center font-bold shadow-[4px_4px_0_#000]">
            {toast.map((b) => (
              <p key={b.key}>
                <span aria-hidden>{b.icon}</span> You earned the {b.name} badge!
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

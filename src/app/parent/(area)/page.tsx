import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccess, getChildren, getProfile } from "@/lib/dal";
import { weeklyStats } from "@/lib/family-stats";
import { avatarEmoji } from "@/lib/constants";
import { BADGES, type BadgeKey } from "@/lib/badges";
import { formatDate, formatMinutes } from "@/lib/dates";
import { Notice } from "@/components/ui";

export const metadata = { title: "Grown-ups" };

const MAX_READERS = 5;

export default async function ParentOverview() {
  const [profile, children] = await Promise.all([getProfile(), getChildren()]);
  const access = await getAccess(profile.id);
  const stats = await weeklyStats(await createClient(), children.map((c) => c.id));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Hi{profile.display_name ? `, ${profile.display_name}` : ""}</h1>
          <p className="mt-1">Here&apos;s what your readers did in the last 7 days.</p>
        </div>
        {children.length < MAX_READERS ? (
          <Link href="/parent/readers#add" className="btn btn-primary">+ Add a reader</Link>
        ) : null}
      </div>

      {access.state === "none" ? (
        <Notice>
          Kids can peek at the first few pages of every book. <Link className="underline" href="/parent/billing">Start the free trial</Link> to read every book in full.
        </Notice>
      ) : access.state === "trial" ? (
        <Notice>Free trial until {formatDate(access.until)}. Your first payment is taken then.</Notice>
      ) : access.state === "past_due" || access.state === "grace" ? (
        <Notice tone="error">
          Your last payment didn&apos;t go through. Reading stays open until {formatDate(access.until)}.{" "}
          <Link className="underline" href="/parent/billing">Fix payment</Link>
        </Notice>
      ) : access.state === "ended" ? (
        <Notice tone="error">
          Your subscription has ended. <Link className="underline" href="/parent/billing">Restart it</Link> to unlock every series again.
        </Notice>
      ) : null}

      <ul className="grid gap-5 md:grid-cols-2">
        {children.map((c) => {
          const s = stats.get(c.id)!;
          return (
            <li key={c.id} className="panel p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-full border-[3px] border-ink bg-tone text-3xl">{avatarEmoji(c.avatar)}</span>
                <div>
                  <h2 className="text-xl">{c.nickname}</h2>
                  <p className="hint">
                    {c.daily_limit_minutes ? `Daily limit: ${c.daily_limit_minutes} min` : "No daily limit"}
                  </p>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-tone p-3">
                  <dt className="hint">Reading time</dt>
                  <dd className="font-display text-lg">{formatMinutes(s.seconds)}</dd>
                </div>
                <div className="rounded-lg bg-tone p-3">
                  <dt className="hint">Days read</dt>
                  <dd className="font-display text-lg">{s.daysRead} of 7</dd>
                </div>
                <div className="rounded-lg bg-tone p-3">
                  <dt className="hint">Streak</dt>
                  <dd className="font-display text-lg">{s.streak} {s.streak === 1 ? "day" : "days"}</dd>
                </div>
              </dl>
              <h3 className="mt-5 text-base">Books finished</h3>
              {s.chaptersFinished.length ? (
                <ul className="mt-2 space-y-1">
                  {s.chaptersFinished.slice(0, 6).map((ch, i) => (
                    <li key={i}>
                      <span className="font-bold">{ch.series}</span> — {ch.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="hint mt-1">None this week yet.</p>
              )}
              {s.badges.length ? (
                <p className="mt-4">
                  New badges:{" "}
                  {s.badges.map((b) => (
                    <span key={b} className="tag mr-1">
                      {BADGES[b as BadgeKey]?.icon} {BADGES[b as BadgeKey]?.name ?? b}
                    </span>
                  ))}
                </p>
              ) : null}
            </li>
          );
        })}
        {children.length < MAX_READERS ? (
          <li>
            <Link
              href="/parent/readers#add"
              className="panel-flat flex h-full min-h-40 flex-col items-center justify-center gap-2 border-dashed p-5 text-center hover:bg-tone"
            >
              <span className="grid h-14 w-14 place-items-center rounded-full border-[3px] border-ink bg-paper font-display text-3xl" aria-hidden>+</span>
              <span className="font-display text-lg">Add a reader</span>
              <span className="hint">{MAX_READERS - children.length} of {MAX_READERS} profiles left</span>
            </Link>
          </li>
        ) : null}
      </ul>
      <p className="hint">
        A summary like this arrives by email every Sunday. You can turn it off in <Link className="underline" href="/parent/settings">Settings</Link>.
      </p>
    </div>
  );
}

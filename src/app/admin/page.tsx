import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { formatMoney } from "@/lib/pricing";
import { addDays, localDate, requestTime } from "@/lib/dates";
import { Stat } from "@/components/ui";

export const metadata = { title: "Analytics" };

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");

/** Recurring revenue per month, by currency (yearly plans count as 1/12). Never adds rupees to dollars. */
function mrrByCurrency(rows: { plan: string; amount: number | null; currency: string | null }[]) {
  const out = new Map<string, number>();
  for (const r of rows) {
    if (!r.amount || !r.currency) continue;
    out.set(r.currency, (out.get(r.currency) ?? 0) + (r.plan === "annual" ? r.amount / 12 : r.amount));
  }
  return [...out.entries()].map(([currency, minor]) => formatMoney(Math.round(minor), currency));
}

export default async function AdminAnalytics() {
  const admin = createAdminClient();
  const now = requestTime();
  const since30 = new Date(now - 30 * 86_400_000).toISOString();
  const today = localDate(serverEnv.timezone());

  const [{ data: subs }, { count: families }, { count: readers }, { data: activeDays }, { data: digests }, { data: chapterStats }, { data: topSeries }] =
    await Promise.all([
      admin.from("subscriptions").select("plan,status,trial_end,first_charged_at,cancelled_at,updated_at,current_end,amount,currency").neq("status", "created"),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "parent"),
      admin.from("children").select("id", { count: "exact", head: true }),
      admin.from("reading_days").select("child_id").gte("day", addDays(today, -6)),
      admin.from("email_log").select("opened_at").eq("kind", "weekly_digest").gte("sent_at", since30),
      admin.rpc("admin_chapter_stats", { p_limit: 25 }),
      admin.rpc("admin_top_series", { p_days: 30 }),
    ]);

  const all = subs ?? [];
  const paying = all.filter((s) => ["active", "pending"].includes(s.status) || (s.status === "cancelled" && s.current_end && Date.parse(s.current_end) > now));
  const trialing = all.filter((s) => s.status === "authenticated" && s.trial_end && Date.parse(s.trial_end) > now);
  const mrr = mrrByCurrency(paying);

  // Trial conversion: of trials that have ended, how many were charged at least once.
  const endedTrials = all.filter((s) => s.trial_end && Date.parse(s.trial_end) <= now);
  const converted = endedTrials.filter((s) => s.first_charged_at);

  // Churn (last 30 days): subscriptions that stopped (cancelled, halted, completed) vs. those paying at the start of the window.
  const churned = all.filter((s) => ["cancelled", "halted", "completed", "expired"].includes(s.status) && s.updated_at >= since30 && s.first_charged_at);
  const churnBase = paying.length + churned.length;
  const activeReaders = new Set((activeDays ?? []).map((d) => d.child_id)).size;

  return (
    <div className="space-y-10">
      <h1 className="text-3xl">Analytics</h1>

      <section>
        <h2 className="text-xl">Revenue</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Monthly recurring revenue"
            value={mrr.length ? mrr.join(" + ") : "—"}
            note="Yearly plans counted as 1/12 per month, shown per currency"
          />
          <Stat label="Paying families" value={paying.length} note={`${paying.filter((s) => s.plan === "annual").length} on the yearly plan`} />
          <Stat label="In free trial" value={trialing.length} />
          <Stat label="Failed payments in grace" value={all.filter((s) => s.status === "pending" || s.status === "halted").length} />
        </div>
      </section>

      <section>
        <h2 className="text-xl">Conversion and churn</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Trial → paid" value={pct(converted.length, endedTrials.length)} note={`${converted.length} of ${endedTrials.length} finished trials`} />
          <Stat label="Churn, last 30 days" value={pct(churned.length, churnBase)} note={`${churned.length} paying families stopped`} />
          <Stat label="Families signed up" value={families ?? 0} />
          <Stat label="Reader profiles" value={readers ?? 0} note={families ? `${((readers ?? 0) / families).toFixed(1)} per family` : undefined} />
        </div>
      </section>

      <section>
        <h2 className="text-xl">Engagement</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Active readers, last 7 days" value={activeReaders} note={pct(activeReaders, readers ?? 0) + " of all reader profiles"} />
          <Stat
            label="Weekly parent email opens, last 30 days"
            value={pct((digests ?? []).filter((d) => d.opened_at).length, (digests ?? []).length)}
            note={`${(digests ?? []).length} emails sent`}
          />
        </div>
      </section>

      <section>
        <h2 className="text-xl">Top series, last 30 days</h2>
        <table className="mt-3 w-full overflow-hidden rounded-lg border-[3px] border-ink bg-paper text-left">
          <thead className="border-b-2 border-ink bg-tone">
            <tr>
              <th className="p-3">Series</th>
              <th className="p-3">Readers</th>
              <th className="p-3">Books finished</th>
            </tr>
          </thead>
          <tbody>
            {(topSeries ?? []).map((s: { series_id: string; title: string; readers: number; chapters_completed: number }) => (
              <tr key={s.series_id} className="border-b border-tone-deep last:border-0">
                <td className="p-3 font-bold">{s.title}</td>
                <td className="p-3">{s.readers}</td>
                <td className="p-3">{s.chapters_completed}</td>
              </tr>
            ))}
            {!topSeries?.length ? (
              <tr><td className="p-3" colSpan={3}>No reading yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-xl">Where readers stop</h2>
        <p className="hint mt-1">For each chapter: how many readers started, how many finished, and the page where most unfinished readers stopped.</p>
        <div className="mt-3 overflow-x-auto rounded-lg border-[3px] border-ink bg-paper">
          <table className="w-full text-left">
            <thead className="border-b-2 border-ink bg-tone">
              <tr>
                <th className="p-3">Volume</th>
                <th className="p-3">Started</th>
                <th className="p-3">Finished</th>
                <th className="p-3">Most common stop</th>
              </tr>
            </thead>
            <tbody>
              {(chapterStats ?? []).map(
                (c: {
                  chapter_id: string;
                  series_title: string;
                  chapter_number: number;
                  chapter_title: string | null;
                  page_count: number;
                  readers: number;
                  completed: number;
                  top_dropoff_page: number | null;
                  dropoff_count: number;
                }) => (
                  <tr key={c.chapter_id} className="border-b border-tone-deep last:border-0">
                    <td className="p-3">
                      <span className="font-bold">{c.series_title}</span> — Vol. {Number(c.chapter_number)}
                      {c.chapter_title ? `: ${c.chapter_title}` : ""}
                    </td>
                    <td className="p-3">{c.readers}</td>
                    <td className="p-3">{c.completed} ({pct(c.completed, c.readers)})</td>
                    <td className="p-3">
                      {c.top_dropoff_page ? `Page ${c.top_dropoff_page} of ${c.page_count} (${c.dropoff_count} readers)` : "—"}
                    </td>
                  </tr>
                ),
              )}
              {!chapterStats?.length ? (
                <tr><td className="p-3" colSpan={4}>No approved volumes yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

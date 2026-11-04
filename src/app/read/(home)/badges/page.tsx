import { requireChild } from "@/lib/dal";
import { childSummary } from "@/lib/reading";
import { BADGES, BADGE_ORDER } from "@/lib/badges";

export const metadata = { title: "Badges" };

export default async function BadgesPage() {
  const child = await requireChild();
  const summary = await childSummary(child);
  const earned = new Set(summary.badges);

  return (
    <div className="space-y-8">
      <div className="panel flex flex-wrap items-center gap-6 p-6">
        <span className="text-6xl" aria-hidden>🔥</span>
        <div>
          <h1 className="text-3xl">{summary.streak} day streak</h1>
          <p className="mt-1">
            You read on {summary.daysThisWeek} of the last 7 days. Read at least every other day to keep your streak going.
          </p>
        </div>
      </div>
      <section>
        <h2 className="text-2xl">Badges</h2>
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {BADGE_ORDER.map((key) => {
            const b = BADGES[key];
            const has = earned.has(key);
            return (
              <li key={key} className={`panel-flat p-4 text-center ${has ? "" : "opacity-60"}`}>
                <div className={`text-5xl ${has ? "" : "grayscale"}`} aria-hidden>{b.icon}</div>
                <div className="mt-2 font-display">{b.name}</div>
                <div className="hint">{has ? "Earned!" : b.how}</div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

import { daysBetween } from "./dates";

/**
 * A gentle streak: it keeps going as long as the child reads at least once every two days,
 * so missing a single day never breaks it. `days` are YYYY-MM-DD reading days.
 */
export function computeStreak(days: string[], today: string): number {
  const sorted = [...new Set(days)].sort().reverse();
  if (sorted.length === 0 || daysBetween(today, sorted[0]) > 2) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (daysBetween(sorted[i - 1], sorted[i]) > 2) break;
    streak++;
  }
  return streak;
}

export type BadgeKey =
  | "first_chapter"
  | "chapters_5"
  | "chapters_25"
  | "chapters_100"
  | "streak_3"
  | "streak_7"
  | "streak_30"
  | "series_finisher"
  | "explorer";

export const BADGES: Record<BadgeKey, { icon: string; name: string; how: string }> = {
  first_chapter: { icon: "🌱", name: "First chapter", how: "Finish your first chapter" },
  chapters_5: { icon: "📚", name: "Page turner", how: "Finish 5 chapters" },
  chapters_25: { icon: "🦉", name: "Bookworm", how: "Finish 25 chapters" },
  chapters_100: { icon: "🏆", name: "Manga master", how: "Finish 100 chapters" },
  streak_3: { icon: "🔥", name: "Warming up", how: "Reach a 3-day reading streak" },
  streak_7: { icon: "🌟", name: "Week of stories", how: "Reach a 7-day reading streak" },
  streak_30: { icon: "🚀", name: "Unstoppable", how: "Reach a 30-day reading streak" },
  series_finisher: { icon: "🎌", name: "Series finisher", how: "Read every chapter of a series" },
  explorer: { icon: "🧭", name: "Explorer", how: "Finish chapters in 3 different genres" },
};

export const BADGE_ORDER = Object.keys(BADGES) as BadgeKey[];

export function earnedBadges(stats: {
  chaptersCompleted: number;
  streak: number;
  finishedSeries: boolean;
  genresCompleted: number;
}): BadgeKey[] {
  const out: BadgeKey[] = [];
  if (stats.chaptersCompleted >= 1) out.push("first_chapter");
  if (stats.chaptersCompleted >= 5) out.push("chapters_5");
  if (stats.chaptersCompleted >= 25) out.push("chapters_25");
  if (stats.chaptersCompleted >= 100) out.push("chapters_100");
  if (stats.streak >= 3) out.push("streak_3");
  if (stats.streak >= 7) out.push("streak_7");
  if (stats.streak >= 30) out.push("streak_30");
  if (stats.finishedSeries) out.push("series_finisher");
  if (stats.genresCompleted >= 3) out.push("explorer");
  return out;
}

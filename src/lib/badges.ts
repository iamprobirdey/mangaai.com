export type BadgeKey =
  | "first_book"
  | "books_3"
  | "books_10"
  | "books_25"
  | "streak_3"
  | "streak_7"
  | "streak_30"
  | "series_finisher"
  | "explorer";

export const BADGES: Record<BadgeKey, { icon: string; name: string; how: string }> = {
  first_book: { icon: "🌱", name: "First book", how: "Finish your first book" },
  books_3: { icon: "📚", name: "Page turner", how: "Finish 3 books" },
  books_10: { icon: "🦉", name: "Bookworm", how: "Finish 10 books" },
  books_25: { icon: "🏆", name: "Manga master", how: "Finish 25 books" },
  streak_3: { icon: "🔥", name: "Warming up", how: "Reach a 3-day reading streak" },
  streak_7: { icon: "🌟", name: "Week of stories", how: "Reach a 7-day reading streak" },
  streak_30: { icon: "🚀", name: "Unstoppable", how: "Reach a 30-day reading streak" },
  series_finisher: { icon: "🎌", name: "Series finisher", how: "Read every volume of a series" },
  explorer: { icon: "🧭", name: "Explorer", how: "Finish books in 3 different genres" },
};

export const BADGE_ORDER = Object.keys(BADGES) as BadgeKey[];

export function earnedBadges(stats: {
  booksCompleted: number;
  streak: number;
  finishedSeries: boolean;
  genresCompleted: number;
}): BadgeKey[] {
  const out: BadgeKey[] = [];
  // Targets are whole books (one volume = one PDF), so they're lower than chapter-based ones.
  if (stats.booksCompleted >= 1) out.push("first_book");
  if (stats.booksCompleted >= 3) out.push("books_3");
  if (stats.booksCompleted >= 10) out.push("books_10");
  if (stats.booksCompleted >= 25) out.push("books_25");
  if (stats.streak >= 3) out.push("streak_3");
  if (stats.streak >= 7) out.push("streak_7");
  if (stats.streak >= 30) out.push("streak_30");
  if (stats.finishedSeries) out.push("series_finisher");
  if (stats.genresCompleted >= 3) out.push("explorer");
  return out;
}

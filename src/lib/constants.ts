export const AGE_BANDS = ["4-6", "7-9", "10-12", "13+"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export const AGE_BAND_LABELS: Record<AgeBand, string> = {
  "4-6": "Ages 4–6",
  "7-9": "Ages 7–9",
  "10-12": "Ages 10–12",
  "13+": "Ages 13+",
};

/** A child sees series rated for their band and every younger band. */
export function bandsUpTo(band: AgeBand): AgeBand[] {
  return AGE_BANDS.slice(0, AGE_BANDS.indexOf(band) + 1);
}

export const AVATARS = {
  cat: "🐱",
  fox: "🦊",
  panda: "🐼",
  frog: "🐸",
  dragon: "🐲",
  unicorn: "🦄",
  robot: "🤖",
  octopus: "🐙",
} as const;
export type AvatarKey = keyof typeof AVATARS;
export const avatarEmoji = (key: string) => AVATARS[key as AvatarKey] ?? AVATARS.cat;

export const GENRES = [
  "Adventure",
  "Funny",
  "Fantasy",
  "Animals",
  "Mystery",
  "Sports",
  "Science",
  "Friendship",
  "Sci-fi",
  "School",
] as const;

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const DAILY_LIMIT_OPTIONS = [null, 15, 30, 45, 60, 90, 120] as const;

export const DIRECTION_LABELS = {
  rtl: "Right to left (manga)",
  ltr: "Left to right (comic)",
  vertical: "Vertical scroll (webtoon)",
} as const;
export type Direction = keyof typeof DIRECTION_LABELS;

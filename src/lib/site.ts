import { AGE_BANDS, type AgeBand } from "@/lib/constants";

export const SITE_NAME = "MangaAI";

/** Who runs the service and how to reach them (privacy policy, terms, emails). */
export const OPERATOR = {
  name: "Probir Dey",
  tradingAs: "MangaAI",
  city: "Bengaluru, Karnataka, India",
  email: "hello@mangaai.com",
  /** Grievance Officer under the DPDP Act; answers privacy requests and complaints. */
  grievanceOfficer: "Probir Dey",
  privacyEmail: "privacy@mangaai.com",
} as const;

/** Bump when the privacy notice changes in a way parents must see; stored with each consent. */
export const PRIVACY_VERSION = "2026-11-05";

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Only the production site should be indexed. On Vercel, preview deployments are never indexable.
 * Elsewhere (local, other hosts) set SITE_INDEXABLE=true on the live site.
 */
export function isIndexable() {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === "production";
  return process.env.SITE_INDEXABLE === "true";
}

/** URL slugs for the age-range landing pages. */
export const AGE_SLUGS: Record<AgeBand, string> = {
  "4-6": "ages-4-6",
  "7-9": "ages-7-9",
  "10-12": "ages-10-12",
  "13+": "ages-13-and-up",
};

export function bandFromSlug(slug: string): AgeBand | null {
  return AGE_BANDS.find((b) => AGE_SLUGS[b] === slug) ?? null;
}

/** schema.org typicalAgeRange values. */
export const AGE_RANGE_SCHEMA: Record<AgeBand, string> = { "4-6": "4-6", "7-9": "7-9", "10-12": "10-12", "13+": "13-" };

/** Pages where it is acceptable to run third-party analytics: adult-facing pages only, never children's screens. */
export function isParentFacingPath(path: string) {
  if (["/", "/signup", "/login", "/forgot-password", "/reset-password", "/privacy", "/terms"].includes(path)) return true;
  return path.startsWith("/parent") || path.startsWith("/guides");
}

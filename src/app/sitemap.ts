import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { AGE_BANDS } from "@/lib/constants";
import { AGE_SLUGS, siteUrl } from "@/lib/site";
import { GUIDES } from "@/lib/guides";

export const revalidate = 3600;

/** Public, indexable pages only. Series are read with the publishable key, so only published ones appear. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/manga-for-kids`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/guides`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    ...AGE_BANDS.map((b) => ({ url: `${base}/manga-for-kids/${AGE_SLUGS[b]}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...GUIDES.map((g) => ({ url: `${base}/guides/${g.slug}`, lastModified: new Date(g.updated), changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    try {
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      const { data } = await supabase.from("series").select("slug,updated_at").eq("status", "published");
      for (const s of data ?? []) {
        entries.push({ url: `${base}/manga/${s.slug}`, lastModified: new Date(s.updated_at), changeFrequency: "weekly", priority: 0.8 });
      }
    } catch {
      /* database unreachable at build time: static pages only, refreshed hourly */
    }
  }
  return entries;
}

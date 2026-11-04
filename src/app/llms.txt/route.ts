import { AGE_BANDS, AGE_BAND_LABELS } from "@/lib/constants";
import { AGE_SLUGS, siteUrl } from "@/lib/site";
import { GUIDES } from "@/lib/guides";

export const revalidate = 86400;

/** A plain-text summary for AI assistants (llms.txt convention). */
export function GET() {
  const base = siteUrl();
  const body = `# MangaAI

> MangaAI is a subscription manga reading service made for children. A parent or guardian creates the family account and pays; each child gets a reader profile limited to stories for their age range. There are no ads, no chat and no contact with strangers. New chapters are released every week. Stories are created with AI tools and every page is reviewed by a person before publishing.

## For parents
- [How MangaAI works and pricing](${base}/)
- [Manga for kids, by age](${base}/manga-for-kids)
${AGE_BANDS.map((b) => `- [Manga for kids ${AGE_BAND_LABELS[b].toLowerCase()}](${base}/manga-for-kids/${AGE_SLUGS[b]})`).join("\n")}

## Guides
${GUIDES.map((g) => `- [${g.title}](${base}/guides/${g.slug}): ${g.description}`).join("\n")}

## Policies
- [Privacy policy](${base}/privacy)
- [Terms of service](${base}/terms)
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}

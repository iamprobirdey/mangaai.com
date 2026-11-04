import type { MetadataRoute } from "next";
import { isIndexable, siteUrl } from "@/lib/site";

// Signed-in and private areas never belong in search results.
const PRIVATE = ["/read", "/profiles", "/setup", "/parent", "/admin", "/api", "/auth", "/reset-password", "/offline.html"];

export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) {
    // Preview and local builds: keep everything out of search engines.
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      // AI assistants may read the public pages, so parents asking them for kid-friendly manga can find us.
      { userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "PerplexityBot", "Google-Extended"], allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}

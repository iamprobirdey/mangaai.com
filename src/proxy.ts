import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED = ["/profiles", "/setup", "/read", "/parent", "/admin"];

/** Redirects www.example.com <-> example.com to the host in NEXT_PUBLIC_SITE_URL, in one hop. */
function canonicalRedirect(request: NextRequest) {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site || process.env.NODE_ENV !== "production") return null;
  let canonical: URL;
  try {
    canonical = new URL(site);
  } catch {
    return null;
  }
  const host = request.headers.get("host")?.toLowerCase() ?? "";
  const bare = (h: string) => h.replace(/^www\./, "");
  if (host === canonical.host || bare(host) !== bare(canonical.host)) return null; // already right, or a preview/other domain
  const to = new URL(request.nextUrl.pathname + request.nextUrl.search, canonical);
  return NextResponse.redirect(to, 308);
}

export async function proxy(request: NextRequest) {
  const redirect = canonicalRedirect(request);
  if (redirect) return redirect;
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refreshes the auth token if needed. Do not remove.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const path = request.nextUrl.pathname;

  if (!signedIn && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|pdf.worker.min.mjs|api/billing/webhook|api/email/webhook|sw.js|offline.html|manifest.webmanifest|icons|robots.txt|sitemap.xml|llms.txt|opengraph-image|api/cron).*)"],
};

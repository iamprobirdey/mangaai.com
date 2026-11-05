import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser, isParentUnlocked } from "@/lib/dal";
import { PRIVACY_VERSION } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * "Download my data": everything MangaAI holds about this family, as JSON (DPDP s.11 summary of
 * personal data; COPPA 312.6 parent review). Needs the grown-ups PIN, like the rest of /parent.
 * Reader ids come from the parent's own session (RLS); the rest is read by those ids / the user id.
 */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!(await isParentUnlocked())) return NextResponse.redirect(new URL("/parent/unlock?next=/parent/settings", request.url));

  const supabase = await createClient();
  const { data: children } = await supabase.from("children").select("id,nickname,avatar,age_band,daily_limit_minutes,created_at").eq("parent_id", user.id);
  const ids = (children ?? []).map((c) => c.id);
  const none = Promise.resolve({ data: [] as unknown[] });
  const admin = createAdminClient();
  const [profile, progress, days, badges, shelf, hidden, subscriptions, emails] = await Promise.all([
    admin.from("profiles").select("display_name,role,weekly_digest,trial_used,consent_at,created_at").eq("id", user.id).maybeSingle(),
    ids.length ? admin.from("reading_progress").select("*").in("child_id", ids) : none,
    ids.length ? admin.from("reading_days").select("*").in("child_id", ids) : none,
    ids.length ? admin.from("child_badges").select("*").in("child_id", ids) : none,
    ids.length ? admin.from("shelf").select("*").in("child_id", ids) : none,
    ids.length ? admin.from("child_hidden_series").select("*").in("child_id", ids) : none,
    admin.from("subscriptions").select("plan,status,amount,currency,trial_end,current_start,current_end,first_charged_at,cancelled_at,created_at").eq("parent_id", user.id),
    admin.from("email_log").select("kind,sent_at").eq("parent_id", user.id),
  ]);

  const body = {
    exported_at: new Date().toISOString(),
    privacy_notice_version: PRIVACY_VERSION,
    account: { email: user.email, ...(profile.data ?? {}) },
    readers: children ?? [],
    reading_progress: progress.data ?? [],
    reading_days: days.data ?? [],
    badges: badges.data ?? [],
    shelf: shelf.data ?? [],
    hidden_series: hidden.data ?? [],
    subscriptions: subscriptions.data ?? [],
    emails_sent: emails.data ?? [],
    note: "Card and UPI details are held by Razorpay, never by MangaAI.",
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mangaai-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}

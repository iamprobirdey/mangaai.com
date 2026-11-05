import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { parentConsentConfirmEmail, sendEmail } from "@/lib/email";

export const maxDuration = 300;

const CONFIRM_AFTER_HOURS = 24;
const CONFIRM_WITHIN_DAYS = 14;

/**
 * Daily privacy housekeeping (called by the droplet's crontab with `Authorization: Bearer $CRON_SECRET`):
 *  1. Purges data past the retention schedule published at /privacy#retention.
 *  2. Sends each family one consent confirmation a day after their first reader-profile notice
 *     (the follow-up step of "email plus" parental consent). Safe to re-run.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${serverEnv.cronSecret()}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const now = Date.now();

  const { data: purged, error: purgeError } = await admin.rpc("purge_expired_data");
  if (purgeError) console.error("retention purge failed", purgeError);

  const from = new Date(now - CONFIRM_WITHIN_DAYS * 86_400_000).toISOString();
  const to = new Date(now - CONFIRM_AFTER_HOURS * 3_600_000).toISOString();
  const [{ data: notices }, { data: confirmed }] = await Promise.all([
    admin.from("email_log").select("parent_id,sent_at").eq("kind", "parent_notice").gte("sent_at", from).lte("sent_at", to),
    admin.from("email_log").select("parent_id").eq("kind", "consent_confirm"),
  ]);
  const done = new Set((confirmed ?? []).map((c) => c.parent_id));
  const firstNotice = new Map<string, string>();
  for (const n of notices ?? []) {
    if (done.has(n.parent_id)) continue;
    const prev = firstNotice.get(n.parent_id);
    if (!prev || n.sent_at < prev) firstNotice.set(n.parent_id, n.sent_at);
  }

  let sent = 0;
  let failed = 0;
  for (const [parentId] of firstNotice) {
    const [{ data: profile }, { data: userRes }] = await Promise.all([
      admin.from("profiles").select("display_name,consent_at").eq("id", parentId).maybeSingle(),
      admin.auth.admin.getUserById(parentId),
    ]);
    const email = userRes.user?.email;
    if (!email || !profile) continue;
    const consentDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: serverEnv.timezone() }).format(
      new Date(profile.consent_at ?? firstNotice.get(parentId)!),
    );
    const message = parentConsentConfirmEmail(profile.display_name ?? null, consentDate);
    try {
      const r = await sendEmail(email, message.subject, message.html, message.text);
      if (!r.skipped) {
        await admin.from("email_log").insert({ parent_id: parentId, kind: "consent_confirm", provider_id: r.id });
        sent++;
      }
    } catch (e) {
      failed++;
      console.error("consent confirmation failed", parentId, e);
    }
  }

  return NextResponse.json({ purged: purged ?? null, consentConfirmations: { due: firstNotice.size, sent, failed } });
}

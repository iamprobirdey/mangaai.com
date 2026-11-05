import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { weeklyStats } from "@/lib/family-stats";
import { sendEmail, weeklyDigestEmail } from "@/lib/email";

export const maxDuration = 300;

/**
 * Weekly parent email. The droplet's crontab calls this every Sunday (see deploy/crontab) with
 * `Authorization: Bearer $CRON_SECRET`. Safe to re-run: families emailed in the last 6 days are skipped.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${serverEnv.cronSecret()}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const sixDaysAgo = new Date(Date.now() - 6 * 86_400_000).toISOString();

  const [{ data: parents }, { data: recent }] = await Promise.all([
    admin.from("profiles").select("id,display_name").eq("weekly_digest", true),
    admin.from("email_log").select("parent_id").eq("kind", "weekly_digest").gte("sent_at", sixDaysAgo),
  ]);
  const alreadySent = new Set((recent ?? []).map((r) => r.parent_id));
  const todo = (parents ?? []).filter((p) => !alreadySent.has(p.id));

  let sent = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const parent of todo) {
    const { data: kids } = await admin.from("children").select("id,nickname,avatar").eq("parent_id", parent.id);
    if (!kids?.length) {
      skipped++;
      continue;
    }
    const stats = await weeklyStats(admin, kids.map((k) => k.id));
    // Only email families who read something; an empty report every week trains people to ignore it.
    if (![...stats.values()].some((s) => s.seconds > 0 || s.pages > 0)) {
      skipped++;
      continue;
    }
    const { data: userRes } = await admin.auth.admin.getUserById(parent.id);
    const email = userRes.user?.email;
    if (!email) {
      skipped++;
      continue;
    }
    const message = weeklyDigestEmail(
      parent.display_name,
      kids.map((k) => ({ nickname: k.nickname, avatar: k.avatar, week: stats.get(k.id)! })),
    );
    try {
      const r = await sendEmail(email, message.subject, message.html, message.text);
      if (!r.skipped) {
        await admin.from("email_log").insert({ parent_id: parent.id, kind: "weekly_digest", provider_id: r.id });
        sent++;
      } else skipped++;
    } catch (e) {
      failures.push(parent.id);
      console.error("weekly digest failed", parent.id, e);
    }
  }

  return NextResponse.json({ sent, skipped, failed: failures.length });
}

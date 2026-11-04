import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { formatMoney, pricingFor } from "@/lib/pricing";
import { sendEmail, trialEndingEmail } from "@/lib/email";

const REMIND_DAYS_BEFORE = 2;

/**
 * Daily: email parents whose free trial converts to paid within the next 2 days.
 * Each subscription gets one reminder (tracked in email_log by subscription id). Safe to re-run.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${serverEnv.cronSecret()}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const now = new Date();
  const horizon = new Date(now.getTime() + REMIND_DAYS_BEFORE * 86_400_000);

  const { data: trials } = await admin
    .from("subscriptions")
    .select("id,parent_id,plan,trial_end,amount,currency")
    .eq("status", "authenticated")
    .gt("trial_end", now.toISOString())
    .lte("trial_end", horizon.toISOString());

  const ids = (trials ?? []).map((t) => t.id);
  const { data: done } = ids.length
    ? await admin.from("email_log").select("ref_id").eq("kind", "trial_ending").in("ref_id", ids)
    : { data: [] };
  const already = new Set((done ?? []).map((d) => d.ref_id));

  let sent = 0;
  const failed: string[] = [];
  for (const t of trials ?? []) {
    if (already.has(t.id)) continue;
    const [{ data: profile }, { data: userRes }] = await Promise.all([
      admin.from("profiles").select("display_name").eq("id", t.parent_id).maybeSingle(),
      admin.auth.admin.getUserById(t.parent_id),
    ]);
    const email = userRes.user?.email;
    if (!email) continue;
    const chargeDate = new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "long",
      timeZone: serverEnv.timezone(),
    }).format(new Date(t.trial_end!));
    const message = trialEndingEmail(profile?.display_name ?? null, {
      chargeDate,
      plan: t.plan === "annual" ? "yearly" : "monthly",
      price: `${t.amount && t.currency ? formatMoney(t.amount, t.currency) : pricingFor("IN")[t.plan === "annual" ? "annual" : "monthly"].label} per ${t.plan === "annual" ? "year" : "month"}`,
    });
    try {
      const r = await sendEmail(email, message.subject, message.html, message.text);
      if (!r.skipped) {
        await admin.from("email_log").insert({ parent_id: t.parent_id, kind: "trial_ending", ref_id: t.id, provider_id: r.id });
        sent++;
      }
    } catch (e) {
      failed.push(t.id);
      console.error("trial reminder failed", t.id, e);
    }
  }
  return NextResponse.json({ due: trials?.length ?? 0, sent, failed: failed.length });
}

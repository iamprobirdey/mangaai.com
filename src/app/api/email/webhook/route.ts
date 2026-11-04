import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resend webhook (Resend dashboard → Webhooks → add https://YOUR-DOMAIN/api/email/webhook,
 * events: email.delivered, email.opened). Resend signs with Svix; RESEND_WEBHOOK_SECRET is the `whsec_…` value.
 */
function verifySvix(body: string, headers: Headers, secret: string) {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatures = headers.get("svix-signature");
  if (!id || !timestamp || !signatures) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 5 * 60) return false; // replay protection
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  return signatures.split(" ").some((part) => {
    const sig = part.split(",")[1];
    if (!sig) return false;
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const body = await request.text();
  if (!verifySvix(body, request.headers, secret)) return NextResponse.json({ error: "invalid signature" }, { status: 400 });

  const event = JSON.parse(body) as { type: string; created_at?: string; data?: { email_id?: string } };
  const emailId = event.data?.email_id;
  if (!emailId) return NextResponse.json({ ok: true });

  const at = event.created_at ?? new Date().toISOString();
  const admin = createAdminClient();
  if (event.type === "email.opened") {
    // Keep the first open only.
    await admin.from("email_log").update({ opened_at: at }).eq("provider_id", emailId).is("opened_at", null);
  } else if (event.type === "email.delivered") {
    await admin.from("email_log").update({ delivered_at: at }).eq("provider_id", emailId);
  }
  return NextResponse.json({ ok: true });
}

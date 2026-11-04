import { NextResponse, type NextRequest } from "next/server";
import { syncSubscription, verifyWebhookSignature, type RazorpaySubscriptionEntity } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Razorpay webhook. In the Razorpay dashboard, point a webhook at /api/billing/webhook and enable
 * the subscription.* events (authenticated, activated, charged, pending, halted, cancelled, completed, paused, resumed, updated).
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature)) return NextResponse.json({ error: "invalid signature" }, { status: 400 });

  const event = JSON.parse(raw) as {
    event: string;
    payload: { subscription?: { entity: RazorpaySubscriptionEntity } };
  };
  const eventId = request.headers.get("x-razorpay-event-id");
  const admin = createAdminClient();

  // Idempotency: Razorpay retries deliveries; skip ones we've already processed.
  const { error: dup } = await admin
    .from("billing_events")
    .insert({ event_id: eventId, event_type: event.event, payload: event });
  if (dup?.code === "23505") return NextResponse.json({ ok: true, duplicate: true });

  const entity = event.payload.subscription?.entity;
  if (event.event.startsWith("subscription.") && entity) {
    try {
      await syncSubscription(entity, { charged: event.event === "subscription.charged" });
    } catch (e) {
      // Let Razorpay retry: forget we saw this event.
      console.error("webhook sync failed", e);
      if (eventId) await admin.from("billing_events").delete().eq("event_id", eventId);
      return NextResponse.json({ error: "sync failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}

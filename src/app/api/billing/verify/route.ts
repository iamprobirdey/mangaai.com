import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/dal";
import { razorpay, syncSubscription, verifyCheckoutSignature, type RazorpaySubscriptionEntity } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";

/** Called by the browser right after Razorpay Checkout succeeds. Webhooks confirm the same thing later. */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, string> | null;
  const paymentId = body?.razorpay_payment_id;
  const subscriptionId = body?.razorpay_subscription_id;
  const signature = body?.razorpay_signature;
  if (!paymentId || !subscriptionId || !signature || !verifyCheckoutSignature(paymentId, subscriptionId, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const { data: own } = await createAdminClient()
    .from("subscriptions")
    .select("parent_id")
    .eq("razorpay_subscription_id", subscriptionId)
    .maybeSingle();
  if (own?.parent_id !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

  const entity = (await razorpay().subscriptions.fetch(subscriptionId)) as unknown as RazorpaySubscriptionEntity;
  await syncSubscription(entity);
  return NextResponse.json({ ok: true, status: entity.status });
}

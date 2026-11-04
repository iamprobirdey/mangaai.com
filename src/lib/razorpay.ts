import "server-only";
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

let client: Razorpay | null = null;
export function razorpay() {
  client ??= new Razorpay({ key_id: serverEnv.razorpayKeyId(), key_secret: serverEnv.razorpayKeySecret() });
  return client;
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Checkout success signature: HMAC(payment_id + "|" + subscription_id, key_secret). */
export function verifyCheckoutSignature(paymentId: string, subscriptionId: string, signature: string) {
  const expected = crypto.createHmac("sha256", serverEnv.razorpayKeySecret()).update(`${paymentId}|${subscriptionId}`).digest("hex");
  return safeEqual(expected, signature);
}

/** Webhook signature: HMAC(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const expected = crypto.createHmac("sha256", serverEnv.razorpayWebhookSecret()).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

export type RazorpaySubscriptionEntity = {
  id: string;
  plan_id: string;
  status: string;
  current_start?: number | null;
  current_end?: number | null;
  start_at?: number | null;
  charge_at?: number | null;
  ended_at?: number | null;
  short_url?: string | null;
  notes?: Record<string, string> | unknown[] | null;
  paid_count?: number;
};

const toIso = (s?: number | null) => (s ? new Date(s * 1000).toISOString() : null);

export function planFromId(planId: string): "monthly" | "annual" {
  return planId === serverEnv.plans().annual ? "annual" : "monthly";
}

/**
 * Writes Razorpay's view of a subscription into our table. Razorpay is the source of truth;
 * both the checkout callback and webhooks call this, so it must be idempotent.
 */
export async function syncSubscription(entity: RazorpaySubscriptionEntity, extra: { charged?: boolean } = {}) {
  const admin = createAdminClient();
  const notes = (entity.notes && !Array.isArray(entity.notes) ? entity.notes : {}) as Record<string, string>;
  const { data: existing } = await admin
    .from("subscriptions")
    .select("id,parent_id,first_charged_at,trial_end")
    .eq("razorpay_subscription_id", entity.id)
    .maybeSingle();

  const parentId = existing?.parent_id ?? notes.parent_id;
  if (!parentId) return null;

  const row = {
    parent_id: parentId,
    razorpay_subscription_id: entity.id,
    razorpay_plan_id: entity.plan_id,
    plan: planFromId(entity.plan_id),
    status: entity.status,
    current_start: toIso(entity.current_start),
    current_end: toIso(entity.current_end) ?? (entity.status === "authenticated" ? toIso(entity.start_at) : null),
    short_url: entity.short_url ?? null,
    first_charged_at:
      existing?.first_charged_at ?? (extra.charged || (entity.paid_count ?? 0) > 0 ? new Date().toISOString() : null),
    cancelled_at: entity.status === "cancelled" ? (toIso(entity.ended_at) ?? new Date().toISOString()) : null,
    updated_at: new Date().toISOString(),
  };

  const { data } = await admin
    .from("subscriptions")
    .upsert(row, { onConflict: "razorpay_subscription_id" })
    .select("*")
    .single();

  if (entity.status === "authenticated" && existing?.trial_end) {
    await admin.from("profiles").update({ trial_used: true }).eq("id", parentId);
  }
  return data;
}

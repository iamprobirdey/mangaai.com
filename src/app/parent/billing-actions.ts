"use server";
import { revalidatePath } from "next/cache";
import { getAccess, getProfile, getUser, isParentUnlocked } from "@/lib/dal";
import { razorpay, syncSubscription, type RazorpaySubscriptionEntity } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { visitorPricing } from "@/lib/pricing";

export type CheckoutResult =
  | { error: string }
  | { subscriptionId: string; keyId: string; email: string; trial: boolean };

export async function startSubscription(plan: "monthly" | "annual"): Promise<CheckoutResult> {
  if (!(await isParentUnlocked())) return { error: "Enter your PIN again to continue." };
  const [profile, user] = await Promise.all([getProfile(), getUser()]);
  const access = await getAccess(profile.id);
  if (access.active && access.state !== "grace") return { error: "You already have an active subscription." };

  const trial = !profile.trial_used && access.state === "none";
  const startAt = trial ? Math.floor(Date.now() / 1000) + serverEnv.trialDays() * 86_400 : undefined;
  const price = (await visitorPricing())[plan];
  const planId = price.planId;

  try {
    const sub = await razorpay().subscriptions.create({
      plan_id: planId,
      total_count: plan === "annual" ? 10 : 120,
      customer_notify: 1,
      ...(startAt ? { start_at: startAt } : {}),
      notes: { parent_id: profile.id, plan },
    });
    await createAdminClient().from("subscriptions").insert({
      parent_id: profile.id,
      razorpay_subscription_id: sub.id,
      razorpay_plan_id: planId,
      plan,
      status: sub.status,
      trial_end: startAt ? new Date(startAt * 1000).toISOString() : null,
      short_url: sub.short_url ?? null,
      amount: price.amount,
      currency: price.currency,
    });
    return { subscriptionId: sub.id, keyId: serverEnv.razorpayKeyId(), email: user?.email ?? "", trial };
  } catch (e) {
    console.error("razorpay create subscription failed", e);
    return { error: "We couldn't start checkout. Try again in a minute." };
  }
}

export async function cancelSubscription(): Promise<{ error?: string; ok?: string }> {
  if (!(await isParentUnlocked())) return { error: "Enter your PIN again to continue." };
  const profile = await getProfile();
  const access = await getAccess(profile.id);
  const sub = access.subscription;
  if (!sub || !["authenticated", "active", "pending", "halted"].includes(sub.status)) return { error: "There's no active subscription to cancel." };
  try {
    // During a trial nothing has been paid, so cancel immediately; otherwise keep access until the period ends.
    const atCycleEnd = sub.status === "active";
    const entity = (await razorpay().subscriptions.cancel(sub.razorpay_subscription_id, atCycleEnd)) as unknown as RazorpaySubscriptionEntity;
    await syncSubscription(entity);
    if (atCycleEnd) {
      await createAdminClient().from("subscriptions").update({ cancel_at_cycle_end: true }).eq("id", sub.id);
    }
    revalidatePath("/parent", "layout");
    return { ok: atCycleEnd ? "Cancelled. Reading stays open until the end of the period you've paid for." : "Cancelled. You won't be charged." };
  } catch (e) {
    console.error("razorpay cancel failed", e);
    return { error: "We couldn't cancel right now. Try again in a minute." };
  }
}

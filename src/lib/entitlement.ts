export type SubscriptionRow = {
  id: string;
  parent_id: string;
  razorpay_subscription_id: string;
  plan: "monthly" | "annual";
  status: string;
  trial_end: string | null;
  current_start: string | null;
  current_end: string | null;
  first_charged_at: string | null;
  cancel_at_cycle_end: boolean;
  cancelled_at: string | null;
  short_url: string | null;
  amount: number | null;
  currency: string | null;
  created_at: string;
};

export type AccessState = "none" | "trial" | "active" | "past_due" | "grace" | "ended";

export type Access = {
  active: boolean;
  state: AccessState;
  subscription: SubscriptionRow | null;
  /** When access ends if nothing changes (trial end, grace end, paid-through date). */
  until: Date | null;
};

/**
 * Razorpay subscription status → reading access.
 * - authenticated: card/UPI mandate set up, first charge scheduled → free trial
 * - active: paid
 * - pending: a renewal failed and Razorpay is retrying → keep reading (past due)
 * - halted: retries exhausted → short grace period after the paid-through date
 * - cancelled: readable until the end of the period already paid for
 */
export function accessFor(sub: SubscriptionRow | null, graceDays: number, now = new Date()): Access {
  if (!sub || sub.status === "created") return { active: false, state: "none", subscription: sub, until: null };
  const end = sub.current_end ? new Date(sub.current_end) : null;
  const trialEnd = sub.trial_end ? new Date(sub.trial_end) : null;

  switch (sub.status) {
    case "authenticated":
      return { active: true, state: trialEnd && trialEnd > now ? "trial" : "active", subscription: sub, until: trialEnd ?? end };
    case "active":
      return { active: true, state: "active", subscription: sub, until: end };
    case "pending":
      return { active: true, state: "past_due", subscription: sub, until: end };
    case "halted": {
      const graceEnd = new Date((end ?? now).getTime() + graceDays * 86_400_000);
      return graceEnd > now
        ? { active: true, state: "grace", subscription: sub, until: graceEnd }
        : { active: false, state: "ended", subscription: sub, until: graceEnd };
    }
    case "cancelled":
    case "paused":
      return end && end > now
        ? { active: true, state: "active", subscription: sub, until: end }
        : { active: false, state: "ended", subscription: sub, until: end };
    default:
      return { active: false, state: "ended", subscription: sub, until: end };
  }
}

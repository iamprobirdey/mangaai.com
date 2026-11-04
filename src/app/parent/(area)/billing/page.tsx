import { getAccess, getProfile } from "@/lib/dal";
import { formatDate } from "@/lib/dates";
import { serverEnv } from "@/lib/env";
import { formatMoney, visitorPricing } from "@/lib/pricing";
import { Notice } from "@/components/ui";
import { CancelButton, Checkout } from "./checkout";

export const metadata = { title: "Billing" };

export default async function BillingPage() {
  const profile = await getProfile();
  const access = await getAccess(profile.id);
  const sub = access.subscription;
  const canStart = !access.active || access.state === "grace";
  const trialAvailable = !profile.trial_used && access.state === "none";
  const pricing = await visitorPricing();
  const subPrice = sub?.amount && sub.currency ? formatMoney(sub.amount, sub.currency) : null;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Billing</h1>

      {sub && access.active ? (
        <section className="panel p-5">
          <h2 className="text-xl">Your plan</h2>
          <p className="mt-2 text-lg">
            {sub.plan === "annual" ? "Yearly" : "Monthly"}
            {subPrice ? ` — ${subPrice}` : ""}
          </p>
          <div className="mt-3 space-y-2">
            {access.state === "trial" ? (
              <Notice>Free trial until {formatDate(access.until)}. Your first payment is taken that day unless you cancel.</Notice>
            ) : null}
            {access.state === "active" && !sub.cancel_at_cycle_end && sub.status !== "cancelled" ? (
              <p>Renews on {formatDate(sub.current_end)}.</p>
            ) : null}
            {sub.cancel_at_cycle_end || sub.status === "cancelled" ? (
              <Notice>Cancelled. Reading stays open until {formatDate(access.until)}.</Notice>
            ) : null}
            {access.state === "past_due" || access.state === "grace" ? (
              <Notice tone="error">
                The last payment failed. We&apos;ll retry automatically, and reading stays open until {formatDate(access.until)}.
                {sub.short_url ? (
                  <>
                    {" "}
                    <a className="underline" href={sub.short_url} target="_blank" rel="noreferrer">Update your payment method</a>
                  </>
                ) : null}
              </Notice>
            ) : null}
          </div>
          {!sub.cancel_at_cycle_end && sub.status !== "cancelled" ? <CancelButton /> : null}
        </section>
      ) : null}

      {canStart ? (
        <section className="panel p-5">
          <h2 className="text-xl">{trialAvailable ? `Start your ${serverEnv.trialDays()}-day free trial` : "Choose a plan"}</h2>
          <p className="mt-1">
            One plan for the whole family: every series, up to 5 readers.
            {trialAvailable ? " You won't be charged until the trial ends, and you can cancel before then." : ""}
          </p>
          <Checkout monthly={pricing.monthly.label} annual={pricing.annual.label} trial={trialAvailable} />
          <p className="hint mt-4">Payments are handled securely by Razorpay. We never see your card details.</p>
        </section>
      ) : null}
    </div>
  );
}

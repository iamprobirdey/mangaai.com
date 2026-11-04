"use client";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelSubscription, startSubscription } from "../../billing-actions";

type RazorpayResponse = { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: (e: unknown) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

export function Checkout({ monthly, annual, trial }: { monthly: string; annual: string; trial: boolean }) {
  const router = useRouter();
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");
  const [message, setMessage] = useState<{ error?: string; ok?: string }>({});
  const [pending, startTransition] = useTransition();

  function pay() {
    setMessage({});
    startTransition(async () => {
      const result = await startSubscription(plan);
      if ("error" in result) return setMessage({ error: result.error });
      if (!window.Razorpay) return setMessage({ error: "Checkout didn't load. Check your connection and try again." });

      const rzp = new window.Razorpay({
        key: result.keyId,
        subscription_id: result.subscriptionId,
        name: "MangaAI",
        description: plan === "annual" ? "Family plan, yearly" : "Family plan, monthly",
        prefill: { email: result.email },
        theme: { color: "#1c1f4a" },
        handler: async (response: RazorpayResponse) => {
          const res = await fetch("/api/billing/verify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(response),
          });
          if (res.ok) {
            setMessage({ ok: result.trial ? "Your free trial has started. Happy reading!" : "You're subscribed. Happy reading!" });
            router.refresh();
          } else {
            setMessage({ error: "Payment went through but we couldn't confirm it yet. Refresh in a minute." });
          }
        },
        modal: { ondismiss: () => setMessage({ error: "Checkout closed before finishing. Nothing was charged." }) },
      });
      rzp.on("payment.failed", () => setMessage({ error: "The payment didn't go through. Try another card or UPI app." }));
      rzp.open();
    });
  }

  return (
    <div className="mt-5">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Plan</legend>
        {(
          [
            ["annual", annual, "per year, the best value"],
            ["monthly", monthly, "per month"],
          ] as const
        ).map(([value, price, note]) => (
          <label key={value} className="cursor-pointer">
            <input
              type="radio"
              name="plan"
              value={value}
              checked={plan === value}
              onChange={() => setPlan(value)}
              className="peer sr-only"
            />
            <span className="block rounded-lg border-[3px] border-tone-deep bg-paper p-4 peer-checked:border-ink peer-checked:bg-sun/30 peer-focus-visible:outline peer-focus-visible:outline-3">
              <span className="block font-display text-2xl">{price}</span>
              <span className="hint">{note}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <button type="button" onClick={pay} disabled={pending} className="btn btn-primary mt-5 w-full sm:w-auto">
        {pending ? "Opening checkout…" : trial ? "Start free trial" : "Subscribe"}
      </button>
      {message.error ? <p role="alert" className="mt-3 font-bold text-alert">{message.error}</p> : null}
      {message.ok ? <p role="status" className="mt-3 font-bold text-leaf">{message.ok}</p> : null}
    </div>
  );
}

export function CancelButton() {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ error?: string; ok?: string }>({});
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (message.ok) return <p role="status" className="mt-4 font-bold text-leaf">{message.ok}</p>;
  return (
    <div className="mt-5">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <span>Cancel the subscription?</span>
          <button
            type="button"
            className="btn btn-danger"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await cancelSubscription();
                setMessage(r);
                router.refresh();
              })
            }
          >
            {pending ? "Cancelling…" : "Yes, cancel"}
          </button>
          <button type="button" className="btn" onClick={() => setConfirming(false)}>Keep my plan</button>
        </div>
      ) : (
        <button type="button" className="btn" onClick={() => setConfirming(true)}>Cancel subscription</button>
      )}
      {message.error ? <p role="alert" className="mt-3 font-bold text-alert">{message.error}</p> : null}
    </div>
  );
}

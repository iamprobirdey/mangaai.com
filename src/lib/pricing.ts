import "server-only";
import { headers } from "next/headers";

/**
 * Country-based pricing. Families in India see and pay rupees; everyone else sees dollars,
 * as long as USD plans are configured in Razorpay (international payments must be enabled
 * on the Razorpay account). Without USD plans, everyone gets the INR plans.
 */
export type Region = "IN" | "INTL";
export type Interval = "monthly" | "annual";
export type Price = { planId: string; amount: number; currency: string; label: string };
export type RegionPricing = { region: Region; currency: string; monthly: Price; annual: Price };

export function formatMoney(minor: number, currency: string) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

function price(planId: string | undefined, amount: string | undefined, currency: string): Price | null {
  const minor = Number(amount);
  if (!planId || !Number.isFinite(minor) || minor <= 0) return null;
  return { planId, amount: minor, currency, label: formatMoney(minor, currency) };
}

function regionPricing(region: Region): RegionPricing | null {
  const cur = region === "IN" ? "INR" : "USD";
  const monthly = price(process.env[`RAZORPAY_PLAN_MONTHLY_${cur}`], process.env[`PLAN_MONTHLY_AMOUNT_${cur}`], cur);
  const annual = price(process.env[`RAZORPAY_PLAN_ANNUAL_${cur}`], process.env[`PLAN_ANNUAL_AMOUNT_${cur}`], cur);
  return monthly && annual ? { region, currency: cur, monthly, annual } : null;
}

/** Pricing for a region, falling back to the other region if that one isn't configured. */
export function pricingFor(region: Region): RegionPricing {
  const p = regionPricing(region) ?? regionPricing(region === "IN" ? "INTL" : "IN");
  if (!p) {
    throw new Error("No Razorpay plans configured. Set RAZORPAY_PLAN_MONTHLY_INR, RAZORPAY_PLAN_ANNUAL_INR and the PLAN_*_AMOUNT_INR values.");
  }
  return p;
}

/** Every configured plan, so a webhook for any plan ID can be matched. */
export function allPrices(): (Price & { interval: Interval })[] {
  return (["IN", "INTL"] as Region[]).flatMap((r) => {
    const p = regionPricing(r);
    return p ? [{ ...p.monthly, interval: "monthly" as const }, { ...p.annual, interval: "annual" as const }] : [];
  });
}

export function priceForPlanId(planId: string) {
  return allPrices().find((p) => p.planId === planId) ?? null;
}

/**
 * The visitor's region, from the hosting platform's geo header. Vercel sets x-vercel-ip-country
 * and Cloudflare sets cf-ipcountry. Locally, PRICING_REGION (IN or INTL) forces one for testing.
 */
export async function detectRegion(): Promise<Region> {
  const forced = process.env.PRICING_REGION?.toUpperCase();
  if (forced === "IN" || forced === "INTL") return forced;
  const h = await headers();
  const country = (h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? h.get("x-country") ?? "").toUpperCase();
  if (country) return country === "IN" ? "IN" : "INTL";
  // No geo header (local development): guess from the browser language, defaulting to India.
  const lang = h.get("accept-language") ?? "";
  if (/-IN\b/i.test(lang) || lang === "") return "IN";
  return "INTL";
}

export async function visitorPricing() {
  return pricingFor(await detectRegion());
}

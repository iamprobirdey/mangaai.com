import Link from "next/link";
import type { ReactNode } from "react";
import { PublicFooter, PublicHeader, PublicSite } from "@/components/public-chrome";
import { OPERATOR, PRIVACY_VERSION } from "@/lib/site";
import { formatDate } from "@/lib/dates";
import { serverEnv } from "@/lib/env";
import { pricingFor } from "@/lib/pricing";

export const metadata = {
  title: "Terms of service",
  description: "The MangaAI family plan: trial, billing, cancellation and refunds, acceptable use, and how to reach us.",
  alternates: { canonical: "/terms" },
};

// Still needs review by a qualified lawyer before launch (Indian Contract Act, Consumer Protection
// Act 2019 and E-Commerce Rules 2020, IT Act). Keep TERMS_VERSION in step with material changes.
const TERMS_VERSION = PRIVACY_VERSION;

const H2 = ({ id, children }: { id?: string; children: ReactNode }) => (
  <h2 id={id} className="scroll-mt-24 pt-4 text-2xl">{children}</h2>
);

export default function TermsPage() {
  const trialDays = serverEnv.trialDays();
  const graceDays = serverEnv.graceDays();
  // Prices come from the Razorpay plan settings; if those aren't set (e.g. a build without
  // secrets), describe the price without numbers rather than failing the page.
  let priceText = "the monthly or yearly price shown on the Billing page";
  try {
    const inr = pricingFor("IN");
    priceText = `${inr.monthly.label} a month or ${inr.annual.label} a year`;
  } catch {
    /* plans not configured */
  }
  return (
    <PublicSite>
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <article className="space-y-4 leading-relaxed">
          <h1 className="text-3xl sm:text-4xl">Terms of service</h1>
          <p className="hint">Version {TERMS_VERSION} · last updated {formatDate(TERMS_VERSION)}</p>

          <H2 id="about">1. About these terms</H2>
          <p>
            These terms are an agreement between you and {OPERATOR.name}, trading as {OPERATOR.tradingAs}, {OPERATOR.city}
            (&quot;we&quot;, &quot;us&quot;), for the MangaAI website and app (&quot;MangaAI&quot;). By creating an account you agree to
            them and to our <Link className="underline" href="/privacy">privacy policy</Link>. If you don&apos;t agree, please
            don&apos;t use MangaAI.
          </p>

          <H2 id="eligibility">2. Who can have an account</H2>
          <ul className="list-disc space-y-1 pl-5">
            <li>You must be 18 or over and able to enter a binding contract. The account is yours, as the parent or legal guardian of the children who read on it.</li>
            <li>Children use MangaAI only through reader profiles you create and supervise. You&apos;re responsible for what happens on your account, including keeping your password and grown-ups PIN to yourself.</li>
            <li>One family plan covers up to 5 reader profiles in your household. Please don&apos;t share the account outside your family.</li>
          </ul>

          <H2 id="plan">3. The plan, free trial and billing</H2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Prices.</strong> {priceText} for the whole family, shown before you
              pay, in Indian rupees unless another currency is shown at checkout. Prices include any taxes we are required to charge.
            </li>
            <li>
              <strong>Free trial.</strong> New families get a {trialDays}-day free trial once per account. To start it you authorise a
              recurring payment (a card or UPI mandate) with our payment provider, Razorpay. Razorpay may place a small refundable
              authorisation (for example ₹5) to set this up. You aren&apos;t charged the plan price until the trial ends, and we email
              you 2 days before it does.
            </li>
            <li>
              <strong>Automatic renewal.</strong> When the trial ends, and then every month or year, the plan renews and the price is
              charged automatically until you cancel.
            </li>
            <li>
              <strong>Without a trial or plan</strong> your children can preview the first pages of each book; the full library needs
              an active trial or plan.
            </li>
            <li>
              <strong>Price changes.</strong> If we change the price, we&apos;ll email you at least 30 days before your next renewal at
              the new price. You can cancel before then.
            </li>
            <li>
              <strong>Failed payments.</strong> If a renewal fails, Razorpay retries it. Reading stays open for a {graceDays}-day grace
              period; after that, access pauses until a payment succeeds.
            </li>
          </ul>

          <H2 id="cancel">4. Cancellation and refunds</H2>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Cancel any time</strong> in Grown-ups → Billing. No calls, no forms.</li>
            <li><strong>During the free trial:</strong> cancelling ends the trial immediately and you&apos;re never charged the plan price. Any small authorisation is reversed by Razorpay.</li>
            <li><strong>After a payment:</strong> cancelling stops future renewals; you keep access until the end of the month or year you&apos;ve paid for.</li>
            <li><strong>Refunds:</strong> payments for a period that has started aren&apos;t refunded, except where the law requires it. If you were charged by mistake (a duplicate charge, or a charge after you cancelled), tell us within 30 days and we&apos;ll refund it in full to the original payment method; refunds usually reach you in 5–7 working days.</li>
            <li><strong>Deleting your account</strong> (Settings) cancels the subscription and deletes your family&apos;s data, as described in the privacy policy.</li>
          </ul>

          <H2 id="content">5. The stories</H2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Each series is a run of volumes, and each volume is a complete book. Books are rated for an age range; children see only books for their age range and younger.</li>
            <li>Our stories are created with the help of AI tools. Every page is reviewed by a person before it is published, but if you see anything you think isn&apos;t right for children, tell us at {OPERATOR.email} and we&apos;ll review it promptly and take it down if needed.</li>
            <li>We add, change and sometimes remove books. We don&apos;t promise any particular title will stay available.</li>
          </ul>

          <H2 id="use">6. Acceptable use and our content</H2>
          <p>
            All books, artwork, text and software on MangaAI belong to us or our licensors. Your plan gives your household a
            personal, non-commercial, non-transferable licence to read them on MangaAI while the plan is active. You may not:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>copy, download, screenshot for distribution, record, resell or publicly show the books;</li>
            <li>scrape, crawl or bulk-download the service, or try to get around previews, limits or security;</li>
            <li>share the account outside your household, or use MangaAI to break the law or harm anyone.</li>
          </ul>
          <p>We may suspend or close accounts that break these rules. We&apos;ll tell you why, and refund any unused prepaid period unless the breach was serious.</p>

          <H2 id="service">7. Availability</H2>
          <p>
            We work to keep MangaAI running and safe, but it may sometimes be unavailable for maintenance or reasons outside our
            control. Books opened recently can be read offline on the same device for a limited time.
          </p>

          <H2 id="liability">8. Our responsibility to you</H2>
          <p>
            Nothing in these terms limits your rights under the Consumer Protection Act, 2019 or any other law that can&apos;t be
            excluded. Subject to that, MangaAI is provided as it is, we aren&apos;t liable for indirect or unforeseeable losses, and
            our total liability to you for any claim is limited to the amount you paid us in the 12 months before the claim.
          </p>

          <H2 id="changes">9. Changes to these terms</H2>
          <p>
            We may update these terms. For changes that matter, we&apos;ll email you at least 30 days before they apply; if you
            don&apos;t agree, you can cancel before then. The version and date at the top show which terms are current.
          </p>

          <H2 id="law">10. Law and disputes</H2>
          <p>
            These terms are governed by the laws of India. Please contact us first so we can try to sort things out. If we
            can&apos;t, the courts at Bengaluru, Karnataka have jurisdiction, without affecting your right to approach a consumer
            commission where you live.
          </p>

          <H2 id="contact">11. Contact and grievances</H2>
          <p>
            {OPERATOR.tradingAs}, operated by {OPERATOR.name}, {OPERATOR.city}
            <br />
            Customer support: <a className="underline" href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
            <br />
            Grievance Officer: {OPERATOR.grievanceOfficer},{" "}
            <a className="underline" href={`mailto:${OPERATOR.privacyEmail}`}>{OPERATOR.privacyEmail}</a>
          </p>
          <p>
            We acknowledge complaints within 48 hours and aim to resolve them within one month. Privacy requests are handled as set
            out in the <Link className="underline" href="/privacy#rights">privacy policy</Link>.
          </p>
        </article>
      </main>
      <PublicFooter />
    </PublicSite>
  );
}

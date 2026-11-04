import { Logo, PageShell } from "@/components/ui";

export const metadata = { title: "Privacy" };

// DRAFT — have a lawyer review before launch (COPPA, India DPDP Act, GDPR if you serve the EU/UK).
export default function PrivacyPage() {
  return (
    <PageShell>
      <Logo />
      <article className="mt-8 max-w-prose space-y-4">
        <h1 className="text-3xl">Privacy policy</h1>
        <p className="hint">Draft. This page must be reviewed by a lawyer before launch.</p>
        <h2 className="text-xl">Who the account belongs to</h2>
        <p>MangaAI accounts are created and paid for by a parent or guardian aged 18 or over. Children never sign up themselves.</p>
        <h2 className="text-xl">What we collect about children</h2>
        <p>
          For each reader profile we store only a nickname, a preset animal avatar and an age range, plus reading activity: which
          chapters were opened, the last page read, reading time per day, and badges earned. We do not collect a child&apos;s real
          name, photo, birthday, email, location or voice, and there is no chat or messaging.
        </p>
        <h2 className="text-xl">What we collect about parents</h2>
        <p>Your email, an optional first name, a hashed PIN, your subscription status, and the date you gave consent at sign-up.</p>
        <h2 className="text-xl">Payments</h2>
        <p>Payments are processed by Razorpay. We never see or store card numbers or UPI details.</p>
        <h2 className="text-xl">How we use it</h2>
        <p>
          To run the service, show reading progress, apply the limits you set, and send the weekly summary you can turn off. We do
          not sell data, show ads, or use children&apos;s data for advertising or profiling.
        </p>
        <h2 className="text-xl">Your controls</h2>
        <p>
          You can edit or delete any reader profile, and delete your whole account, from the grown-ups area. Deleting removes all
          reading data. Contact us at hello@mangaai.com for a copy of your data.
        </p>
      </article>
    </PageShell>
  );
}

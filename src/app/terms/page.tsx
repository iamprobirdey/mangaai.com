import { Logo, PageShell } from "@/components/ui";

export const metadata = { title: "Terms" };

// DRAFT — have a lawyer review before launch.
export default function TermsPage() {
  return (
    <PageShell>
      <Logo />
      <article className="mt-8 max-w-prose space-y-4">
        <h1 className="text-3xl">Terms of service</h1>
        <p className="hint">Draft. This page must be reviewed by a lawyer before launch.</p>
        <h2 className="text-xl">The plan</h2>
        <p>
          One family plan, billed monthly or yearly, covering up to 5 reader profiles. New families get a free trial; you&apos;re
          charged when it ends unless you cancel first. Plans renew automatically until cancelled.
        </p>
        <h2 className="text-xl">Cancelling</h2>
        <p>
          Cancel any time in Billing. Cancelling during a trial means you&apos;re never charged. Otherwise reading stays open until
          the end of the period you&apos;ve paid for.
        </p>
        <h2 className="text-xl">Failed payments</h2>
        <p>If a renewal fails, we retry and keep reading open for a short grace period before access pauses.</p>
        <h2 className="text-xl">Using MangaAI</h2>
        <p>
          The account is for your household. Don&apos;t share it outside your family, copy or download pages, or scrape the
          service. We may suspend accounts that do.
        </p>
        <h2 className="text-xl">AI-made stories</h2>
        <p>Our stories are created with the help of AI tools and every page is reviewed by a person before it is published.</p>
      </article>
    </PageShell>
  );
}

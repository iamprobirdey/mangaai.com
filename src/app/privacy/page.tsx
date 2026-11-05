import Link from "next/link";
import type { ReactNode } from "react";
import { PublicFooter, PublicHeader, PublicSite } from "@/components/public-chrome";
import { OPERATOR, PRIVACY_VERSION } from "@/lib/site";
import { formatDate } from "@/lib/dates";

export const metadata = {
  title: "Privacy policy",
  description: "What MangaAI collects about parents and children, why, who processes it, how long we keep it, and your rights.",
  alternates: { canonical: "/privacy" },
};

/*
 * Written to cover India's Digital Personal Data Protection Act 2023 and DPDP Rules 2025
 * (children's provisions apply from 13 May 2027) and the US COPPA Rule as amended in 2025
 * (compliance from 22 April 2026). It describes what the code actually does; if you change data
 * handling, change this page, PRIVACY_VERSION in src/lib/site.ts, and the retention numbers in
 * supabase/migrations/20261105000100_retention_and_erasure.sql together.
 * Still needs review by a qualified lawyer before launch.
 */

const H2 = ({ id, children }: { id?: string; children: ReactNode }) => (
  <h2 id={id} className="scroll-mt-24 pt-4 text-2xl">{children}</h2>
);

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>{head.map((h) => <th key={h} className="border-b-2 border-ink p-2 font-bold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="align-top">{r.map((c, j) => <td key={j} className="border-b border-tone-deep p-2">{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <PublicSite>
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <article className="space-y-4 leading-relaxed">
          <h1 className="text-3xl sm:text-4xl">Privacy policy</h1>
          <p className="hint">Version {PRIVACY_VERSION} · last updated {formatDate(PRIVACY_VERSION)}</p>

          <nav aria-label="On this page" className="panel-flat p-4 text-sm">
            <p className="font-bold">In short</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>A parent or guardian (18+) owns every account. Children never sign up and never give us contact details.</li>
              <li>For a child we keep a nickname, an animal avatar, an age range and their reading activity. Nothing else.</li>
              <li>We use it only to run MangaAI for your family. No ads, no chat, no selling or sharing for advertising, no profiling.</li>
              <li>Analytics run only on grown-up pages, only if you agree, and never on children&apos;s screens.</li>
              <li>You can see, download, correct or delete your family&apos;s data yourself, any time.</li>
            </ul>
            <p className="mt-3">
              Jump to: <a className="underline" href="#children">children</a> · <a className="underline" href="#parents">parents</a> ·{" "}
              <a className="underline" href="#use">how we use it</a> · <a className="underline" href="#processors">who processes it</a> ·{" "}
              <a className="underline" href="#retention">how long</a> · <a className="underline" href="#rights">your rights</a> ·{" "}
              <a className="underline" href="#contact">contact &amp; complaints</a>
            </p>
          </nav>

          <H2 id="who">1. Who we are</H2>
          <p>
            MangaAI (mangaai.com) is run by {OPERATOR.name}, {OPERATOR.city} (&quot;we&quot;, &quot;us&quot;). We decide how personal data
            on MangaAI is used, so under India&apos;s Digital Personal Data Protection Act, 2023 (&quot;DPDP Act&quot;) we are the
            Data Fiduciary, and for families in the United States we are the &quot;operator&quot; under the Children&apos;s Online
            Privacy Protection Act (&quot;COPPA&quot;). Questions about this policy go to our Grievance Officer (see{" "}
            <a className="underline" href="#contact">section 12</a>).
          </p>

          <H2 id="accounts">2. Who the account belongs to</H2>
          <p>
            MangaAI is a reading service for children aged about 4 to 17, paid for and managed by a parent or legal guardian.
            Only an adult aged 18 or over can create an account. Children use MangaAI through reader profiles that the parent
            creates inside their own account; children never create accounts, sign in with their own email, or give us any contact
            details. Under the DPDP Act everyone under 18 is a child, so we treat every reader profile, including those in the 13+
            range, as a child&apos;s.
          </p>

          <H2 id="children">3. What we collect about children, and parental consent</H2>
          <p>For each reader profile, we keep only:</p>
          <Table
            head={["Data", "Where it comes from", "Why"]}
            rows={[
              ["Nickname (up to 20 characters)", "The parent types it", "To show whose profile it is. Please don't use a full name."],
              ["Animal avatar (one of 8 presets)", "The parent picks it", "So young children can find their profile"],
              ["Age range (4–6, 7–9, 10–12, 13+)", "The parent picks it", "To show only books suitable for that age"],
              ["Daily reading limit (optional)", "The parent sets it", "To stop reading when the limit is reached"],
              ["Reading activity: books opened, last page reached, finished books, minutes and pages read per day, badges, shelf, series the parent hid", "Created as the child reads", "To remember the page, apply the limit, award badges, and send the parent the weekly report"],
            ]}
          />
          <p>
            We never ask a child for, and do not collect, their real name, photo, date of birth, email, phone number, address,
            location, voice or any other way to contact them. There is no chat, messaging, comments, uploads or public profile, so a
            child cannot share personal information with anyone through MangaAI.
          </p>
          <p>
            <strong>Parental consent.</strong> Before any reader profile exists, the parent creates an account, confirms they are
            an adult and the child&apos;s parent or guardian, and gives a separate, explicit consent to the processing described in
            this section. When the first reader profile is created we email the parent a notice setting out exactly what we keep
            and why, and a day later a second email confirming that consent and explaining how to withdraw it. Starting the free
            trial also requires the parent to authorise a card or UPI mandate with Razorpay, which is a further check that the
            account holder is an adult. If you believe a child has created an account or a profile without a parent&apos;s
            permission, write to {OPERATOR.privacyEmail} and we will delete it.
          </p>
          <p>
            <strong>What we never do with children&apos;s data:</strong> we don&apos;t show advertising (targeted or otherwise),
            we don&apos;t track children across other websites or apps, we don&apos;t build behavioural or marketing profiles of
            them, we don&apos;t sell or share their data, and analytics are never loaded on children&apos;s screens. Reading
            activity is used only to provide the reading service and the parent&apos;s own reports.
          </p>

          <H2 id="parents">4. What we collect about parents</H2>
          <Table
            head={["Data", "Why"]}
            rows={[
              ["Email address and password (stored hashed by our authentication provider)", "To create and secure your account and send service emails"],
              ["First name (optional)", "To greet you in emails"],
              ["Grown-ups PIN (stored only as a one-way hash) and failed-attempt counts", "To keep children out of the grown-ups area"],
              ["Date and version of the consent you gave", "To show that consent was given"],
              ["Email preferences, and which emails we sent and whether they were delivered or opened", "To avoid duplicates and to know our emails arrive"],
              ["Plan, price, currency, trial and renewal dates, payment status", "To run your subscription"],
              ["The country your connection appears to come from (not stored)", "To show prices in the right currency"],
            ]}
          />
          <p id="payments">
            <strong>Payments</strong> are handled by Razorpay. You enter card or UPI details on Razorpay&apos;s secure checkout; we
            never see or store them. Razorpay tells us whether a payment succeeded and sends us payment notifications, which we keep
            only as set out in <a className="underline" href="#retention">section 8</a>.
          </p>

          <H2 id="automatic">5. Cookies, device storage and analytics</H2>
          <Table
            head={["Name", "Type", "Purpose", "How long"]}
            rows={[
              ["Sign-in cookies (sb-…)", "Essential cookie", "Keeps you signed in", "Until you sign out"],
              ["mg_child", "Essential cookie", "Remembers which reader is using this device", "180 days"],
              ["mg_parent", "Essential cookie", "Keeps the grown-ups area unlocked after you enter your PIN", "15 minutes"],
              ["mg_analytics_consent", "Device storage", "Remembers your cookie-banner choice", "Until you change it"],
              ["Offline book cache and mg_last_reader", "Device storage", "Lets books opened recently work offline on this device. The cache is cleared when you sign out or a different reader is chosen", "Books: 7 days"],
              ["Google Analytics (_ga…)", "Analytics cookie, only if you agree", "Counts visits to grown-up pages so we can improve them", "Up to 2 years; Google keeps the visit statistics for 2 months"],
            ]}
          />
          <p id="analytics">
            Google Analytics is loaded only after you accept it in the cookie banner, and only on pages for grown-ups: the home
            page, sign-up and sign-in, guides, legal pages and the grown-ups area. It is never loaded on children&apos;s reading
            screens or the reader picker. Google Signals and advertising features are off, and page addresses are sent without query
            strings. Change your choice any time with &quot;Cookie settings&quot; at the bottom of public pages. Our servers also keep
            short security logs (IP address, time, page requested) to detect abuse; see <a className="underline" href="#retention">section 8</a>.
          </p>

          <H2 id="use">6. How we use data, and the basis for it</H2>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Providing MangaAI</strong> (your consent and our contract with you): accounts, reader profiles, showing age-appropriate books, the reader, progress, limits, badges.</li>
            <li><strong>Payments and subscription</strong> (contract): trials, renewals, failed-payment handling, receipts.</li>
            <li><strong>Service emails</strong> (contract and consent): sign-up confirmation, the children&apos;s-data notice and confirmation, trial reminders, payment problems, and the weekly reading report, which you can turn off in Settings.</li>
            <li><strong>Keeping the service safe</strong> (legitimate uses allowed by law): preventing abuse, securing accounts, fixing faults.</li>
            <li><strong>Improving grown-up pages</strong> (your consent, via the cookie banner): Google Analytics as described above.</li>
            <li><strong>Legal duties</strong>: keeping records the law requires and responding to lawful requests.</li>
          </ul>
          <p>We don&apos;t sell personal data, rent it, use it for advertising, or make automated decisions about you or your child that have legal or similar effects.</p>

          <H2 id="processors">7. Who processes it for us</H2>
          <p>
            We share personal data only with service providers who process it on our behalf, under contract, to run MangaAI. They
            may not use it for their own purposes. We don&apos;t share children&apos;s data with anyone else, so there is no
            third-party disclosure for you to opt in or out of.
          </p>
          <Table
            head={["Provider", "What they do", "Data involved", "Where"]}
            rows={[
              ["Supabase", "Database, sign-in, file storage", "All account, reader-profile and reading data", "Mumbai, India"],
              ["DigitalOcean", "Runs our web server", "Data passing through the site; server security logs", "Bengaluru, India"],
              ["Razorpay", "Payments and subscriptions", "Parent email, phone (if given to Razorpay), payment details", "India"],
              ["Resend", "Sends our emails", "Parent email and name; in the weekly report, readers' nicknames and reading totals", "United States"],
              ["Google (Analytics)", "Visit statistics on grown-up pages, only with consent", "Device and usage data from those pages; never children's screens", "United States and elsewhere"],
            ]}
          />
          <p>
            Some providers process data outside India. The DPDP Act allows this except to countries the Government of India
            restricts; we will stop any transfer that becomes restricted. We may also disclose data if the law requires it, to
            protect someone&apos;s safety, or to a buyer if MangaAI is sold (the buyer must keep this policy&apos;s promises or ask you
            again).
          </p>

          <H2 id="retention">8. How long we keep it</H2>
          <p>We keep data only for as long as we need it for the purpose it was collected for, and never indefinitely:</p>
          <Table
            head={["Data", "Kept for", "Then"]}
            rows={[
              ["A reader profile and its progress, badges, shelf and hidden series", "As long as the profile exists", "Deleted immediately when you delete the profile or the account"],
              ["Daily reading totals (minutes and pages per day)", "400 days", "Deleted automatically every day; streaks and reports only need recent days"],
              ["Your account details and PIN hash", "As long as the account exists", "Deleted immediately when you delete the account"],
              ["Record of emails sent, delivered or opened", "400 days", "Deleted automatically"],
              ["Razorpay payment notifications we receive", "400 days, or until you delete the account if sooner", "Deleted automatically. Razorpay keeps its own payment records as Indian tax and payments law requires."],
              ["Checkouts you started but never paid for", "30 days", "Deleted automatically"],
              ["Server security logs (IP address, time, page)", "Up to 1 year, as Indian law requires for security logs", "Deleted"],
              ["Database backups held by Supabase", "Up to 7 days", "Overwritten; deleted data disappears from backups within this window"],
            ]}
          />
          <p>
            Withdrawing consent works the same way as deleting: remove a reader profile, or delete the account in Settings, and that
            data is erased. If you&apos;d rather we did it, write to {OPERATOR.privacyEmail}.
          </p>

          <H2 id="security">9. How we protect it</H2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Encryption in transit (HTTPS) and at rest in our database and storage.</li>
            <li>Row-level security in the database, so each family can reach only its own data; staff access is limited to what&apos;s needed.</li>
            <li>Book pages are served through short-lived private links and are never public files.</li>
            <li>PINs and passwords are stored only as one-way hashes; repeated wrong PINs lock the grown-ups area.</li>
            <li>Secrets are kept on the server only; payment card data never reaches our systems.</li>
            <li>We review these safeguards and the risks to children&apos;s data at least once a year and confirm our providers protect data to a similar standard.</li>
          </ul>
          <p id="breach">
            <strong>If something goes wrong.</strong> If a breach affects your data, we will tell you without delay, explaining
            what happened, what it may mean for you, what we&apos;re doing about it and what you can do, and we will report it to
            the Data Protection Board of India and any other authority as the law requires.
          </p>

          <H2 id="rights">10. Your rights and choices</H2>
          <p>As the account holder, and on behalf of your children, you can:</p>
          <Table
            head={["You want to", "How"]}
            rows={[
              ["See and get a copy of your family's data", <>Settings → <strong>Download my data</strong> (a complete file), or write to us for a summary</>],
              ["Correct it", "Edit names, avatars, age ranges and limits in Readers; your name and email preferences in Settings"],
              ["Delete it, or withdraw consent", "Delete a reader profile in Readers, or the whole account in Settings; or write to us"],
              ["Stop the weekly report", "Settings → turn off weekly emails"],
              ["Stop analytics", "Cookie settings at the bottom of public pages"],
              ["Refuse further collection from your child while keeping your account", "Delete that child's reader profile; nothing more is collected for them"],
              ["Nominate someone to act for you if you die or can't act yourself", `Write to ${OPERATOR.privacyEmail} with their name and contact`],
              ["Complain", "Write to our Grievance Officer (below). If you're not satisfied, you can complain to the Data Protection Board of India; US families can also contact the Federal Trade Commission"],
            ]}
          />
          <p>
            We answer requests within 30 days, and always within the 90 days the DPDP Rules allow. We may ask you to confirm the
            request from the account&apos;s email address so we know it&apos;s really you. Exercising a right is free.
          </p>

          <H2 id="changes">11. Changes to this policy</H2>
          <p>
            If we change how we use children&apos;s data, or anything else in a way that matters, we&apos;ll email account holders
            before the change takes effect and, where the law requires, ask for consent again. The version and date at the top
            show which policy is current.
          </p>

          <H2 id="contact">12. Contact and Grievance Officer</H2>
          <p>
            Grievance Officer: {OPERATOR.grievanceOfficer}, MangaAI, {OPERATOR.city}
            <br />
            Email: <a className="underline" href={`mailto:${OPERATOR.privacyEmail}`}>{OPERATOR.privacyEmail}</a> (privacy and data
            requests) · <a className="underline" href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a> (everything else)
          </p>
          <p>
            See also our <Link className="underline" href="/terms">terms of service</Link>.
          </p>
        </article>
      </main>
      <PublicFooter />
    </PublicSite>
  );
}

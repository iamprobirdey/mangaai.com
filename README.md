# MangaAI

A subscription manga reader for kids. A parent signs up and pays; each child gets their own reader profile
with age-appropriate series, a bookshelf, reading progress, streaks and badges.

**Stack:** Next.js 16 (App Router) · Supabase (Postgres, Auth, Storage) · Razorpay Subscriptions · Resend · Tailwind CSS 4

## What's included

**Families**
- Email sign-up and sign-in for grown-ups, with email confirmation, password reset and a recorded consent checkbox.
- First-run setup: a 4-digit grown-ups PIN and the first reader profile.
- "Who's reading?" picker. Each child profile has a nickname, a preset avatar and an age range. Nothing else is collected.
- Grown-ups area behind the PIN (unlocks for 15 minutes; 5 wrong tries lock the PIN for 15 minutes):
  - weekly overview per child
  - reader profiles, with up to 5 per family
  - a daily reading-time limit and hidden series per child
  - billing
  - settings, including turning off the weekly email and deleting the account (which cancels the subscription and deletes all data)

**Kids**
- Bookshelf home with:
  - a "Continue reading" row
  - new chapters from this week
  - "My shelf"
  - genre rows
  - search
- Series pages with volumes and chapters, read/unread state, Free and locked labels, and a "New chapters every <day>" note.
- The reader:
  - right-to-left manga, left-to-right comic and vertical webtoon modes (set per series)
  - tap zones, swipes and arrow keys that follow the reading direction
  - zoom, a page slider and preloading of the next pages
  - a one-time "manga reads right to left" hint
  - auto-saved progress
  - a finished-chapter screen with the next chapter
  - a daily time limit enforced by a server heartbeat
- Gentle streaks (reading at least every other day keeps it going) and 9 badges.

**Content protection:** readers never receive a PDF. Uploaded PDFs are converted to WebP page images, which are stored in a
private bucket and served through 1-hour signed URLs, only after a server-side check. That check confirms the child's age
range, that the series isn't hidden for them, and that the family has a subscription (or the chapter is a free preview).

**Admin studio** (`/admin`, for profiles with `role = 'admin'`, behind the same PIN)
- Series with title, slug, synopsis, cover, a required age range, genres, reading direction, weekly release day and an AI-made flag. Series can be draft, published or archived.
- Volumes and chapters, with free-preview chapters.
- PDF upload that runs in the browser (pdf.js → WebP), with a progress bar. The original PDF is kept in a private bucket.
- A required review step: you look at every page, tick the confirmation, then approve and schedule a release time. The database refuses to approve an unreviewed chapter.
- Analytics:
  - monthly recurring revenue, paying families, families in trial or grace
  - trial-to-paid conversion and 30-day churn
  - readers per family, active readers over 7 days and weekly emails sent
  - top series
  - per-chapter completion and the page where most readers stop
- A families list showing subscription status.

**Billing (Razorpay Subscriptions)**
- Monthly and yearly plans. New families get a free trial: the subscription starts `TRIAL_DAYS` after the mandate is set up, so the first charge happens when the trial ends.
- Webhooks are the source of truth. They are idempotent and their signatures are verified.
- Cancelling during a trial is immediate (nothing is charged). A paid plan cancels at the end of the period.
- Failed renewals keep reading open while Razorpay retries (`pending`). Once retries stop (`halted`), access continues for `GRACE_DAYS` past the paid-through date, so a child isn't locked out mid-chapter.

**Emails to parents (Resend):**
- A weekly summary, sent every Sunday at 19:00 IST to families who read something that week.
- A trial-ending reminder, sent 2 days before the first charge (a daily job, at most once per trial).
- Opens are tracked through a Resend webhook, and analytics shows the weekly email's open rate.

**Installable app and offline reading**
- Families can add MangaAI to the home screen. It has its own icon and opens on "Who's reading?".
- Chapters a child opens stay readable offline for 7 days, which helps on car trips. An offline page lists them.
- Saved chapters are cleared on sign-out, on account deletion, and when a different reader is picked on the same device.
- Page images come in two sizes, 800px for phones and 1400px for larger screens, and the browser picks the right one.

**SEO**
- Public, indexable pages:
  - a page for each series at `/manga/<slug>`, with a sample of free pages
  - an age hub at `/manga-for-kids` and four age pages
  - parent guides at `/guides`
- A dynamic `sitemap.xml`, plus a `robots.txt` that blocks every private area and lets AI assistants read public pages.
- `llms.txt`, a generated share image, canonical URLs, structured data (Organization, WebSite, ComicSeries, BreadcrumbList, ItemList, Article), and cover alt text.
- Private pages are marked no-index. Vercel preview deployments, and anything not marked as production, are kept out of search entirely (`SITE_INDEXABLE`).
- `www` and the bare domain redirect to the address in `NEXT_PUBLIC_SITE_URL`. Security headers are set on every response.

**Google Analytics (GA4), set up for a children's service** (`NEXT_PUBLIC_GA_ID`)
- Loads only on parent-facing pages: home, sign-up and sign-in, guides, legal pages and the grown-ups area. It never loads on `/profiles`, `/read/*`, series and age pages, or `/admin`.
- Loads only after the visitor accepts the consent banner. Google Signals and ad personalisation are off, and ad storage is always denied.
- Navigating to a page where it isn't allowed switches it off with Google's opt-out flag. Query strings are dropped.
- Events: `sign_up`, `begin_checkout`, `trial_started` and `subscription_started`. "Cookie settings" in the footer lets visitors change their choice.
- In GA, keep Google Signals off and don't link Google Ads. Under **Admin → Data streams → Enhanced measurement**, turn off "Page changes based on browser history events" (the app sends its own page views).

## Setup

### 1. Supabase
A project called **mangaai** (`guvmmahhqajqznbflufw`, Mumbai region) already exists with every migration applied:
- `NEXT_PUBLIC_SUPABASE_URL=https://guvmmahhqajqznbflufw.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the `sb_publishable_…` key under Project settings → API keys
- `SUPABASE_SECRET_KEY`: create a secret key on the same page. Keep it server-side only.

To set up another project, run `supabase link` then `supabase db push`, or paste the files in `supabase/migrations/` into the SQL editor in order.
The migrations create the tables, row-level security (helpers live in a non-exposed `private` schema), and the `covers` (public), `pages` (private) and `originals` (private) buckets.
3. Go to **Authentication → URL configuration**. Set the Site URL to your domain and add `https://YOUR-DOMAIN/auth/callback` to the redirect URLs.
4. After you sign up on the site, make yourself an admin:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

### 2. Resend (email)
1. Verify your sending domain and set `RESEND_API_KEY` and `EMAIL_FROM`.
2. Under **Webhooks**, add `https://YOUR-DOMAIN/api/email/webhook` with the `email.delivered` and `email.opened` events. Put the signing secret in `RESEND_WEBHOOK_SECRET`.

### 3. Razorpay
1. Under **Subscriptions → Plans**, create a monthly plan and a yearly plan. Put their IDs in `RAZORPAY_PLAN_MONTHLY_INR` and `RAZORPAY_PLAN_ANNUAL_INR` (and the `_USD` ones for dollar plans).
2. Under **Settings → Webhooks**, add `https://YOUR-DOMAIN/api/billing/webhook` with a secret. Enable all `subscription.*` events.
3. Set the plan IDs and amounts (in the smallest currency unit) in your environment.

**Country-based pricing.** Visitors in India see and pay rupees. Everyone else sees dollars, provided USD plans are set.
The country comes from the hosting platform's geo header (`x-vercel-ip-country` on Vercel, `cf-ipcountry` on Cloudflare).
Locally, set `PRICING_REGION=IN` or `INTL` to test either one.

- **INR test plans (already created):** ₹749/month `plan_TvyYMAHfvVDIma`, ₹5,749/year `plan_TvyZKEnPjczZI7`.
- **USD plans:** Razorpay's dashboard only creates INR plans. Ask Razorpay support to enable international payments for Subscriptions, then add USD plans ($9/month, $69/year) and set the `*_USD` variables. Until then, families outside India are shown and charged INR.
- Each subscription stores the price and currency it was sold at. Analytics reports revenue separately per currency.

### 4. Run locally
```bash
cp .env.example .env.local   # fill in the values
npm install                  # also copies the pdf.js worker into /public
npm run dev
```

### 5. Deploy (Vercel)
Import the repo, add every variable from `.env.example`, and deploy. Vercel picks up both scheduled jobs from `vercel.json`
(the weekly summary and the daily trial reminders) and sends `CRON_SECRET` with each call.

## Scripts
| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm run lint` | ESLint |
| `npm test` | Unit tests for streaks, subscription access and badges |

## Project layout
```
src/app/
  page.tsx                 landing page with pricing
  (auth)/                  login, signup, forgot/reset password
  setup/                   first-run PIN + first reader
  profiles/                "Who's reading?"
  read/(home)/             kids' bookshelf, series pages, badges
  read/chapter/[id]/       the reader (full screen)
  parent/(area)/           grown-ups area (PIN-gated): overview, readers, billing, settings
  admin/                   content studio and analytics
  api/progress, heartbeat  reading progress and time limits
  api/billing/*            Razorpay checkout verification and webhook
  api/cron/*               weekly parent email, trial-ending reminders
  api/email/webhook        Resend delivery/open tracking
src/lib/                   data access, entitlement rules, streaks, badges, Razorpay, email
supabase/migrations/       schema, RLS and storage
```

## Before launch
- **Get a lawyer to review the legal pages and data handling.** `/privacy` and `/terms` are drafts. Because readers are children, COPPA (US) applies, and so does India's DPDP Act, including verifiable parental consent for children's data. Add GDPR if you serve the EU or UK.
- Turn on **Leaked password protection** and set rate limits in Supabase Auth.
- Push notifications are left out on purpose: the readers are children, and the weekly email to parents does that job.

import "server-only";
import { serverEnv, publicEnv } from "@/lib/env";
import { avatarEmoji } from "@/lib/constants";
import { BADGES, type BadgeKey } from "@/lib/badges";
import { formatMinutes } from "@/lib/dates";
import type { ChildWeek } from "@/lib/family-stats";
import { OPERATOR } from "@/lib/site";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<{ skipped: true; id?: undefined } | { skipped: false; id: string | null }> {
  const key = serverEnv.resendKey();
  if (!key) {
    console.warn(`[email] RESEND_API_KEY not set; skipping "${subject}" to ${to}`);
    return { skipped: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: serverEnv.emailFrom(), to, subject, html, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { skipped: false, id: data.id ?? null };
}

const shell = (body: string) => `<!doctype html><html><body style="margin:0;background:#eef2fb;font-family:Arial,sans-serif;color:#1c1f4a">
    <div style="max-width:560px;margin:0 auto;padding:24px">
      <p style="font-size:20px;font-weight:bold;margin:0">MangaAI</p>
      ${body}
    </div></body></html>`;

const button = (href: string, label: string) =>
  `<p><a href="${href}" style="display:inline-block;background:#ffc83d;color:#1c1f4a;border:3px solid #1c1f4a;border-radius:999px;padding:10px 18px;font-weight:bold;text-decoration:none">${label}</a></p>`;

/**
 * Direct notice to the parent when they create the first reader profile (COPPA 312.4(c), DPDP
 * Rule 3). Says exactly what is collected about the child, why, who processes it, and how to undo it.
 */
export function parentNoticeEmail(parentName: string | null, childNickname: string) {
  const site = publicEnv.siteUrl();
  const greeting = parentName ? `Hi ${esc(parentName)},` : "Hi,";
  const nick = esc(childNickname);
  const html = shell(`
      <p>${greeting}</p>
      <p>You've just created a reader profile for <strong>${nick}</strong> on MangaAI. Because ${nick} is a child, here is exactly what we keep and why.</p>
      <p style="font-weight:bold;margin-bottom:4px">What we store about ${nick}</p>
      <ul style="margin-top:0">
        <li>The nickname, animal avatar and age range you chose</li>
        <li>Reading activity: which books were opened, the last page, minutes read per day, badges and their shelf</li>
      </ul>
      <p>We never ask for a child's real name, photo, birthday, email, location or voice. There's no chat, no ads and no in-app purchases.</p>
      <p style="font-weight:bold;margin-bottom:4px">How we use it</p>
      <p style="margin-top:0">Only to run MangaAI for your family: show the right books for ${nick}'s age, remember the page, apply the limits you set, award badges, and send you the weekly reading report. We don't sell it, share it for advertising, or use it to profile ${nick}. Our hosting, database and email providers process it on our behalf under contract.</p>
      <p style="font-weight:bold;margin-bottom:4px">You're in control</p>
      <p style="margin-top:0">You can edit or delete ${nick}'s profile, download your family's data, or delete the whole account any time in the grown-ups area. Deleting removes the reading history straight away.</p>
      ${button(`${site}/privacy#children`, "Read the full privacy notice")}
      <p>If you didn't create this profile, or you don't agree, reply to this email or write to ${OPERATOR.privacyEmail} and we'll delete it.</p>`);
  const text = `${greeting}

You've just created a reader profile for ${childNickname} on MangaAI. Here is what we keep and why.

What we store about ${childNickname}: the nickname, animal avatar and age range you chose, and reading activity (books opened, last page, minutes per day, badges, shelf). We never ask for a child's real name, photo, birthday, email, location or voice. No chat, no ads, no in-app purchases.

How we use it: only to run MangaAI for your family (age-right books, remembering the page, your limits, badges, your weekly report). We don't sell it, share it for advertising, or profile your child. Our hosting, database and email providers process it on our behalf.

You're in control: edit or delete the profile, download your data, or delete the account any time in the grown-ups area.

Full notice: ${site}/privacy#children
Didn't create this profile or don't agree? Reply or write to ${OPERATOR.privacyEmail} and we'll delete it.`;
  return { subject: `About ${childNickname}'s reader profile on MangaAI`, html, text };
}

/** The "plus" in email-plus consent: a later confirmation the parent can act on (COPPA 312.5(b)(2)(vi)). */
export function parentConsentConfirmEmail(parentName: string | null, consentDate: string) {
  const site = publicEnv.siteUrl();
  const greeting = parentName ? `Hi ${esc(parentName)},` : "Hi,";
  const html = shell(`
      <p>${greeting}</p>
      <p>A quick confirmation: on <strong>${esc(consentDate)}</strong> you agreed that MangaAI may keep reader profiles and reading activity for your children, as described in our privacy notice.</p>
      <p>You can change your mind any time. Delete a reader profile or the whole account in the grown-ups area and their data is erased.</p>
      ${button(`${site}/parent/readers`, "Manage reader profiles")}
      <p>If this wasn't you, reply to this email or write to ${OPERATOR.privacyEmail} and we'll delete the account.</p>`);
  const text = `${greeting}

A quick confirmation: on ${consentDate} you agreed that MangaAI may keep reader profiles and reading activity for your children, as described in our privacy notice (${site}/privacy#children).

Change your mind any time: delete a reader profile or the whole account in the grown-ups area (${site}/parent/readers).
If this wasn't you, reply or write to ${OPERATOR.privacyEmail} and we'll delete the account.`;
  return { subject: "Confirming your consent for your children's reader profiles", html, text };
}

export function trialEndingEmail(parentName: string | null, opts: { chargeDate: string; price: string; plan: string }) {
  const site = publicEnv.siteUrl();
  const greeting = parentName ? `Hi ${esc(parentName)},` : "Hi,";
  const html = shell(`
      <p>${greeting}</p>
      <p>Your MangaAI free trial ends on <strong>${esc(opts.chargeDate)}</strong>. On that day your ${esc(opts.plan)} plan starts and you'll be charged <strong>${esc(opts.price)}</strong>.</p>
      <p>Nothing to do if you'd like to keep reading. If not, cancel before then and you won't pay anything:</p>
      <p><a href="${site}/parent/billing" style="display:inline-block;background:#ffc83d;color:#1c1f4a;border:3px solid #1c1f4a;border-radius:999px;padding:10px 18px;font-weight:bold;text-decoration:none">Manage your plan</a></p>
      <p style="font-size:12px;color:#4a4e7a">You'll need your grown-ups PIN to open Billing.</p>`);
  const text = `${greeting}\n\nYour MangaAI free trial ends on ${opts.chargeDate}. Your ${opts.plan} plan then starts and you'll be charged ${opts.price}.\nTo cancel before then: ${site}/parent/billing`;
  return { subject: `Your free trial ends on ${opts.chargeDate}`, html, text };
}

export function weeklyDigestEmail(
  parentName: string | null,
  kids: { nickname: string; avatar: string; week: ChildWeek }[],
) {
  const site = publicEnv.siteUrl();
  const greeting = parentName ? `Hi ${esc(parentName)},` : "Hi,";
  const blocks = kids.map(({ nickname, avatar, week }) => {
    const chapters = week.chaptersFinished.length
      ? `<ul style="margin:8px 0 0;padding-left:20px">${week.chaptersFinished
          .slice(0, 8)
          .map((c) => `<li><strong>${esc(c.series)}</strong> — ${esc(c.title)}</li>`)
          .join("")}</ul>`
      : `<p style="margin:8px 0 0;color:#4a4e7a">No books finished this week.</p>`;
    const badges = week.badges.length
      ? `<p style="margin:10px 0 0">New badges: ${week.badges
          .map((b) => `${BADGES[b as BadgeKey]?.icon ?? ""} ${esc(BADGES[b as BadgeKey]?.name ?? b)}`)
          .join(", ")}</p>`
      : "";
    return `
      <div style="border:3px solid #1c1f4a;border-radius:10px;padding:16px;margin:16px 0;background:#fff">
        <h2 style="margin:0;font-size:20px">${avatarEmoji(avatar)} ${esc(nickname)}</h2>
        <p style="margin:8px 0 0">${formatMinutes(week.seconds)} of reading on ${week.daysRead} of 7 days · ${week.pages} pages · streak: ${week.streak} ${week.streak === 1 ? "day" : "days"}</p>
        ${chapters}
        ${badges}
      </div>`;
  });

  const html = `<!doctype html><html><body style="margin:0;background:#eef2fb;font-family:Arial,sans-serif;color:#1c1f4a">
    <div style="max-width:560px;margin:0 auto;padding:24px">
      <p style="font-size:20px;font-weight:bold;margin:0">MangaAI weekly reading</p>
      <p>${greeting}</p>
      <p>Here's what your family read in the last 7 days.</p>
      ${blocks.join("")}
      <p><a href="${site}/parent" style="color:#1c1f4a">Open the grown-ups area</a> to change reading limits or hide series.</p>
      <p style="font-size:12px;color:#4a4e7a">You get this because weekly summaries are on. Turn them off any time in <a href="${site}/parent/settings" style="color:#4a4e7a">Settings</a>.</p>
    </div></body></html>`;

  const text = [
    greeting,
    "Here's what your family read in the last 7 days.",
    ...kids.map(
      ({ nickname, week }) =>
        `\n${nickname}: ${formatMinutes(week.seconds)} on ${week.daysRead} of 7 days, ${week.pages} pages, streak ${week.streak}.` +
        (week.chaptersFinished.length ? `\n  Finished: ${week.chaptersFinished.map((c) => `${c.series} — ${c.title}`).join("; ")}` : ""),
    ),
    `\nGrown-ups area: ${site}/parent`,
    `Turn these emails off: ${site}/parent/settings`,
  ].join("\n");

  return { subject: "This week in your family's reading", html, text };
}

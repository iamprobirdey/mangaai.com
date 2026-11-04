import "server-only";
import { serverEnv, publicEnv } from "@/lib/env";
import { avatarEmoji } from "@/lib/constants";
import { BADGES, type BadgeKey } from "@/lib/badges";
import { formatMinutes } from "@/lib/dates";
import type { ChildWeek } from "@/lib/family-stats";

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
      : `<p style="margin:8px 0 0;color:#4a4e7a">No chapters finished this week.</p>`;
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

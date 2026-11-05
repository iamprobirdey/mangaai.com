import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { parentNoticeEmail, sendEmail } from "@/lib/email";

/**
 * Sends the parent the direct notice about a new reader profile and records it. Never throws:
 * a mail outage must not stop a family from finishing setup (the daily job does not resend it,
 * but the same information is always on /privacy#children).
 */
export async function sendParentNotice(parentId: string, childId: string, nickname: string) {
  try {
    const admin = createAdminClient();
    const [{ data: profile }, { data: userRes }] = await Promise.all([
      admin.from("profiles").select("display_name").eq("id", parentId).maybeSingle(),
      admin.auth.admin.getUserById(parentId),
    ]);
    const email = userRes.user?.email;
    if (!email) return;
    const message = parentNoticeEmail(profile?.display_name ?? null, nickname);
    const r = await sendEmail(email, message.subject, message.html, message.text);
    if (!r.skipped) {
      await admin.from("email_log").insert({ parent_id: parentId, kind: "parent_notice", ref_id: childId, provider_id: r.id });
    }
  } catch (e) {
    console.error("parent notice email failed", e);
  }
}

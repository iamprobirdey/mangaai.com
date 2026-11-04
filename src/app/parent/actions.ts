"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getChildren,
  getProfile,
  isParentUnlocked,
  lockParent,
  requireUser,
  setActiveChild,
  unlockParent,
} from "@/lib/dal";
import { AGE_BANDS, AVATARS } from "@/lib/constants";
import type { FormState } from "@/components/forms";

const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCK_MINUTES = 15;

const pinSchema = z.string().regex(/^\d{4}$/, "The PIN must be 4 digits.");

const childSchema = z.object({
  nickname: z.string().trim().min(1, "Give the reader a nickname.").max(20, "Keep the nickname under 20 characters."),
  avatar: z.enum(Object.keys(AVATARS) as [string, ...string[]]),
  age_band: z.enum(AGE_BANDS),
  daily_limit_minutes: z
    .union([z.literal(""), z.coerce.number().int().min(5).max(600)])
    .transform((v) => (v === "" ? null : v)),
});

function readChild(formData: FormData) {
  return childSchema.safeParse({
    nickname: formData.get("nickname"),
    avatar: formData.get("avatar") ?? "cat",
    age_band: formData.get("age_band"),
    daily_limit_minutes: formData.get("daily_limit_minutes") ?? "",
  });
}

async function assertUnlocked() {
  if (!(await isParentUnlocked())) redirect("/parent/unlock");
}

// ---- First-run setup: PIN + first reader ----

export async function completeSetup(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const pin = pinSchema.safeParse(formData.get("pin"));
  if (!pin.success) return { error: pin.error.issues[0].message };
  if (formData.get("pin") !== formData.get("pin_confirm")) return { error: "The two PINs don't match." };
  const child = readChild(formData);
  if (!child.success) return { error: child.error.issues[0].message };

  const supabase = await createClient();
  const { error: pinError } = await supabase
    .from("profiles")
    .update({ pin_hash: await bcrypt.hash(pin.data, 10) })
    .eq("id", user.id);
  if (pinError) return { error: "Couldn't save the PIN. Try again." };

  const { data, error } = await supabase
    .from("children")
    .insert({ ...child.data, parent_id: user.id })
    .select("id")
    .single();
  if (error || !data) return { error: "Couldn't create the reader profile. Try again." };

  await setActiveChild(user.id, data.id);
  redirect("/read");
}

// ---- Choosing who reads ----

export async function selectChild(childId: string) {
  const user = await requireUser();
  const children = await getChildren();
  if (!children.some((c) => c.id === childId)) redirect("/profiles");
  await lockParent();
  await setActiveChild(user.id, childId);
  redirect("/read");
}

// ---- PIN gate ----

export async function unlock(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const profile = await getProfile();
  const pin = String(formData.get("pin") ?? "");
  const nextRaw = String(formData.get("next") ?? "/parent");
  const next = nextRaw.startsWith("/parent") || nextRaw.startsWith("/admin") ? nextRaw : "/parent";
  if (!profile.pin_hash) redirect("/setup");

  // Lockout lives in the database (not a cookie) so it can't be reset from the browser.
  const admin = createAdminClient();
  const { data: lock } = await admin
    .from("profiles")
    .select("pin_failed_attempts,pin_locked_until")
    .eq("id", user.id)
    .single();
  if (lock?.pin_locked_until && Date.parse(lock.pin_locked_until) > Date.now()) {
    const mins = Math.ceil((Date.parse(lock.pin_locked_until) - Date.now()) / 60_000);
    return { error: `Too many wrong tries. Try again in ${mins} minute${mins === 1 ? "" : "s"}, or reset your password.` };
  }
  if (!(await bcrypt.compare(pin, profile.pin_hash))) {
    const attempts = (lock?.pin_failed_attempts ?? 0) + 1;
    const locked = attempts >= MAX_PIN_ATTEMPTS;
    await admin
      .from("profiles")
      .update({
        pin_failed_attempts: locked ? 0 : attempts,
        pin_locked_until: locked ? new Date(Date.now() + PIN_LOCK_MINUTES * 60_000).toISOString() : null,
      })
      .eq("id", user.id);
    await new Promise((r) => setTimeout(r, 600));
    return {
      error: locked
        ? `Too many wrong tries. The PIN is locked for ${PIN_LOCK_MINUTES} minutes.`
        : `That PIN isn't right. ${MAX_PIN_ATTEMPTS - attempts} ${MAX_PIN_ATTEMPTS - attempts === 1 ? "try" : "tries"} left.`,
    };
  }
  if (lock?.pin_failed_attempts) {
    await admin.from("profiles").update({ pin_failed_attempts: 0, pin_locked_until: null }).eq("id", user.id);
  }
  await unlockParent(user.id);
  redirect(next);
}

export async function lockAndExit() {
  await lockParent();
  redirect("/profiles");
}

// ---- Reader profiles ----

export async function createChild(_: FormState, formData: FormData): Promise<FormState> {
  await assertUnlocked();
  const user = await requireUser();
  const child = readChild(formData);
  if (!child.success) return { error: child.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("children").insert({ ...child.data, parent_id: user.id });
  if (error) return { error: error.message.includes("at most 5") ? "A family can have up to 5 readers." : "Couldn't add the reader." };
  revalidatePath("/parent", "layout");
  return { ok: `${child.data.nickname} is ready to read.` };
}

export async function updateChild(_: FormState, formData: FormData): Promise<FormState> {
  await assertUnlocked();
  const id = String(formData.get("id"));
  const child = readChild(formData);
  if (!child.success) return { error: child.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("children").update(child.data).eq("id", id);
  if (error) return { error: "Couldn't save changes." };

  // Hidden series: checkboxes named hide:<seriesId>
  const hidden = [...formData.keys()].filter((k) => k.startsWith("hide:")).map((k) => k.slice(5));
  await supabase.from("child_hidden_series").delete().eq("child_id", id);
  if (hidden.length) {
    await supabase.from("child_hidden_series").insert(hidden.map((series_id) => ({ child_id: id, series_id })));
  }
  revalidatePath("/parent", "layout");
  return { ok: "Saved." };
}

export async function deleteChild(formData: FormData) {
  await assertUnlocked();
  const supabase = await createClient();
  await supabase.from("children").delete().eq("id", String(formData.get("id")));
  revalidatePath("/parent", "layout");
}

// ---- Settings ----

export async function changePin(_: FormState, formData: FormData): Promise<FormState> {
  await assertUnlocked();
  const user = await requireUser();
  const pin = pinSchema.safeParse(formData.get("pin"));
  if (!pin.success) return { error: pin.error.issues[0].message };
  if (formData.get("pin") !== formData.get("pin_confirm")) return { error: "The two PINs don't match." };
  const supabase = await createClient();
  await supabase.from("profiles").update({ pin_hash: await bcrypt.hash(pin.data, 10) }).eq("id", user.id);
  return { ok: "PIN changed." };
}

export async function updateSettings(_: FormState, formData: FormData): Promise<FormState> {
  await assertUnlocked();
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: String(formData.get("display_name") ?? "").trim().slice(0, 60) || null,
      weekly_digest: formData.get("weekly_digest") === "on",
    })
    .eq("id", user.id);
  return error ? { error: "Couldn't save settings." } : { ok: "Settings saved." };
}

export async function deleteAccount(_: FormState, formData: FormData): Promise<FormState> {
  await assertUnlocked();
  const user = await requireUser();
  if (formData.get("confirm") !== "DELETE") return { error: "Type DELETE to confirm." };
  const admin = createAdminClient();
  // Cancel any running subscription first so the family is not charged again.
  const { data: subs } = await admin
    .from("subscriptions")
    .select("razorpay_subscription_id,status")
    .eq("parent_id", user.id)
    .in("status", ["authenticated", "active", "pending", "halted"]);
  if (subs?.length) {
    const { razorpay } = await import("@/lib/razorpay");
    for (const s of subs) {
      try {
        await razorpay().subscriptions.cancel(s.razorpay_subscription_id, false);
      } catch {
        return { error: "We couldn't cancel your subscription. Try again, or cancel it from Billing first." };
      }
    }
  }
  // Deleting the auth user cascades to the profile, reader profiles and all reading data.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "Couldn't delete the account. Try again." };
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}

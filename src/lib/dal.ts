import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sign, verify } from "@/lib/sign";
import { accessFor, type SubscriptionRow } from "@/lib/entitlement";
import { serverEnv } from "@/lib/env";
import type { AgeBand } from "@/lib/constants";

export const CHILD_COOKIE = "mg_child";
export const UNLOCK_COOKIE = "mg_parent";
const UNLOCK_MINUTES = 15;

export type Profile = {
  id: string;
  role: "parent" | "admin";
  display_name: string | null;
  pin_hash: string | null;
  weekly_digest: boolean;
  trial_used: boolean;
  consent_at: string | null;
};

export type Child = {
  id: string;
  parent_id: string;
  nickname: string;
  avatar: string;
  age_band: AgeBand;
  daily_limit_minutes: number | null;
};

export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export const getProfile = cache(async (): Promise<Profile> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!data) redirect("/login");
  return data as Profile;
});

export async function requireAdmin() {
  const profile = await getProfile();
  if (profile.role !== "admin") notFound();
  return profile;
}

export const getChildren = cache(async (): Promise<Child[]> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("children").select("*").eq("parent_id", user.id).order("created_at");
  return (data ?? []) as Child[];
});

// ---- Active child profile (who is reading on this device) ----

export const getActiveChild = cache(async (): Promise<Child | null> => {
  const user = await requireUser();
  const raw = verify((await cookies()).get(CHILD_COOKIE)?.value);
  if (!raw) return null;
  const [uid, childId] = raw.split(":");
  if (uid !== user.id) return null;
  return (await getChildren()).find((c) => c.id === childId) ?? null;
});

export async function requireChild() {
  const child = await getActiveChild();
  if (!child) redirect("/profiles");
  return child;
}

/** Only call from a Server Action or Route Handler. */
export async function setActiveChild(userId: string, childId: string) {
  (await cookies()).set(CHILD_COOKIE, sign(`${userId}:${childId}`), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

// ---- Parent PIN gate ----

export async function isParentUnlocked() {
  const user = await requireUser();
  const raw = verify((await cookies()).get(UNLOCK_COOKIE)?.value);
  if (!raw) return false;
  const [uid, exp] = raw.split(":");
  return uid === user.id && Number(exp) > Date.now();
}

export async function requireParentUnlocked(next = "/parent") {
  if (!(await isParentUnlocked())) redirect(`/parent/unlock?next=${encodeURIComponent(next)}`);
}

/** Only call from a Server Action or Route Handler. */
export async function unlockParent(userId: string) {
  const exp = Date.now() + UNLOCK_MINUTES * 60_000;
  (await cookies()).set(UNLOCK_COOKIE, sign(`${userId}:${exp}`), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: UNLOCK_MINUTES * 60,
  });
}

export async function lockParent() {
  (await cookies()).delete(UNLOCK_COOKIE);
}

// ---- Subscription access ----

export async function getLatestSubscription(parentId: string): Promise<SubscriptionRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("*")
    .eq("parent_id", parentId)
    .neq("status", "created")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SubscriptionRow) ?? null;
}

export const getAccess = cache(async (parentId: string) => {
  return accessFor(await getLatestSubscription(parentId), serverEnv.graceDays());
});

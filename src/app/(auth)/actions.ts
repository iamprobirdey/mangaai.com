"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import type { FormState } from "@/components/forms";

const safeNext = (value: FormDataEntryValue | null, fallback = "/profiles") => {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
};

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: error.message === "Email not confirmed" ? "Confirm your email first. Check your inbox for the link." : "That email and password don't match." };
  redirect(safeNext(formData.get("next")));
}

const signUpSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters for your password."),
  displayName: z.string().trim().max(60).optional(),
  consent: z.literal("on", { message: "Confirm you're a parent or guardian and agree to the terms." }),
});

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName") || undefined,
    consent: formData.get("consent"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName ?? "", consent: "true" },
      emailRedirectTo: `${publicEnv.siteUrl()}/auth/callback?next=/setup`,
    },
  });
  if (error) return { error: error.message };
  if (data.session) redirect("/setup");
  return { ok: "Check your inbox. We sent a link to confirm your email." };
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email address." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${publicEnv.siteUrl()}/auth/callback?next=/reset-password` });
  return { ok: "If that email has an account, a reset link is on its way." };
}

export async function updatePassword(_: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters for your password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/profiles");
}

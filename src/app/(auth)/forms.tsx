"use client";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import { track } from "@/components/analytics";
import { FormMessage, SubmitButton } from "@/components/forms";
import { requestPasswordReset, signIn, signUp, updatePassword } from "./actions";

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/profiles"} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="field" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input className="field" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary w-full" pending="Signing in…">Sign in</SubmitButton>
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="underline">Forgot password?</Link>
        <Link href="/signup" className="underline">Create an account</Link>
      </div>
    </form>
  );
}

export function SignUpForm({ email = "" }: { email?: string }) {
  const [state, action] = useActionState(signUp, undefined);
  useEffect(() => {
    if (state?.ok) track("sign_up", { method: "email" });
  }, [state?.ok]);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="displayName">Your first name <span className="hint">(optional)</span></label>
        <input className="field" id="displayName" name="displayName" autoComplete="given-name" maxLength={60} />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="field" id="email" name="email" type="email" autoComplete="email" defaultValue={email} required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input className="field" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <p className="hint mt-1">At least 8 characters.</p>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="consent" className="mt-1 h-5 w-5 accent-ink" required />
        <span>
          I&apos;m a parent or legal guardian aged 18 or over, and I agree to the <Link className="underline" href="/terms">terms</Link>.
        </span>
      </label>
      <div className="rounded-lg border-2 border-ink bg-tone p-3 text-sm">
        <p className="font-bold">About your children&apos;s data</p>
        <p className="mt-1">
          For each child you add, MangaAI keeps only a nickname, an animal avatar, an age range and their reading activity (books,
          pages, minutes, badges). It&apos;s used only to run the service for your family and send you the weekly report. No ads,
          no chat, never sold. You can delete it any time. <Link className="underline" href="/privacy#children">Full privacy notice</Link>
        </p>
        <label className="mt-3 flex items-start gap-3">
          <input type="checkbox" name="childConsent" className="mt-1 h-5 w-5 accent-ink" required />
          <span>As their parent or guardian, I consent to MangaAI processing my children&apos;s data as described above.</span>
        </label>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary w-full" pending="Creating account…">Create account</SubmitButton>
      <p className="text-sm">
        Already have an account? <Link href="/login" className="underline">Sign in</Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="field" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary w-full" pending="Sending…">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="password">New password</label>
        <input className="field" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary w-full">Save new password</SubmitButton>
    </form>
  );
}

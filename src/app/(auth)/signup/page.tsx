import type { Metadata } from "next";
import { SignUpForm } from "../forms";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-2xl">Create the family account</h1>
      <p className="mb-6 mt-1">This account belongs to a grown-up. You&apos;ll add kids&apos; reader profiles next.</p>
      <SignUpForm />
    </>
  );
}

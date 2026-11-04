import type { Metadata } from "next";
import { SignUpForm } from "../forms";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }: PageProps<"/signup">) {
  const { email } = await searchParams;
  return (
    <>
      <h1 className="text-2xl">Create the family account</h1>
      <p className="mb-6 mt-1">This account belongs to a grown-up. You&apos;ll add kids&apos; reader profiles next.</p>
      <SignUpForm email={typeof email === "string" ? email.slice(0, 200) : ""} />
    </>
  );
}

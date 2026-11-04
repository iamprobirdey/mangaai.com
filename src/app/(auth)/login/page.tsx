import type { Metadata } from "next";
import { SignInForm } from "../forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-2xl">Welcome back</h1>
      <p className="mb-6 mt-1">Sign in with the grown-up account.</p>
      <SignInForm next={typeof next === "string" ? next : undefined} />
    </>
  );
}

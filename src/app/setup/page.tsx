import { redirect } from "next/navigation";
import { Logo } from "@/components/ui";
import { getChildren, getProfile } from "@/lib/dal";
import { SetupForm } from "./setup-form";

export const metadata = { title: "Set up your family", robots: { index: false, follow: false } };

export default async function SetupPage() {
  const [profile, children] = await Promise.all([getProfile(), getChildren()]);
  if (profile.pin_hash && children.length > 0) redirect("/profiles");

  return (
    <div className="screentone flex flex-1 flex-col items-center px-4 py-10">
      <Logo />
      <main className="panel mt-8 w-full max-w-lg p-6 sm:p-8">
        <h1 className="text-2xl">Set up your family</h1>
        <p className="mt-1">Two quick things: a grown-ups PIN, and your first reader.</p>
        <SetupForm />
      </main>
    </div>
  );
}

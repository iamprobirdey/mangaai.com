import { redirect } from "next/navigation";
import { Logo } from "@/components/ui";
import { getProfile, isParentUnlocked } from "@/lib/dal";
import { UnlockFooter, UnlockForm } from "./unlock-form";

export const metadata = { title: "Grown-ups only", robots: { index: false, follow: false } };

export default async function UnlockPage({ searchParams }: PageProps<"/parent/unlock">) {
  const { next } = await searchParams;
  const target = typeof next === "string" && (next.startsWith("/parent") || next.startsWith("/admin")) ? next : "/parent";
  const profile = await getProfile();
  if (!profile.pin_hash) redirect("/setup");
  if (await isParentUnlocked()) redirect(target);

  return (
    <div className="screentone flex flex-1 flex-col items-center px-4 py-10">
      <Logo href="/profiles" />
      <main className="panel mt-10 w-full max-w-sm p-6 text-center">
        <p className="text-4xl" aria-hidden>🔒</p>
        <h1 className="mt-2 text-2xl">Grown-ups only</h1>
        <p className="mt-1">Enter your 4-digit PIN.</p>
        <UnlockForm next={target} />
        <UnlockFooter />
      </main>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui";
import { getChildren, getProfile } from "@/lib/dal";
import { avatarEmoji } from "@/lib/constants";
import { selectChild } from "@/app/parent/actions";

export const metadata = { title: "Who's reading?" };

export default async function ProfilesPage() {
  const [profile, children] = await Promise.all([getProfile(), getChildren()]);
  if (!profile.pin_hash || children.length === 0) redirect("/setup");

  return (
    <div className="screentone flex flex-1 flex-col items-center px-4 py-10">
      <Logo href="/profiles" />
      <main className="mt-12 w-full max-w-3xl text-center">
        <div className="bubble mx-auto inline-block">
          <h1 className="text-3xl">Who&apos;s reading?</h1>
        </div>
        <ul className="mt-14 flex flex-wrap justify-center gap-6">
          {children.map((c) => (
            <li key={c.id}>
              <form action={selectChild.bind(null, c.id)}>
                <button type="submit" className="group flex w-32 flex-col items-center gap-3">
                  <span className="grid h-28 w-28 place-items-center rounded-full border-[3px] border-ink bg-paper text-6xl shadow-[4px_4px_0_var(--color-ink)] transition-transform group-hover:-translate-y-1 group-active:translate-y-0">
                    {avatarEmoji(c.avatar)}
                  </span>
                  <span className="font-display text-lg">{c.nickname}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
        <div className="mt-14 flex flex-wrap justify-center gap-3">
          <Link href="/parent" className="btn">
            <span aria-hidden>🔒</span> Grown-ups
          </Link>
          {profile.role === "admin" ? (
            <Link href="/admin" className="btn">Content studio</Link>
          ) : null}
        </div>
      </main>
    </div>
  );
}

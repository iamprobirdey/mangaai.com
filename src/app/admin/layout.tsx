import Link from "next/link";
import { Logo } from "@/components/ui";
import { requireAdmin, requireParentUnlocked } from "@/lib/dal";

export const metadata = { title: { default: "Content studio", template: "%s · Studio" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  await requireParentUnlocked("/admin");
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b-[3px] border-ink bg-paper">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo href="/admin" />
            <span className="tag">Studio</span>
          </div>
          <nav aria-label="Studio" className="flex flex-wrap gap-1">
            <Link href="/admin" className="rounded-full px-3 py-2 font-bold hover:bg-tone">Analytics</Link>
            <Link href="/admin/series" className="rounded-full px-3 py-2 font-bold hover:bg-tone">Series</Link>
            <Link href="/admin/families" className="rounded-full px-3 py-2 font-bold hover:bg-tone">Families</Link>
            <Link href="/profiles" className="rounded-full px-3 py-2 font-bold hover:bg-tone">Exit studio</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { PublicFooter, PublicHeader, PublicSite } from "@/components/public-chrome";
import { GUIDES } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Parent guides to manga",
  description: "Short, practical guides for parents: whether manga suits your child, how age ratings work, and how to read manga.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndex() {
  return (
    <PublicSite>
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 sm:px-6">
        <h1 className="text-3xl sm:text-4xl">Parent guides</h1>
        <ul className="mt-8 space-y-4">
          {GUIDES.map((g) => (
            <li key={g.slug} className="panel p-5">
              <h2 className="text-xl">
                <Link href={`/guides/${g.slug}`} className="underline decoration-sun decoration-4 underline-offset-4">{g.title}</Link>
              </h2>
              <p className="mt-2">{g.description}</p>
            </li>
          ))}
        </ul>
      </main>
      <PublicFooter />
    </PublicSite>
  );
}

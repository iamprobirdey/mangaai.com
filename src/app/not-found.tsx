import Link from "next/link";

export default function NotFound() {
  return (
    <main className="screentone flex flex-1 items-center justify-center px-4 py-16">
      <div className="panel max-w-md p-8 text-center">
        <p className="text-6xl" aria-hidden>🐙</p>
        <h1 className="mt-3 text-2xl">This page wandered off</h1>
        <p className="mt-2">It may have moved, or it isn&apos;t available for this reader.</p>
        <Link href="/profiles" className="btn btn-primary mt-6">Go to the bookshelf</Link>
      </div>
    </main>
  );
}

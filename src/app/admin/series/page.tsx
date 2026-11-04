import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AGE_BAND_LABELS } from "@/lib/constants";
import type { Series } from "@/lib/content";
import { ActionForm } from "../forms";
import { SeriesFields } from "../series-fields";
import { createSeries } from "../actions";

export const metadata = { title: "Series" };

export default async function AdminSeriesPage() {
  const supabase = await createClient();
  const [{ data: series }, { data: chapters }] = await Promise.all([
    supabase.from("series").select("*").order("updated_at", { ascending: false }),
    supabase.from("chapters").select("series_id,status"),
  ]);
  const counts = new Map<string, { total: number; review: number }>();
  for (const c of chapters ?? []) {
    const e = counts.get(c.series_id) ?? { total: 0, review: 0 };
    e.total++;
    if (c.status !== "approved") e.review++;
    counts.set(c.series_id, e);
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl">Series</h1>
        <div className="mt-4 overflow-x-auto rounded-lg border-[3px] border-ink bg-paper">
          <table className="w-full text-left">
            <thead className="border-b-2 border-ink bg-tone">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Age range</th>
                <th className="p-3">Status</th>
                <th className="p-3">Chapters</th>
                <th className="p-3">Waiting for review</th>
              </tr>
            </thead>
            <tbody>
              {((series ?? []) as Series[]).map((s) => {
                const c = counts.get(s.id) ?? { total: 0, review: 0 };
                return (
                  <tr key={s.id} className="border-b border-tone-deep last:border-0">
                    <td className="p-3 font-bold">
                      <Link className="underline" href={`/admin/series/${s.id}`}>{s.title}</Link>
                    </td>
                    <td className="p-3">{AGE_BAND_LABELS[s.age_band]}</td>
                    <td className="p-3"><span className="tag">{s.status}</span></td>
                    <td className="p-3">{c.total}</td>
                    <td className="p-3">{c.review || "—"}</td>
                  </tr>
                );
              })}
              {!series?.length ? (
                <tr>
                  <td className="p-4" colSpan={5}>No series yet. Create the first one below.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="text-xl">New series</h2>
        <p className="hint mb-4 mt-1">New series start as drafts. Readers see them once you publish.</p>
        <ActionForm action={createSeries} submit="Create series">
          <SeriesFields />
        </ActionForm>
      </section>
    </div>
  );
}

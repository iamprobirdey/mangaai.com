import { createClient } from "@/lib/supabase/server";
import { getChildren } from "@/lib/dal";
import { avatarEmoji, bandsUpTo } from "@/lib/constants";
import type { Series } from "@/lib/content";
import { AddReaderForm, EditReaderForm } from "./reader-forms";
import { deleteChild } from "../../actions";

export const metadata = { title: "Readers" };

export default async function ReadersPage() {
  const children = await getChildren();
  const supabase = await createClient();
  const [{ data: series }, { data: hidden }] = await Promise.all([
    supabase.from("series").select("id,title,age_band").eq("status", "published").order("title"),
    supabase.from("child_hidden_series").select("child_id,series_id").in("child_id", children.map((c) => c.id)),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl">Readers</h1>
        <p className="mt-1">Up to 5 reader profiles. Each one only sees stories for their age range.</p>
      </div>

      {children.map((c) => {
        const allowed = ((series ?? []) as Pick<Series, "id" | "title" | "age_band">[]).filter((s) =>
          bandsUpTo(c.age_band).includes(s.age_band),
        );
        const hiddenIds = (hidden ?? []).filter((h) => h.child_id === c.id).map((h) => h.series_id as string);
        return (
          <section key={c.id} className="panel p-5" aria-labelledby={`r-${c.id}`}>
            <h2 id={`r-${c.id}`} className="flex items-center gap-2 text-xl">
              <span aria-hidden>{avatarEmoji(c.avatar)}</span> {c.nickname}
            </h2>
            <EditReaderForm child={c} series={allowed} hiddenIds={hiddenIds} />
            <form action={deleteChild} className="mt-4 border-t-2 border-tone-deep pt-4">
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className="btn btn-danger">Delete {c.nickname}&apos;s profile and reading history</button>
            </form>
          </section>
        );
      })}

      {children.length < 5 ? (
        <section className="panel-flat p-5">
          <h2 className="text-xl">Add a reader</h2>
          <AddReaderForm />
        </section>
      ) : null}
    </div>
  );
}

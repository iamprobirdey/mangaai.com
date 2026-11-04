"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireChild } from "@/lib/dal";

export async function toggleShelf(seriesId: string, slug: string, onShelf: boolean) {
  const child = await requireChild();
  const supabase = await createClient();
  if (onShelf) {
    await supabase.from("shelf").delete().eq("child_id", child.id).eq("series_id", seriesId);
  } else {
    await supabase.from("shelf").upsert({ child_id: child.id, series_id: seriesId }, { onConflict: "child_id,series_id", ignoreDuplicates: true });
  }
  revalidatePath(`/read/series/${slug}`);
  revalidatePath("/read");
}

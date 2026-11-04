"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isParentUnlocked, requireAdmin } from "@/lib/dal";
import { AGE_BANDS, GENRES } from "@/lib/constants";
import type { FormState } from "@/components/forms";

async function guard() {
  const profile = await requireAdmin();
  if (!(await isParentUnlocked())) redirect("/parent/unlock?next=/admin");
  return profile;
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 80);

const seriesSchema = z.object({
  title: z.string().trim().min(1, "Add a title.").max(120),
  slug: z.string().trim().max(80).optional(),
  synopsis: z.string().trim().max(2000).default(""),
  age_band: z.enum(AGE_BANDS, { message: "Choose an age range. Every series needs one." }),
  genres: z.array(z.enum(GENRES)).default([]),
  reading_direction: z.enum(["rtl", "ltr", "vertical"]),
  is_ai_generated: z.boolean(),
});

function readSeries(formData: FormData) {
  return seriesSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug") || undefined,
    synopsis: formData.get("synopsis") ?? "",
    age_band: formData.get("age_band"),
    genres: formData.getAll("genres"),
    reading_direction: formData.get("reading_direction") ?? "ltr",
    is_ai_generated: formData.get("is_ai_generated") === "on",
  });
}

export async function createSeries(_: FormState, formData: FormData): Promise<FormState> {
  await guard();
  const parsed = readSeries(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { slug, ...rest } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("series")
    .insert({ ...rest, slug: slugify(slug || rest.title) })
    .select("id")
    .single();
  if (error) return { error: error.code === "23505" ? "A series with that web address already exists. Change the slug." : error.message };
  redirect(`/admin/series/${data.id}`);
}

export async function updateSeries(_: FormState, formData: FormData): Promise<FormState> {
  await guard();
  const id = String(formData.get("id"));
  const parsed = readSeries(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { slug, ...rest } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("series")
    .update({ ...rest, slug: slugify(slug || rest.title), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.code === "23505" ? "That slug is taken." : error.message };
  revalidatePath(`/admin/series/${id}`);
  return { ok: "Series saved." };
}

export async function setSeriesStatus(id: string, status: "draft" | "published" | "archived") {
  await guard();
  const supabase = await createClient();
  await supabase.from("series").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath(`/admin/series/${id}`);
  revalidatePath("/admin/series");
}

export async function setCover(id: string, path: string) {
  await guard();
  const supabase = await createClient();
  await supabase.from("series").update({ cover_path: path, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath(`/admin/series/${id}`);
}

/** Adds a volume (one book, one PDF) to a series, then opens it for the PDF upload. */
export async function addVolume(_: FormState, formData: FormData): Promise<FormState> {
  await guard();
  const seriesId = String(formData.get("series_id"));
  const number = Number(formData.get("number"));
  if (!Number.isInteger(number) || number < 1) return { error: "Volume number must be 1 or more." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chapters")
    .insert({ series_id: seriesId, number, title: String(formData.get("title") ?? "").trim() || null })
    .select("id")
    .single();
  if (error) return { error: error.code === "23505" ? "That volume number already exists." : error.message };
  redirect(`/admin/volumes/${data.id}`);
}

export async function updateVolumeDetails(_: FormState, formData: FormData): Promise<FormState> {
  await guard();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("chapters")
    .update({ title: String(formData.get("title") ?? "").trim() || null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/volumes/${id}`);
  return { ok: "Volume saved." };
}

const pageRow = z.object({
  page_number: z.number().int().positive(),
  image_path: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  image_path_sm: z.string().min(1).optional(),
  width_sm: z.number().int().positive().optional(),
  height_sm: z.number().int().positive().optional(),
});

/** Called by the uploader after every page image is in storage. Replaces the volume's pages and sends it back to review. */
export async function savePages(chapterId: string, rows: z.infer<typeof pageRow>[]) {
  await guard();
  const parsed = z.array(pageRow).min(1).safeParse(rows);
  if (!parsed.success) return { error: "No pages were uploaded." };
  if (!parsed.data.every((r) => [r.image_path, r.image_path_sm ?? r.image_path].every((p) => p.startsWith(`${chapterId}/`)))) {
    return { error: "Unexpected file path." };
  }

  const admin = createAdminClient();
  const { data: old } = await admin.from("pages").select("image_path,image_path_sm").eq("chapter_id", chapterId);
  await admin.from("pages").delete().eq("chapter_id", chapterId);
  const { error } = await admin.from("pages").insert(parsed.data.map((r) => ({ ...r, chapter_id: chapterId })));
  if (error) return { error: error.message };
  await admin
    .from("chapters")
    .update({ page_count: parsed.data.length, status: "in_review", reviewed_at: null, reviewed_by: null })
    .eq("id", chapterId);

  const newPaths = new Set(parsed.data.flatMap((r) => [r.image_path, r.image_path_sm]));
  const stale = (old ?? []).flatMap((o) => [o.image_path, o.image_path_sm]).filter((p): p is string => !!p && !newPaths.has(p));
  if (stale.length) await admin.storage.from("pages").remove(stale);
  revalidatePath(`/admin/volumes/${chapterId}`);
  return { ok: `${parsed.data.length} pages ready for review.` };
}

/** Approving publishes the volume straight away (no scheduled releases). */
export async function approveVolume(_: FormState, formData: FormData): Promise<FormState> {
  const profile = await guard();
  const id = String(formData.get("id"));
  if (formData.get("checked") !== "on") return { error: "Tick the box to confirm you've checked every page." };
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("chapters")
    .update({ reviewed_at: now, reviewed_by: profile.id, status: "approved", publish_at: now })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/volumes/${id}`);
  return { ok: "Approved and live now." };
}

export async function unpublishVolume(id: string) {
  await guard();
  const supabase = await createClient();
  await supabase.from("chapters").update({ status: "in_review", reviewed_at: null, reviewed_by: null }).eq("id", id);
  revalidatePath(`/admin/volumes/${id}`);
}

export async function deleteVolume(id: string, seriesId: string) {
  await guard();
  const admin = createAdminClient();
  const { data: pages } = await admin.from("pages").select("image_path,image_path_sm").eq("chapter_id", id);
  const files = (pages ?? []).flatMap((p) => [p.image_path, p.image_path_sm]).filter((p): p is string => !!p);
  if (files.length) await admin.storage.from("pages").remove(files);
  await admin.storage.from("originals").remove([`${id}.pdf`]);
  await admin.from("chapters").delete().eq("id", id);
  redirect(`/admin/series/${seriesId}`);
}

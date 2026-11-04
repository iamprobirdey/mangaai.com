import "server-only";
import { getAccess, getActiveChild, getUser } from "@/lib/dal";
import { PREVIEW_PAGES, readableChapter } from "@/lib/content";

/**
 * Everything the reader endpoints must check: signed in, a child selected, the volume visible.
 * Families without a trial or plan get `previewPages` set: only that many pages count.
 */
export async function resolveReader(chapterId: string) {
  const user = await getUser();
  if (!user) return { error: "unauthorized" as const, status: 401 };
  const child = await getActiveChild();
  if (!child) return { error: "no reader selected" as const, status: 403 };
  const found = await readableChapter(child, chapterId);
  if (!found) return { error: "not found" as const, status: 404 };
  const access = await getAccess(child.parent_id);
  const previewPages = access.active ? null : PREVIEW_PAGES;
  return { child, ...found, access, previewPages };
}

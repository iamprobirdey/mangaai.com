import "server-only";
import { getAccess, getActiveChild, getUser } from "@/lib/dal";
import { readableChapter } from "@/lib/content";

/** Everything the reader endpoints must check: signed in, a child selected, chapter visible, and paid or free. */
export async function resolveReader(chapterId: string) {
  const user = await getUser();
  if (!user) return { error: "unauthorized" as const, status: 401 };
  const child = await getActiveChild();
  if (!child) return { error: "no reader selected" as const, status: 403 };
  const found = await readableChapter(child, chapterId);
  if (!found) return { error: "not found" as const, status: 404 };
  const access = await getAccess(child.parent_id);
  if (!access.active && !found.chapter.is_free_preview) return { error: "subscription required" as const, status: 402 };
  return { child, ...found, access };
}

import { publicEnv } from "@/lib/env";

export function coverUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${publicEnv.supabaseUrl()}/storage/v1/object/public/covers/${path}`;
}

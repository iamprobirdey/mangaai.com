import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CHILD_COOKIE, UNLOCK_COOKIE } from "@/lib/dal";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const res = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  res.cookies.delete(CHILD_COOKIE);
  res.cookies.delete(UNLOCK_COOKIE);
  return res;
}

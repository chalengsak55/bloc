import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Handles the OAuth PKCE code exchange for Google (and any future OAuth providers).
// Magic links do NOT go through here — they redirect directly to emailRedirectTo.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — send back to auth with an error flag
  return NextResponse.redirect(`${origin}/auth?error=oauth_failed`);
}

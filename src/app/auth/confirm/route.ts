import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Link di accesso via email con token_hash (template email di Supabase, vedi README).
 * Funziona anche se il link viene aperto su un dispositivo o browser diverso da quello della richiesta.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "email") as EmailOtpType;
  const next = searchParams.get("next") ?? "/area-giocatore";
  if (token_hash) {
    const { error } = await createClient().auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/"}`);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}

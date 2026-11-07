import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Link di accesso con ?code= (flusso PKCE): valido solo nello stesso browser in cui è stato richiesto. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/area-giocatore";
  const supaError = searchParams.get("error_description") ?? searchParams.get("error");
  if (supaError) return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(supaError)}`);
  if (code) {
    const { error } = await createClient().auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/"}`);
    return NextResponse.redirect(`${origin}/login?error=pkce`);
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}

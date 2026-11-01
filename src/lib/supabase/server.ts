import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Client Supabase lato server (Server Components, Server Actions, Route Handlers). */
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // chiamato da un Server Component: il middleware aggiorna i cookie di sessione
        }
      },
    },
  });
}

import { createClient } from "@/lib/supabase/server";

export interface Viewer {
  userId: string | null;
  email: string | null;
  role: "admin" | "player" | null;
  playerId: string | null;
}

/** Utente corrente con ruolo (RBAC). */
export async function getViewer(): Promise<Viewer> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, email: null, role: null, playerId: null };
  const { data } = await supabase.from("profiles").select("role, player_id").eq("id", user.id).single();
  return {
    userId: user.id,
    email: user.email ?? null,
    role: (data?.role as Viewer["role"]) ?? "player",
    playerId: data?.player_id ?? null,
  };
}

/** Blocca le azioni riservate: da chiamare all'inizio di ogni Server Action admin. */
export async function requireAdmin(): Promise<Viewer> {
  const v = await getViewer();
  if (v.role !== "admin") throw new Error("Operazione riservata agli admin del torneo.");
  return v;
}

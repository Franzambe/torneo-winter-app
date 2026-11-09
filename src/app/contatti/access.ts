import { getViewer } from "@/lib/auth";

/** I contatti li vedono solo i partecipanti collegati a un iscritto e gli admin. */
export async function canSeeContacts() {
  const viewer = await getViewer();
  return { viewer, allowed: viewer.role === "admin" || viewer.playerId !== null };
}

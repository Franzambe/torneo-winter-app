import type { Player } from "./types";

export const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

/** Numero di gironi di Fase 1: gironi da 4, eventualmente da 3, mai da 5 (art. 2.1, A.1). */
export function f1GroupCount(nPlayers: number, maxSize = 4): number {
  if (nPlayers <= 0) return 0;
  return Math.min(8, Math.ceil(nPlayers / maxSize));
}

/**
 * Ordina i giocatori per punteggio di seeding (art. 2.2). A parità decide il sorteggio:
 * qui si usa `lot_f1` se impostato dall'admin, poi l'ordine alfabetico (stabile e verificabile).
 */
export function seedOrder(players: Player[]): Player[] {
  return [...players].sort(
    (a, b) =>
      (b.seed_score ?? 0) - (a.seed_score ?? 0) ||
      (b.lot_f1 ?? 0) - (a.lot_f1 ?? 0) ||
      a.full_name.localeCompare(b.full_name, "it"),
  );
}

/**
 * Distribuzione a serpentina (art. 2.2): 1° in A, 2° in B, 3° in C, 4° in D, 5° in D, 6° in C …
 * Restituisce la mappa giocatore → girone.
 */
export function snakeGroups(players: Player[], maxSize = 4): Record<string, string> {
  const active = seedOrder(players.filter((p) => p.status === "active"));
  const g = f1GroupCount(active.length, maxSize);
  const out: Record<string, string> = {};
  active.forEach((p, i) => {
    const row = Math.floor(i / g);
    const col = i % g;
    const idx = row % 2 === 0 ? col : g - 1 - col;
    out[p.id] = GROUP_LETTERS[idx];
  });
  return out;
}

/**
 * Composizione della Fase 2 per fasce di livello (art. 2.4, A.2):
 * metà alta della classifica unica di Fase 1 (arrotondata per eccesso) → girone A, il resto → girone B.
 * `overallOrder` = id dei giocatori attivi nell'ordine della classifica unica.
 */
export function composeF2(overallOrder: string[]): Record<string, "A" | "B"> {
  const nA = Math.ceil(overallOrder.length / 2);
  const out: Record<string, "A" | "B"> = {};
  overallOrder.forEach((id, i) => (out[id] = i < nA ? "A" : "B"));
  return out;
}

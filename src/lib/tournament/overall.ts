import type { Player, StandingRow } from "./types";

export interface OverallRow extends StandingRow {
  overall: number;
  avg_points: number;
  avg_diff: number;
  avg_for: number;
}

/**
 * Classifica unica di Fase 1 (art. 6.3): prima tutti i primi dei gironi, poi tutti i secondi…
 * A parità di posizione: media punti, media differenza game, media game vinti, sorteggio (lot_f1).
 * Le medie rendono equo il confronto tra gironi da 4 e da 3 (A.1).
 */
export function overallF1(groups: Record<string, StandingRow[]>, players: Player[]): OverallRow[] {
  const lot = new Map(players.map((p) => [p.id, p.lot_f1 ?? 0]));
  const rows: OverallRow[] = Object.values(groups)
    .flat()
    .map((r) => {
      const n = r.played || 1;
      return {
        ...r,
        overall: 0,
        avg_points: r.played ? r.points / n : 0,
        avg_diff: r.played ? r.games_diff / n : 0,
        avg_for: r.played ? r.games_for / n : 0,
      };
    });
  rows.sort(
    (a, b) =>
      a.position - b.position ||
      b.avg_points - a.avg_points ||
      b.avg_diff - a.avg_diff ||
      b.avg_for - a.avg_for ||
      (lot.get(b.player_id) ?? 0) - (lot.get(a.player_id) ?? 0) ||
      a.name.localeCompare(b.name, "it"),
  );
  return rows.map((r, i) => ({ ...r, overall: i + 1 }));
}

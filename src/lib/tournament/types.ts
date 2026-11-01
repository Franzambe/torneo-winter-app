/**
 * Modello dati del Torneo Winter (regolamento v4).
 * Le stesse forme sono usate dal database Supabase (snake_case) e dalla logica pura.
 */

export type Phase = "F1" | "F2" | "W" | "C"; // F1 gironi qualificazione, F2 gironi A/B, W Winners, C Challenger
export type PlayerStatus = "active" | "withdrawn" | "excluded";
export type MatchStatus = "scheduled" | "reported" | "confirmed";

/**
 * Esito di una partita:
 * - played: giocata (compreso il limite dei 60' e il ritiro in campo, art. 5.5 / 5.9)
 * - walkover_home / walkover_away: tavolino 9-0 a favore di casa / ospite (art. 8.1)
 * - double_walkover: tavolino per entrambi (gironi: 0-9 a ciascuno; tabellone: entrambi eliminati, art. 7.5)
 * - annulled: partita annullata (art. 8.3)
 */
export type ResultType = "played" | "walkover_home" | "walkover_away" | "double_walkover" | "annulled";

export interface Player {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  level: number | null; // livello dichiarato 1-5
  fitp_rank: string | null;
  seed_score: number | null; // punteggio di seeding (art. 2.2): più alto = più forte
  status: PlayerStatus;
  fee_paid: boolean;
  f1_group: string | null; // A..H
  f2_group: "A" | "B" | null;
  lot_f1: number | null; // sorteggio/ordine manuale per parità residue (più alto = meglio)
  lot_f2: number | null;
}

export interface SetScore {
  home: number;
  away: number;
}

export interface Match {
  id: string;
  phase: Phase;
  group_code: string | null; // girone (F1: A-H, F2: A/B); null nei tabelloni
  round: number; // giornata (gironi) o turno (tabelloni, 1 = primo turno)
  slot: number; // posizione nel turno (tabelloni) o progressivo (gironi)
  home_id: string | null; // "giocatore di casa" (art. 4.1)
  away_id: string | null;
  home_games: number | null; // partite a 9 game
  away_games: number | null;
  sets: SetScore[] | null; // semifinali e finali (art. 5.6)
  result_type: ResultType | null;
  status: MatchStatus;
  week_start: string | null; // ISO date
  week_end: string | null;
  notes: string | null;
}

export interface Settings {
  name: string;
  start_date: string; // lunedì di inizio Fase 1 (ISO)
  pause_weeks: number; // settimane di pausa natalizia
  f1_max_group_size: number; // 4 (art. 2.1 / A.1)
  recovery_weeks_f1: number;
  recovery_weeks_f2: number;
  winners_size: number; // 8
  promoted_from_b: number; // 2
  finals_day: string | null; // ISO
  registration_close: string | null;
  f1_groups_publication: string | null;
  f2_groups_publication: string | null;
  count_reported_results: boolean; // true: i risultati segnalati contano subito in classifica (art. 4.7)
  rules_summary: string;
}

export const DEFAULT_SETTINGS: Settings = {
  name: "1° Torneo Winter Alumni POLIMI GSoM",
  start_date: "2026-11-23",
  pause_weeks: 3,
  f1_max_group_size: 4,
  recovery_weeks_f1: 1,
  recovery_weeks_f2: 1,
  winners_size: 8,
  promoted_from_b: 2,
  finals_day: "2027-04-17",
  registration_close: "2026-11-08",
  f1_groups_publication: "2026-11-15",
  f2_groups_publication: "2027-01-03",
  count_reported_results: true,
  rules_summary: "",
};

export interface StandingRow {
  player_id: string;
  name: string;
  group: string;
  position: number;
  played: number;
  won: number;
  lost: number;
  points: number;
  games_for: number;
  games_against: number;
  games_diff: number;
  needs_draw: boolean; // parità risolta solo con il sorteggio (art. 6.2)
}

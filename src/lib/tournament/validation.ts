import type { SetScore } from "./types";

export interface ValidationResult {
  ok: boolean;
  error?: string;
  winner?: "home" | "away";
  /** 'time_limit' = chiusa allo scadere dei 60 minuti (art. 5.5) */
  kind?: "regular" | "time_limit" | "retired";
}

const isInt = (n: unknown) => Number.isInteger(n) && (n as number) >= 0;

/**
 * Set unico a 9 game (art. 5.2, 5.5, 5.9).
 * - regolare: 9-x con x ≤ 7, oppure 9-8 dopo il tie-break sull'8-8;
 * - limite di tempo: punteggio senza 9 game (es. 7-5, 7-6); mai in parità;
 * - ritiro: il non ritirato riceve 9 game, il ritirato conserva i suoi (≤ 8).
 */
export function validateNineGame(home: number, away: number, retired = false): ValidationResult {
  if (!isInt(home) || !isInt(away)) return { ok: false, error: "I game devono essere numeri interi ≥ 0." };
  if (home === away) return { ok: false, error: "La partita non può finire in parità (art. 5.5)." };
  const max = Math.max(home, away);
  const min = Math.min(home, away);
  const winner = home > away ? "home" : "away";
  if (max > 9) return { ok: false, error: "Il set si chiude a 9 game (art. 5.2)." };
  if (retired) {
    if (max !== 9) return { ok: false, error: "In caso di ritiro al vincitore vanno assegnati 9 game (art. 5.9)." };
    return { ok: true, winner, kind: "retired" };
  }
  if (max === 9) return min <= 8 ? { ok: true, winner, kind: "regular" } : { ok: false, error: "Punteggio non valido." };
  return { ok: true, winner, kind: "time_limit" };
}

function regularSet(s: SetScore): boolean {
  const w = Math.max(s.home, s.away);
  const l = Math.min(s.home, s.away);
  return (w === 6 && l <= 4) || (w === 7 && (l === 5 || l === 6));
}

function superTieBreak(s: SetScore): boolean {
  const w = Math.max(s.home, s.away);
  const l = Math.min(s.home, s.away);
  return w >= 10 && w - l >= 2 && (w === 10 || w - l === 2);
}

/** Semifinali e finali: 2 set su 3, terzo set = super tie-break a 10 (art. 5.6). */
export function validateBestOfThree(sets: SetScore[]): ValidationResult {
  if (sets.length < 2 || sets.length > 3) return { ok: false, error: "Servono 2 o 3 set." };
  if (sets.some((s) => !isInt(s.home) || !isInt(s.away) || s.home === s.away))
    return { ok: false, error: "Ogni set deve avere un vincitore." };
  let h = 0;
  let a = 0;
  for (let i = 0; i < sets.length; i++) {
    const s = sets[i];
    if (h === 2 || a === 2) return { ok: false, error: "La partita era già finita: troppi set." };
    if (i < 2 && !regularSet(s)) return { ok: false, error: `Set ${i + 1} non valido (6-x con x≤4, 7-5 o 7-6).` };
    if (i === 2 && !superTieBreak(s)) return { ok: false, error: "Il terzo set è un super tie-break a 10 con 2 punti di scarto." };
    if (s.home > s.away) h++;
    else a++;
  }
  if (h < 2 && a < 2) return { ok: false, error: "Nessuno ha vinto 2 set." };
  return { ok: true, winner: h > a ? "home" : "away", kind: "regular" };
}

/** Testo del risultato nel formato dell'art. 4.7: «Rossi b. Bianchi 9-6». */
export function resultLabel(winner: string, loser: string, score: string): string {
  return `${winner} b. ${loser} ${score}`;
}

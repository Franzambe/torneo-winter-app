/**
 * Calendario all'italiana con il metodo di Berger.
 * Con un numero dispari di giocatori si aggiunge un "riposo": ogni giornata un giocatore non gioca (A.1 / A.2).
 */
export interface Pairing {
  round: number; // 1-based
  home: string;
  away: string;
}

export function roundRobin(ids: string[]): Pairing[] {
  if (ids.length < 2) return [];
  const list: (string | null)[] = [...ids];
  if (list.length % 2 === 1) list.push(null); // riposo
  const n = list.length;
  const rounds = n - 1;
  const out: Pairing[] = [];
  let rot = [...list];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = rot[i];
      const b = rot[n - 1 - i];
      if (a === null || b === null) continue;
      // alterna il giocatore di casa per bilanciare prenotazioni e palline (art. 4.1)
      const swap = (r + i) % 2 === 1;
      out.push({ round: r + 1, home: swap ? b : a, away: swap ? a : b });
    }
    // rotazione: il primo resta fermo, gli altri ruotano in senso orario
    rot = [rot[0], rot[n - 1], ...rot.slice(1, n - 1)];
  }
  return out;
}

/** Numero di giornate di un girone di n giocatori (pari: n-1, dispari: n). */
export function roundsFor(n: number): number {
  if (n < 2) return 0;
  return n % 2 === 0 ? n - 1 : n;
}

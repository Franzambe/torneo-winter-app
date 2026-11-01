import type { Match, StandingRow } from "./types";

export const BYE = "BYE";

/** Ordine standard dei seed in un tabellone di `size` posti: per 8 → [1,8,4,5,2,7,3,6]. */
export function standardSeedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const m = order.length * 2;
    order = order.flatMap((s) => [s, m + 1 - s]);
  }
  return order.slice(0, size);
}

export function bracketSize(entrants: number): number {
  if (entrants < 2) return entrants;
  return 2 ** Math.ceil(Math.log2(entrants));
}

export function roundName(remaining: number): string {
  return ["Finale", "Semifinali", "Quarti", "Ottavi", "Sedicesimi"][remaining - 1] ?? `Turno (${remaining})`;
}

/**
 * Seed dei tabelloni (art. 7, A.3, A.4).
 * Winners: A1…A(qa) = seed 1…qa, poi B1…B(p). Challenger: retrocessi da A in ordine, poi B dal (p+1)° in giù.
 * Restituisce array di player_id indicizzato per seed (indice 0 = seed 1).
 */
export function bracketSeeds(
  groupA: StandingRow[],
  groupB: StandingRow[],
  winnersSize: number,
  promotedFromB: number,
): { winners: string[]; challenger: string[] } {
  const qa = winnersSize - promotedFromB;
  const winners = [...groupA.slice(0, qa), ...groupB.slice(0, promotedFromB)].map((r) => r.player_id);
  const challenger = [...groupA.slice(qa), ...groupB.slice(promotedFromB)].map((r) => r.player_id);
  return { winners, challenger };
}

export interface BracketMatch {
  round: number; // 1 = primo turno
  slot: number; // 1-based
  remaining: number; // turni mancanti alla fine (1 = finale)
  home: string | null; // id, BYE o null (da definire)
  away: string | null;
  homeSeed: number | null;
  awaySeed: number | null;
  winner: string | null; // id, BYE (nessuno avanza) o null (da giocare)
  match?: Match;
}

/**
 * Costruisce l'intero tabellone a partire dai seed e dai risultati registrati.
 * - BYE contro giocatore: avanza il giocatore (art. 7.3)
 * - doppio tavolino: nessuno avanza, l'avversario del turno dopo passa senza giocare (art. 7.5)
 */
export function buildBracket(seeds: string[], results: Match[]): BracketMatch[][] {
  const size = bracketSize(seeds.length);
  if (size < 2) return [];
  const rounds = Math.log2(size);
  const order = standardSeedOrder(size);
  const seedOf = new Map(seeds.map((id, i) => [id, i + 1]));
  const resultAt = new Map(results.map((m) => [`${m.round}-${m.slot}`, m]));
  const out: BracketMatch[][] = [];

  for (let r = 1; r <= rounds; r++) {
    const count = size / 2 ** r;
    const list: BracketMatch[] = [];
    for (let s = 1; s <= count; s++) {
      let home: string | null;
      let away: string | null;
      if (r === 1) {
        const sh = order[2 * s - 2];
        const sa = order[2 * s - 1];
        home = seeds[sh - 1] ?? BYE;
        away = seeds[sa - 1] ?? BYE;
      } else {
        home = out[r - 2][2 * s - 2].winner;
        away = out[r - 2][2 * s - 1].winner;
      }
      const m = resultAt.get(`${r}-${s}`);
      list.push({
        round: r,
        slot: s,
        remaining: rounds - r + 1,
        home,
        away,
        homeSeed: home && home !== BYE ? seedOf.get(home) ?? null : null,
        awaySeed: away && away !== BYE ? seedOf.get(away) ?? null : null,
        winner: decideWinner(home, away, m),
        match: m,
      });
    }
    out.push(list);
  }
  return out;
}

function decideWinner(home: string | null, away: string | null, m: Match | undefined): string | null {
  if (home === null || away === null) return null; // turno precedente non concluso
  if (home === BYE && away === BYE) return BYE;
  if (away === BYE) return home;
  if (home === BYE) return away;
  if (!m || !m.result_type || m.status === "scheduled") return null;
  switch (m.result_type) {
    case "walkover_home":
      return home;
    case "walkover_away":
      return away;
    case "double_walkover":
    case "annulled":
      return BYE;
    case "played": {
      if (m.sets && m.sets.length) {
        let h = 0;
        let a = 0;
        m.sets.forEach((s) => (s.home > s.away ? h++ : a++));
        return h > a ? home : a > h ? away : null;
      }
      const hg = m.home_games ?? 0;
      const ag = m.away_games ?? 0;
      return hg > ag ? home : ag > hg ? away : null;
    }
  }
  return null;
}

/** Il giocatore con il seed migliore porta le palline nel tabellone (art. 4.6). */
export function ballsProvider(bm: BracketMatch): string | null {
  if (!bm.home || !bm.away || bm.home === BYE || bm.away === BYE) return null;
  return (bm.homeSeed ?? 99) <= (bm.awaySeed ?? 99) ? bm.home : bm.away;
}

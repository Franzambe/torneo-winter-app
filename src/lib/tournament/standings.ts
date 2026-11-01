import type { Match, Player, StandingRow } from "./types";

/** Game assegnati con la vittoria a tavolino (art. 8.1). */
export const WALKOVER_GAMES = 9;

interface Outcome {
  home: string;
  away: string;
  homeGames: number;
  awayGames: number;
  winner: string | null; // null = nessun vincitore (doppio tavolino)
}

export interface StandingsOptions {
  /** true: contano anche i risultati segnalati e non ancora confermati (art. 4.7). */
  countReported: boolean;
  /** campo del sorteggio manuale da usare per le parità residue */
  lotField: "lot_f1" | "lot_f2";
}

/** Una partita "conta" se ha un risultato valido e non è annullata. */
export function hasResult(m: Match, countReported: boolean): boolean {
  if (!m.home_id || !m.away_id || !m.result_type || m.result_type === "annulled") return false;
  if (m.status === "confirmed") return true;
  return countReported && m.status === "reported";
}

export function outcomeOf(m: Match): Outcome | null {
  if (!m.home_id || !m.away_id || !m.result_type) return null;
  const base = { home: m.home_id, away: m.away_id };
  switch (m.result_type) {
    case "walkover_home":
      return { ...base, homeGames: WALKOVER_GAMES, awayGames: 0, winner: m.home_id };
    case "walkover_away":
      return { ...base, homeGames: 0, awayGames: WALKOVER_GAMES, winner: m.away_id };
    case "double_walkover":
      // gironi: sconfitta 0-9 per entrambi (art. 8.1)
      return { ...base, homeGames: 0, awayGames: 0, winner: null };
    case "played": {
      const h = m.home_games ?? 0;
      const a = m.away_games ?? 0;
      if (h === a) return null;
      return { ...base, homeGames: h, awayGames: a, winner: h > a ? m.home_id : m.away_id };
    }
    default:
      return null;
  }
}

/** Game subiti, tenendo conto del doppio tavolino (0-9 a ciascuno). */
function againstOf(o: Outcome, m: Match, side: "home" | "away"): number {
  if (m.result_type === "double_walkover") return WALKOVER_GAMES;
  return side === "home" ? o.awayGames : o.homeGames;
}

/**
 * Applica l'art. 8.3 ai giocatori ritirati o esclusi:
 * - meno della metà delle partite del girone giocate → tutte le sue partite annullate;
 * - almeno la metà → le giocate restano valide, le restanti diventano 9-0 per gli avversari.
 * Restituisce le partite "effettive" da usare per la classifica.
 */
export function applyWithdrawals(groupPlayers: Player[], matches: Match[], countReported: boolean): Match[] {
  let effective = [...matches];
  const inactive = groupPlayers.filter((p) => p.status !== "active");
  for (const p of inactive) {
    const mine = effective.filter((m) => m.home_id === p.id || m.away_id === p.id);
    const total = groupPlayers.length - 1;
    const played = mine.filter((m) => hasResult(m, countReported)).length;
    if (played * 2 < total) {
      const ids = new Set(mine.map((m) => m.id));
      effective = effective.filter((m) => !ids.has(m.id));
    } else {
      effective = effective.map((m) => {
        if (!(m.home_id === p.id || m.away_id === p.id) || hasResult(m, countReported)) return m;
        return {
          ...m,
          status: "confirmed",
          result_type: m.home_id === p.id ? "walkover_away" : "walkover_home",
        } as Match;
      });
    }
  }
  return effective;
}

interface Acc {
  played: number;
  won: number;
  points: number;
  gf: number;
  ga: number;
}

function accumulate(ids: Set<string>, matches: Match[]): Map<string, Acc> {
  const acc = new Map<string, Acc>();
  ids.forEach((id) => acc.set(id, { played: 0, won: 0, points: 0, gf: 0, ga: 0 }));
  for (const m of matches) {
    const o = outcomeOf(m);
    if (!o) continue;
    for (const side of ["home", "away"] as const) {
      const id = side === "home" ? o.home : o.away;
      const a = acc.get(id);
      if (!a) continue;
      a.played += 1;
      a.gf += side === "home" ? o.homeGames : o.awayGames;
      a.ga += againstOf(o, m, side);
      if (o.winner === id) {
        a.won += 1;
        a.points += 1;
      }
    }
  }
  return acc;
}

/**
 * Classifica di un girone secondo l'art. 6.1–6.2.
 * `groupPlayers`: tutti i giocatori del girone (anche ritirati); `matches`: tutte le partite del girone.
 */
export function computeGroupStandings(
  group: string,
  groupPlayers: Player[],
  matches: Match[],
  opts: StandingsOptions,
): StandingRow[] {
  const effective = applyWithdrawals(groupPlayers, matches, opts.countReported).filter((m) =>
    hasResult(m, opts.countReported),
  );
  const active = groupPlayers.filter((p) => p.status === "active");
  const ids = new Set(active.map((p) => p.id));
  // le partite contro giocatori ritirati restano (art. 8.3), ma i ritirati non compaiono in classifica (art. 6.4)
  const total = accumulate(ids, effective);
  const byId = new Map(active.map((p) => [p.id, p]));
  const drawFlags = new Set<string>();

  const stat = (id: string) => total.get(id)!;
  const diff = (id: string) => stat(id).gf - stat(id).ga;
  const lot = (id: string) => byId.get(id)?.[opts.lotField] ?? 0;

  /** criteri generali: differenza game, game vinti, game persi, sorteggio */
  function generalCriteria(tied: string[]): string[] {
    const sorted = [...tied].sort(
      (a, b) =>
        diff(b) - diff(a) ||
        stat(b).gf - stat(a).gf ||
        stat(a).ga - stat(b).ga ||
        lot(b) - lot(a) ||
        byId.get(a)!.full_name.localeCompare(byId.get(b)!.full_name, "it"),
    );
    // segnala chi è separato solo dal sorteggio
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (diff(a) === diff(b) && stat(a).gf === stat(b).gf && stat(a).ga === stat(b).ga && lot(a) === lot(b)) {
        drawFlags.add(a);
        drawFlags.add(b);
      }
    }
    return sorted;
  }

  function headToHead(a: string, b: string): number {
    let winsA = 0;
    let winsB = 0;
    for (const m of effective) {
      const pair = new Set([m.home_id, m.away_id]);
      if (!pair.has(a) || !pair.has(b)) continue;
      const o = outcomeOf(m);
      if (o?.winner === a) winsA++;
      if (o?.winner === b) winsB++;
    }
    return winsA - winsB;
  }

  /** art. 6.2: scontro diretto (2) o classifica avulsa (3+), con ripartenza sui sottogruppi */
  function resolve(tied: string[]): string[] {
    if (tied.length <= 1) return tied;
    if (tied.length === 2) {
      const h = headToHead(tied[0], tied[1]);
      if (h > 0) return [tied[0], tied[1]];
      if (h < 0) return [tied[1], tied[0]];
      return generalCriteria(tied);
    }
    const set = new Set(tied);
    const mini = accumulate(
      set,
      effective.filter((m) => set.has(m.home_id ?? "") && set.has(m.away_id ?? "")),
    );
    const key = (id: string) => [mini.get(id)!.won, mini.get(id)!.gf - mini.get(id)!.ga] as const;
    const buckets = new Map<string, string[]>();
    for (const id of tied) {
      const k = key(id).join("|");
      buckets.set(k, [...(buckets.get(k) ?? []), id]);
    }
    if (buckets.size === 1) return generalCriteria(tied);
    const ordered = [...buckets.values()].sort((x, y) => {
      const [wx, dx] = key(x[0]);
      const [wy, dy] = key(y[0]);
      return wy - wx || dy - dx;
    });
    return ordered.flatMap((b) => resolve(b));
  }

  // raggruppa per punti e risolve le parità
  const byPoints = new Map<number, string[]>();
  for (const id of ids) {
    const pts = stat(id).points;
    byPoints.set(pts, [...(byPoints.get(pts) ?? []), id]);
  }
  const order = [...byPoints.keys()].sort((a, b) => b - a).flatMap((pts) => resolve(byPoints.get(pts)!));

  return order.map((id, i) => {
    const s = stat(id);
    return {
      player_id: id,
      name: byId.get(id)!.full_name,
      group,
      position: i + 1,
      played: s.played,
      won: s.won,
      lost: s.played - s.won,
      points: s.points,
      games_for: s.gf,
      games_against: s.ga,
      games_diff: s.gf - s.ga,
      needs_draw: drawFlags.has(id),
    };
  });
}

/** Classifiche di tutti i gironi di una fase. */
export function computePhaseStandings(
  players: Player[],
  matches: Match[],
  phase: "F1" | "F2",
  countReported: boolean,
): Record<string, StandingRow[]> {
  const field = phase === "F1" ? "f1_group" : "f2_group";
  const groups = [...new Set(players.map((p) => p[field]).filter(Boolean) as string[])].sort();
  const out: Record<string, StandingRow[]> = {};
  for (const g of groups) {
    out[g] = computeGroupStandings(
      g,
      players.filter((p) => p[field] === g),
      matches.filter((m) => m.phase === phase && m.group_code === g),
      { countReported, lotField: phase === "F1" ? "lot_f1" : "lot_f2" },
    );
  }
  return out;
}

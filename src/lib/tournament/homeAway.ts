/**
 * Bilanciamento casa/trasferta dei gironi all'italiana (art. 4.1, 4.6).
 *
 * Il giocatore di casa prenota il campo e porta le palline, quindi nessuno deve essere penalizzato.
 * Regole applicate, in ordine di priorità:
 *  1. mai più di `maxStreak` partite di fila (default 2) in casa o in trasferta;
 *  2. in ogni fase, partite in casa = metà delle partite (arrotondata per difetto o per eccesso);
 *  3. compensazione tra fasi: chi ha giocato più in casa nelle fasi precedenti ne gioca meno ora,
 *     così a fine torneo tutti sono il più vicino possibile al 50%;
 *  4. a parità, decide il sorteggio (`draw`: più alto = gioca la partita in casa in più);
 *  5. il minor numero possibile di "doppie" (due partite di fila uguali).
 *
 * Gli accoppiamenti e le giornate non cambiano: si sceglie solo chi è in casa.
 */
import type { Pairing } from "./roundRobin";
import { roundRobin } from "./roundRobin";

export interface HomeAwayOptions {
  /** Partite in casa già giocate (o in calendario) nelle fasi precedenti. */
  priorHome?: Record<string, number>;
  /** Partite totali delle fasi precedenti. */
  priorGames?: Record<string, number>;
  /** Esito del sorteggio: più alto = riceve la partita in casa in più quando serve decidere. */
  draw?: Record<string, number>;
  /** Massimo di partite consecutive in casa o in trasferta (default 2). */
  maxStreak?: number;
}

export interface HomeAwayStats {
  home: number;
  games: number;
  sequence: string; // es. "CTC" (C = casa, T = trasferta), in ordine di giornata
  maxStreak: number;
  breaks: number; // numero di "doppie"
}

/** Quante partite in casa deve giocare ognuno in questa fase. */
export function homeTargets(pairings: Pairing[], opts: HomeAwayOptions = {}): Record<string, number> {
  const games: Record<string, number> = {};
  for (const p of pairings) {
    games[p.home] = (games[p.home] ?? 0) + 1;
    games[p.away] = (games[p.away] ?? 0) + 1;
  }
  const ids = Object.keys(games);
  const prH = (id: string) => opts.priorHome?.[id] ?? 0;
  const prG = (id: string) => opts.priorGames?.[id] ?? 0;
  const draw = (id: string) => opts.draw?.[id] ?? 0;

  // partenza: il minimo consentito (metà per difetto)
  const target: Record<string, number> = {};
  for (const id of ids) target[id] = Math.floor(games[id] / 2);
  let missing = pairings.length - ids.reduce((s, id) => s + target[id], 0);

  // chi può ricevere una partita in casa in più (solo chi ha un numero dispari di partite)
  const candidates = ids.filter((id) => games[id] % 2 === 1);
  // priorità: chi è più "in debito" di partite in casa sull'intero torneo, poi il sorteggio
  const debt = (id: string) => (prG(id) + games[id]) / 2 - (prH(id) + target[id]);
  candidates.sort((a, b) => debt(b) - debt(a) || draw(b) - draw(a) || a.localeCompare(b));
  for (const id of candidates) {
    if (missing <= 0) break;
    target[id] += 1;
    missing -= 1;
  }
  return target;
}

/**
 * Sceglie chi gioca in casa in ogni partita rispettando le regole sopra.
 * Ricerca esaustiva con potatura: per gironi fino a 9–10 giocatori è istantanea.
 */
export function balanceHomeAway(pairings: Pairing[], opts: HomeAwayOptions = {}): Pairing[] {
  if (pairings.length === 0) return [];
  const maxStreak = opts.maxStreak ?? 2;
  const ordered = [...pairings].sort((a, b) => a.round - b.round);
  const target = homeTargets(ordered, opts);
  const ids = Object.keys(target);

  // partite rimaste per giocatore dopo ogni indice (per la potatura)
  const remaining: Record<string, number>[] = [];
  const acc: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  for (let i = ordered.length - 1; i >= 0; i--) {
    remaining[i] = { ...acc };
    acc[ordered[i].home] += 1;
    acc[ordered[i].away] += 1;
  }

  const home: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  const played: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  const last: Record<string, "C" | "T" | null> = Object.fromEntries(ids.map((id) => [id, null]));
  const run: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  const choice: boolean[] = new Array(ordered.length).fill(false); // true = invertire
  let best: boolean[] | null = null;
  let bestBreaks = Infinity;
  let breaks = 0;
  let nodes = 0;
  const NODE_LIMIT = 2_000_000;

  const push = (id: string, s: "C" | "T") => {
    const prev = { last: last[id], run: run[id] };
    const isBreak = last[id] === s;
    run[id] = isBreak ? run[id] + 1 : 1;
    last[id] = s;
    played[id] += 1;
    if (s === "C") home[id] += 1;
    if (isBreak) breaks += 1;
    return () => {
      if (isBreak) breaks -= 1;
      if (s === "C") home[id] -= 1;
      played[id] -= 1;
      last[id] = prev.last;
      run[id] = prev.run;
    };
  };

  const ok = (id: string, idx: number) => {
    if (run[id] > maxStreak) return false;
    const left = remaining[idx][id];
    const needHome = target[id] - home[id];
    // deve restare possibile raggiungere esattamente il target
    return needHome >= 0 && needHome <= left;
  };

  const dfs = (idx: number) => {
    if (++nodes > NODE_LIMIT) return;
    if (breaks >= bestBreaks) return;
    if (idx === ordered.length) {
      best = [...choice];
      bestBreaks = breaks;
      return;
    }
    const m = ordered[idx];
    // prova prima l'orientamento che non crea doppie
    const options = [false, true].sort((x, y) => cost(m, x) - cost(m, y));
    for (const flip of options) {
      const h = flip ? m.away : m.home;
      const a = flip ? m.home : m.away;
      const undoH = push(h, "C");
      const undoA = push(a, "T");
      if (ok(h, idx) && ok(a, idx)) {
        choice[idx] = flip;
        dfs(idx + 1);
      }
      undoA();
      undoH();
      if (bestBreaks === 0) return;
    }
  };
  const cost = (m: Pairing, flip: boolean) => {
    const h = flip ? m.away : m.home;
    const a = flip ? m.home : m.away;
    return (last[h] === "C" ? 1 : 0) + (last[a] === "T" ? 1 : 0);
  };

  dfs(0);
  if (!best) {
    // non dovrebbe mai accadere; per sicurezza si allenta il vincolo sulle serie
    if (maxStreak < 4) return balanceHomeAway(pairings, { ...opts, maxStreak: maxStreak + 1 });
    return ordered;
  }
  const chosen: boolean[] = best;
  return ordered.map((m, i) => (chosen[i] ? { round: m.round, home: m.away, away: m.home } : m));
}

/** Girone all'italiana (Berger) con casa/trasferta bilanciate. */
export function scheduleRoundRobin(ids: string[], opts: HomeAwayOptions = {}): Pairing[] {
  return balanceHomeAway(roundRobin(ids), opts);
}

/** Statistiche casa/trasferta per giocatore (per verifiche e test). */
export function homeAwayStats(pairings: Pairing[]): Record<string, HomeAwayStats> {
  const seq: Record<string, string> = {};
  for (const p of [...pairings].sort((a, b) => a.round - b.round)) {
    seq[p.home] = (seq[p.home] ?? "") + "C";
    seq[p.away] = (seq[p.away] ?? "") + "T";
  }
  const out: Record<string, HomeAwayStats> = {};
  for (const [id, s] of Object.entries(seq)) {
    const runs = s.match(/C+|T+/g) ?? [];
    out[id] = {
      home: (s.match(/C/g) ?? []).length,
      games: s.length,
      sequence: s,
      maxStreak: Math.max(0, ...runs.map((r) => r.length)),
      breaks: runs.reduce((n, r) => n + r.length - 1, 0),
    };
  }
  return out;
}

/** Conta le partite in casa e totali di ogni giocatore in un insieme di partite (es. la Fase 1). */
export function homeCounts(matches: { home_id: string | null; away_id: string | null; result_type?: string | null }[]) {
  const priorHome: Record<string, number> = {};
  const priorGames: Record<string, number> = {};
  for (const m of matches) {
    if (!m.home_id || !m.away_id || m.result_type === "annulled") continue;
    priorHome[m.home_id] = (priorHome[m.home_id] ?? 0) + 1;
    priorGames[m.home_id] = (priorGames[m.home_id] ?? 0) + 1;
    priorGames[m.away_id] = (priorGames[m.away_id] ?? 0) + 1;
  }
  return { priorHome, priorGames };
}

import { describe, expect, it } from "vitest";
import {
  BYE,
  DEFAULT_SETTINGS,
  bracketSeeds,
  buildBracket,
  buildSchedule,
  composeF2,
  computeGroupStandings,
  overallF1,
  roundRobin,
  scheduleInputFor,
  snakeGroups,
  standardSeedOrder,
  validateBestOfThree,
  validateNineGame,
  weekForBracketRound,
  weekForGroupRound,
  type Match,
  type Player,
  type StandingRow,
} from "../index";

const player = (id: string, extra: Partial<Player> = {}): Player => ({
  id,
  full_name: id,
  email: null,
  phone: null,
  level: null,
  fitp_rank: null,
  seed_score: null,
  status: "active",
  fee_paid: true,
  f1_group: "A",
  f2_group: null,
  lot_f1: null,
  lot_f2: null,
  ...extra,
});

let mid = 0;
const match = (home: string, away: string, h: number | null, a: number | null, extra: Partial<Match> = {}): Match => ({
  id: `m${++mid}`,
  phase: "F1",
  group_code: "A",
  round: 1,
  slot: mid,
  home_id: home,
  away_id: away,
  home_games: h,
  away_games: a,
  sets: null,
  result_type: h === null ? null : "played",
  status: h === null ? "scheduled" : "confirmed",
  week_start: null,
  week_end: null,
  notes: null,
  ...extra,
});

const opts = { countReported: true, lotField: "lot_f1" as const };
const order = (rows: StandingRow[]) => rows.map((r) => r.player_id);

describe("girone all'italiana", () => {
  it("4 giocatori: 3 giornate, ogni coppia una volta, una partita a testa per giornata", () => {
    const p = roundRobin(["a", "b", "c", "d"]);
    expect(p).toHaveLength(6);
    expect(new Set(p.map((x) => x.round)).size).toBe(3);
    const keys = new Set(p.map((x) => [x.home, x.away].sort().join("-")));
    expect(keys.size).toBe(6);
    for (const r of [1, 2, 3]) {
      const ids = p.filter((x) => x.round === r).flatMap((x) => [x.home, x.away]);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
  it("girone dispari: 3 giocatori in 3 giornate con un riposo", () => {
    const p = roundRobin(["a", "b", "c"]);
    expect(p).toHaveLength(3);
    expect(Math.max(...p.map((x) => x.round))).toBe(3);
  });
});

describe("composizione gironi (art. 2.2, 2.4, A.1)", () => {
  it("16 giocatori: 4 gironi da 4 a serpentina", () => {
    const players = Array.from({ length: 16 }, (_, i) => player(`p${i + 1}`, { seed_score: 100 - i }));
    const g = snakeGroups(players);
    expect([g.p1, g.p2, g.p3, g.p4, g.p5, g.p6, g.p7, g.p8]).toEqual(["A", "B", "C", "D", "D", "C", "B", "A"]);
    const sizes = Object.values(g).reduce<Record<string, number>>((acc, x) => ({ ...acc, [x]: (acc[x] ?? 0) + 1 }), {});
    expect(sizes).toEqual({ A: 4, B: 4, C: 4, D: 4 });
  });
  it("15 giocatori: 3 gironi da 4 e 1 da 3 (mai da 5)", () => {
    const players = Array.from({ length: 15 }, (_, i) => player(`p${i + 1}`, { seed_score: 100 - i }));
    const sizes = Object.values(snakeGroups(players)).reduce<Record<string, number>>(
      (acc, x) => ({ ...acc, [x]: (acc[x] ?? 0) + 1 }),
      {},
    );
    expect(Object.values(sizes).sort()).toEqual([3, 4, 4, 4]);
  });
  it("Fase 2: metà alta in A (arrotondata per eccesso)", () => {
    const f2 = composeF2(Array.from({ length: 15 }, (_, i) => `p${i + 1}`));
    expect(Object.values(f2).filter((x) => x === "A")).toHaveLength(8);
    expect(f2.p8).toBe("A");
    expect(f2.p9).toBe("B");
  });
});

describe("classifica girone (art. 6.1–6.2)", () => {
  const P = ["a", "b", "c", "d"].map((id) => player(id));

  it("punti, game e scontro diretto tra 2", () => {
    const m = [
      match("a", "b", 9, 7),
      match("c", "d", 9, 2),
      match("a", "c", 3, 9),
      match("b", "d", 9, 0),
      match("a", "d", 9, 1),
      match("b", "c", 9, 8),
    ];
    // a, b, c a 2 punti; d 0
    const rows = computeGroupStandings("A", P, m, opts);
    expect(rows.find((r) => r.player_id === "d")!.position).toBe(4);
    expect(rows.find((r) => r.player_id === "a")!.points).toBe(2);
  });

  it("parità a 3: classifica avulsa, poi si riparte dallo scontro diretto sul residuo", () => {
    // a b c tutti 2 punti (ciclo a>b, b>c, c>a) e tutti battono d
    const m = [
      match("a", "b", 9, 5), // a +4
      match("b", "c", 9, 5), // b +4
      match("c", "a", 9, 1), // c +8
      match("a", "d", 9, 0),
      match("b", "d", 9, 0),
      match("c", "d", 9, 0),
    ];
    // avulsa: vittorie 1-1-1; diff negli scontri diretti: a +4-8=-4, b +4-4=0, c +8-4=+4 → c, b, a
    expect(order(computeGroupStandings("A", P, m, opts))).toEqual(["c", "b", "a", "d"]);
  });

  it("avulsa che separa solo uno: per i due rimasti decide lo scontro diretto", () => {
    const m = [
      match("a", "b", 9, 7), // a +2
      match("b", "c", 9, 7), // b +2
      match("c", "a", 9, 1), // c +8
      match("a", "d", 9, 0),
      match("b", "d", 9, 0),
      match("c", "d", 9, 0),
    ];
    // diff avulsa: a +2-8=-6, b +2-2=0, c +8-2=+6 → separa tutti
    expect(order(computeGroupStandings("A", P, m, opts))).toEqual(["c", "b", "a", "d"]);
    const m2 = [
      match("a", "b", 9, 5), // a +4
      match("b", "c", 9, 5), // b +4
      match("c", "a", 9, 5), // c +4 → avulsa tutti pari a 0
      match("a", "d", 9, 0),
      match("b", "d", 9, 1),
      match("c", "d", 9, 2),
    ];
    // criteri generali: diff totale a +13, b +12, c +11
    expect(order(computeGroupStandings("A", P, m2, opts))).toEqual(["a", "b", "c", "d"]);
  });

  it("parità assoluta segnalata per il sorteggio; il lot dell'admin la risolve", () => {
    const two = [player("x"), player("y")];
    const m = [match("x", "y", null, null, { result_type: "double_walkover", status: "confirmed" })];
    const rows = computeGroupStandings("A", two, m, opts);
    expect(rows.every((r) => r.needs_draw)).toBe(true);
    expect(rows[0].games_against).toBe(9);
    const rows2 = computeGroupStandings("A", [player("x"), player("y", { lot_f1: 1 })], m, opts);
    expect(order(rows2)).toEqual(["y", "x"]);
    expect(rows2.some((r) => r.needs_draw)).toBe(false);
  });

  it("tavolino 9-0 e risultati segnalati (art. 4.7)", () => {
    const m = [
      match("a", "b", null, null, { result_type: "walkover_away", status: "confirmed" }),
      match("c", "d", 9, 4, { status: "reported" }),
    ];
    const rows = computeGroupStandings("A", P, m, opts);
    expect(rows.find((r) => r.player_id === "b")!.games_for).toBe(9);
    expect(rows.find((r) => r.player_id === "c")!.points).toBe(1);
    const notCounted = computeGroupStandings("A", P, m, { ...opts, countReported: false });
    expect(notCounted.find((r) => r.player_id === "c")!.points).toBe(0);
  });

  it("ritiro (art. 8.3): sotto metà partite annullate, da metà in su 9-0 agli avversari", () => {
    const early = [player("a"), player("b"), player("c"), player("d", { status: "withdrawn" })];
    const m = [
      match("a", "d", 2, 9), // d ha giocato 1 partita su 3 → annullate
      match("b", "d", null, null),
      match("c", "d", null, null),
    ];
    const r1 = computeGroupStandings("A", early, m, opts);
    expect(r1.map((r) => r.player_id)).not.toContain("d");
    expect(r1.find((r) => r.player_id === "a")!.played).toBe(0);

    const m2 = [match("a", "d", 2, 9), match("b", "d", 9, 3), match("c", "d", null, null)];
    const r2 = computeGroupStandings("A", early, m2, opts);
    const c = r2.find((r) => r.player_id === "c")!;
    expect([c.points, c.games_for, c.games_against]).toEqual([1, 9, 0]);
    expect(r2.find((r) => r.player_id === "a")!.points).toBe(0);
  });
});

describe("classifica unica di Fase 1 (art. 6.3)", () => {
  it("prima per posizione, poi per media punti/diff (gironi da 3 e da 4)", () => {
    const row = (id: string, group: string, position: number, played: number, points: number, diff: number): StandingRow => ({
      player_id: id, name: id, group, position, played, won: points, lost: played - points, points,
      games_for: 0, games_against: 0, games_diff: diff, needs_draw: false,
    });
    const groups = {
      A: [row("a1", "A", 1, 3, 3, 15), row("a2", "A", 2, 3, 2, 5)],
      B: [row("b1", "B", 1, 2, 2, 10), row("b2", "B", 2, 2, 1, 4)],
    };
    const o = overallF1(groups, []);
    // tra i secondi: a2 media punti 0,67 > b2 0,50
    expect(o.map((r) => r.player_id)).toEqual(["a1", "b1", "a2", "b2"]);
  });
});

describe("tabelloni (art. 7, A.3–A.4)", () => {
  const rows = (prefix: string, n: number): StandingRow[] =>
    Array.from({ length: n }, (_, i) => ({
      player_id: `${prefix}${i + 1}`, name: `${prefix}${i + 1}`, group: prefix, position: i + 1, played: 7, won: 0,
      lost: 0, points: 0, games_for: 0, games_against: 0, games_diff: 0, needs_draw: false,
    }));

  it("ordine seed standard", () => {
    expect(standardSeedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it("16 iscritti: incroci Winners A1-B2, A4-A5, A2-B1, A3-A6 e Challenger A7-B8, B4-B5, A8-B7, B3-B6", () => {
    const { winners, challenger } = bracketSeeds(rows("A", 8), rows("B", 8), 8, 2);
    const w = buildBracket(winners, [])[0].map((m) => `${m.home}-${m.away}`);
    expect(w).toEqual(["A1-B2", "A4-A5", "A2-B1", "A3-A6"]);
    const c = buildBracket(challenger, [])[0].map((m) => `${m.home}-${m.away}`);
    expect(c).toEqual(["A7-B8", "B4-B5", "A8-B7", "B3-B6"]);
  });

  it("15 iscritti: Challenger da 7, bye al seed 1", () => {
    const { challenger } = bracketSeeds(rows("A", 8), rows("B", 7), 8, 2);
    const b = buildBracket(challenger, []);
    expect(b[0][0].away).toBe(BYE);
    expect(b[0][0].winner).toBe("A7");
    expect(b[1][0].home).toBe("A7");
  });

  it("doppio tavolino: nessuno avanza, l'avversario del turno dopo passa (art. 7.5)", () => {
    const seeds = ["s1", "s2", "s3", "s4"];
    const res: Match[] = [
      match("s1", "s4", null, null, { phase: "W", round: 1, slot: 1, result_type: "double_walkover", status: "confirmed" }),
      match("s2", "s3", 9, 6, { phase: "W", round: 1, slot: 2 }),
    ];
    const b = buildBracket(seeds, res);
    expect(b[1][0].home).toBe(BYE);
    expect(b[1][0].away).toBe("s2");
    expect(b[1][0].winner).toBe("s2");
  });

  it("finale al meglio dei 3 set", () => {
    const res: Match[] = [
      match("s1", "s2", null, null, {
        phase: "W", round: 1, slot: 1, result_type: "played", status: "confirmed", sets: [{ home: 4, away: 6 }, { home: 7, away: 5 }, { home: 10, away: 7 }],
      }),
    ];
    expect(buildBracket(["s1", "s2"], res)[0][0].winner).toBe("s1");
  });
});

describe("validazione punteggi (art. 5.2, 5.5, 5.6, 5.9)", () => {
  it("set a 9 game", () => {
    expect(validateNineGame(9, 6).ok).toBe(true);
    expect(validateNineGame(8, 9)).toMatchObject({ ok: true, winner: "away", kind: "regular" });
    expect(validateNineGame(7, 5)).toMatchObject({ ok: true, kind: "time_limit" });
    expect(validateNineGame(6, 6).ok).toBe(false);
    expect(validateNineGame(10, 3).ok).toBe(false);
    expect(validateNineGame(9, 5, true)).toMatchObject({ ok: true, kind: "retired" });
    expect(validateNineGame(6, 5, true).ok).toBe(false);
  });
  it("2 set su 3 con super tie-break", () => {
    expect(validateBestOfThree([{ home: 6, away: 3 }, { home: 7, away: 6 }]).ok).toBe(true);
    expect(validateBestOfThree([{ home: 6, away: 3 }, { home: 3, away: 6 }, { home: 10, away: 8 }]).ok).toBe(true);
    expect(validateBestOfThree([{ home: 6, away: 3 }, { home: 3, away: 6 }, { home: 10, away: 9 }]).ok).toBe(false);
    expect(validateBestOfThree([{ home: 6, away: 5 }, { home: 6, away: 0 }]).ok).toBe(false);
    expect(validateBestOfThree([{ home: 6, away: 3 }, { home: 6, away: 3 }, { home: 10, away: 2 }]).ok).toBe(false);
  });
});

describe("calendario (art. 3, 4.8, 7.1, A.5)", () => {
  it("16 iscritti: date del regolamento v4", () => {
    const s = buildSchedule(DEFAULT_SETTINGS, scheduleInputFor(16, DEFAULT_SETTINGS));
    const kd = Object.fromEntries(s.keyDates.map((k) => [k.key, k.date]));
    expect(kd).toMatchObject({
      f1_deadline: "2026-12-20",
      f1_extension: "2026-12-27",
      f2_deadline: "2027-03-07",
      f2_extension: "2027-03-13",
      brackets_publication: "2027-03-14",
      ko_deadline: "2027-04-04",
      finals_day: "2027-04-17",
    });
    expect(weekForGroupRound(s, "F1", 1)).toEqual({ start: "2026-11-23", end: "2026-11-29" });
    expect(weekForGroupRound(s, "F2", 1)).toEqual({ start: "2027-01-11", end: "2027-01-17" });
    expect(weekForGroupRound(s, "F2", 7)).toEqual({ start: "2027-02-22", end: "2027-02-28" });
    expect(weekForBracketRound(s, 8, 1, DEFAULT_SETTINGS.finals_day)).toEqual({ start: "2027-03-15", end: "2027-03-21" });
    expect(weekForBracketRound(s, 8, 2, DEFAULT_SETTINGS.finals_day)?.start).toBe("2027-03-22");
    expect(weekForBracketRound(s, 8, 3, DEFAULT_SETTINGS.finals_day)?.start).toBe("2027-04-17");
    expect(s.weeks.filter((w) => w.kind === "PAUSE").map((w) => w.monday)).toEqual(["2026-12-21", "2026-12-28", "2027-01-04"]);
  });

  it("18 iscritti: calendario dell'Allegato A.5", () => {
    const s = buildSchedule(DEFAULT_SETTINGS, scheduleInputFor(18, DEFAULT_SETTINGS));
    const kd = Object.fromEntries(s.keyDates.map((k) => [k.key, k.date]));
    expect(kd.f2_deadline).toBe("2027-03-21");
    expect(kd.brackets_publication).toBe("2027-03-22");
    expect(weekForBracketRound(s, 16, 1, DEFAULT_SETTINGS.finals_day)?.start).toBe("2027-03-22"); // preliminare
    expect(weekForBracketRound(s, 8, 1, DEFAULT_SETTINGS.finals_day)?.start).toBe("2027-03-29"); // quarti
    expect(weekForBracketRound(s, 8, 2, DEFAULT_SETTINGS.finals_day)?.start).toBe("2027-04-05"); // semifinali
  });
});

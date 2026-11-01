import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_SETTINGS,
  buildBracket,
  buildSchedule,
  bracketSize,
  computePhaseStandings,
  overallF1,
  scheduleInputFor,
  type BracketMatch,
  type Match,
  type OverallRow,
  type Player,
  type Schedule,
  type Settings,
  type StandingRow,
} from "@/lib/tournament";

export type AppSettings = Settings & { rules_pdf_url: string | null };

export interface TournamentData {
  settings: AppSettings;
  players: Player[];
  names: Record<string, string>;
  matches: Match[];
  seeds: { W: string[]; C: string[] };
  schedule: Schedule;
  f1: Record<string, StandingRow[]>;
  overall: OverallRow[];
  f2: Record<string, StandingRow[]>;
  brackets: { W: BracketMatch[][]; C: BracketMatch[][] };
}

type Supa = ReturnType<typeof createClient>;

/** Carica tutto lo stato del torneo e calcola classifiche, calendario e tabelloni. */
export async function getTournament(supabase: Supa = createClient()): Promise<TournamentData> {
  const [s, p, m, b] = await Promise.all([
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("players").select("*").order("full_name"),
    supabase.from("matches").select("*").order("phase").order("round").order("slot"),
    supabase.from("bracket_seeds").select("*").order("seed"),
  ]);

  const settings: AppSettings = { ...DEFAULT_SETTINGS, rules_pdf_url: null, ...(s.data ?? {}) };
  const players: Player[] = (p.data ?? []).map((r) => ({ email: null, phone: null, ...r, seed_score: r.seed_score === null ? null : Number(r.seed_score) }));
  const matches = (m.data ?? []) as Match[];
  const seedRows = (b.data ?? []) as { phase: "W" | "C"; seed: number; player_id: string | null }[];
  const seeds = {
    W: seedRows.filter((r) => r.phase === "W").map((r) => r.player_id ?? "BYE"),
    C: seedRows.filter((r) => r.phase === "C").map((r) => r.player_id ?? "BYE"),
  };

  const active = players.filter((x) => x.status === "active");
  const input = scheduleInputFor(active.length, settings);
  // se le fasi sono già composte, usa le dimensioni reali dei gironi
  const sizeOf = (field: "f1_group" | "f2_group", g: string) => players.filter((x) => x[field] === g).length;
  const f1Groups = [...new Set(players.map((x) => x.f1_group).filter(Boolean))] as string[];
  if (f1Groups.length) input.f1MaxGroup = Math.max(...f1Groups.map((g) => sizeOf("f1_group", g)));
  if (players.some((x) => x.f2_group)) input.f2GroupA = Math.max(sizeOf("f2_group", "A"), sizeOf("f2_group", "B"));
  if (seeds.W.length) input.winnersBracket = bracketSize(seeds.W.length);
  if (seeds.C.length) input.challengerBracket = bracketSize(seeds.C.length);
  const schedule = buildSchedule(settings, input);

  const f1 = computePhaseStandings(players, matches, "F1", settings.count_reported_results);
  const f2 = computePhaseStandings(players, matches, "F2", settings.count_reported_results);
  const overall = overallF1(f1, players);
  const counted = (x: Match) => x.status === "confirmed" || (settings.count_reported_results && x.status === "reported");
  const brackets = {
    W: buildBracket(seeds.W, matches.filter((x) => x.phase === "W" && counted(x))),
    C: buildBracket(seeds.C, matches.filter((x) => x.phase === "C" && counted(x))),
  };
  // collega le righe partita (anche non giocate) ai nodi del tabellone
  for (const ph of ["W", "C"] as const) {
    for (const round of brackets[ph]) {
      for (const bm of round) {
        bm.match = matches.find((x) => x.phase === ph && x.round === bm.round && x.slot === bm.slot);
      }
    }
  }

  const names = Object.fromEntries(players.map((x) => [x.id, x.full_name]));
  names.BYE = "BYE";
  return { settings, players, names, matches, seeds, schedule, f1, overall, f2, brackets };
}

/** Le semifinali e le finali si giocano 2 set su 3 (art. 5.6). */
export function isBestOfThree(match: Pick<Match, "phase" | "round">, data: Pick<TournamentData, "seeds">): boolean {
  if (match.phase !== "W" && match.phase !== "C") return false;
  const size = bracketSize(data.seeds[match.phase].length);
  return Math.log2(size) - match.round + 1 <= 2;
}

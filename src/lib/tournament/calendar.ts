import { roundsFor } from "./roundRobin";
import { bracketSize } from "./bracket";
import type { Settings } from "./types";

/** Date ISO "YYYY-MM-DD" gestite in UTC per evitare problemi di fuso orario. */
export const toDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
export const toIso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => toIso(new Date(toDate(iso).getTime() + n * 86400000));

/** Lunedì della settimana che contiene il 25 dicembre dell'anno di inizio (art. 3: pausa natalizia). */
export function pauseStart(startIso: string): string {
  const year = toDate(startIso).getUTCFullYear();
  const xmas = new Date(Date.UTC(year, 11, 25));
  const dow = (xmas.getUTCDay() + 6) % 7; // 0 = lunedì
  return toIso(new Date(xmas.getTime() - dow * 86400000));
}

export type WeekKind =
  | "F1"
  | "REC_F1"
  | "F2"
  | "REC_F2"
  | "EXT_F2"
  | "KO"
  | "REC_KO"
  | "WAIT"
  | "FINALS"
  | "PAUSE";

export interface Week {
  monday: string;
  sunday: string;
  playIndex: number | null; // n° settimana di gioco (null in pausa)
  kind: WeekKind;
  label: string;
}

export interface ScheduleInput {
  /** dimensione massima effettiva dei gironi di Fase 1 */
  f1MaxGroup: number;
  /** giocatori del girone A di Fase 2 (il più numeroso) */
  f2GroupA: number;
  /** dimensione dei tabelloni (posti) */
  winnersBracket: number;
  challengerBracket: number;
}

export interface Schedule {
  weeks: Week[];
  /** settimane di gioco (pausa esclusa) fino ai recuperi della fase finale */
  playWeeks: number;
  bounds: { f1: number; recF1: number; f2: number; recF2: number; extF2: number; semis: number; recKo: number };
  koRoundsBeforeFinal: number;
  keyDates: { key: string; label: string; date: string; article: string }[];
}

/** Valori derivati dal numero di iscritti (stessa logica del file Excel di gestione). */
export function scheduleInputFor(nActive: number, settings: Settings): ScheduleInput {
  const g1 = Math.min(8, Math.ceil(nActive / settings.f1_max_group_size));
  const f1MaxGroup = g1 ? Math.ceil(nActive / g1) : 0;
  const f2GroupA = Math.ceil(nActive / 2);
  const nChallenger = Math.max(0, nActive - settings.winners_size);
  return {
    f1MaxGroup,
    f2GroupA,
    winnersBracket: bracketSize(settings.winners_size),
    challengerBracket: bracketSize(nChallenger),
  };
}

export function buildSchedule(settings: Settings, input: ScheduleInput): Schedule {
  const w1 = roundsFor(input.f1MaxGroup);
  const w2 = roundsFor(input.f2GroupA);
  const small = input.f2GroupA <= 8; // con gironi da 9 (17–18 iscritti) niente proroga F2 né recuperi KO (A.5)
  const p2 = small ? 1 : 0;
  const bk = small ? 1 : 0;
  const maxBracket = Math.max(input.winnersBracket, input.challengerBracket, 2);
  const koRounds = Math.round(Math.log2(maxBracket)) - 1;

  const c1 = w1;
  const c2 = c1 + settings.recovery_weeks_f1;
  const c3 = c2 + w2;
  const c4 = c3 + settings.recovery_weeks_f2;
  const c5 = c4 + p2;
  const c6 = c5 + koRounds;
  const total = c6 + bk;

  const pStart = pauseStart(settings.start_date);
  const pEnd = addDays(pStart, 7 * settings.pause_weeks - 1);
  const finals = settings.finals_day;

  const weeks: Week[] = [];
  let play = 0;
  for (let i = 0; i < 60; i++) {
    const monday = addDays(settings.start_date, 7 * i);
    const sunday = addDays(monday, 6);
    if (monday >= pStart && monday <= pEnd) {
      weeks.push({ monday, sunday, playIndex: null, kind: "PAUSE", label: "Pausa natalizia" });
      continue;
    }
    play++;
    let kind: WeekKind;
    let label: string;
    if (play <= c1) [kind, label] = ["F1", `Fase 1 — giornata ${play} di ${w1}`];
    else if (play <= c2) [kind, label] = ["REC_F1", "Recuperi Fase 1"];
    else if (play <= c3) [kind, label] = ["F2", `Fase 2 — giornata ${play - c2} di ${w2}`];
    else if (play <= c4) [kind, label] = ["REC_F2", "Recuperi Fase 2"];
    else if (play <= c5) [kind, label] = ["EXT_F2", "Proroga Fase 2 e pubblicazione tabelloni"];
    else if (play <= c6) {
      const remaining = c6 - play + 1; // 1 = semifinali
      [kind, label] = ["KO", ["Semifinali", "Quarti di finale", "Turno preliminare", "Sedicesimi"][remaining - 1] ?? "Fase finale"];
    } else if (play <= total) [kind, label] = ["REC_KO", "Recuperi fase finale"];
    else if (finals && monday <= finals && sunday >= finals) [kind, label] = ["FINALS", "Finals Day"];
    else if (finals && monday < finals) [kind, label] = ["WAIT", "Attesa Finals Day"];
    else break;
    weeks.push({ monday, sunday, playIndex: play, kind, label });
  }

  const sundayOf = (n: number) => weeks.find((w) => w.playIndex === n)?.sunday ?? "";
  const f1Deadline = sundayOf(c2);
  const f2Deadline = sundayOf(c4);
  const keyDates = [
    { key: "registration_close", label: "Chiusura iscrizioni", date: settings.registration_close ?? "", article: "1.4" },
    { key: "f1_publication", label: "Pubblicazione gironi Fase 1", date: settings.f1_groups_publication ?? "", article: "1.4" },
    { key: "start", label: "Inizio Fase 1", date: settings.start_date, article: "3" },
    { key: "f1_deadline", label: "Scadenza Fase 1", date: f1Deadline, article: "3.2" },
    { key: "f1_extension", label: "Fine proroga Fase 1 (malattia)", date: f1Deadline ? addDays(f1Deadline, 7) : "", article: "4.8" },
    { key: "f2_publication", label: "Pubblicazione gironi Fase 2", date: settings.f2_groups_publication ?? "", article: "3" },
    { key: "f2_deadline", label: "Scadenza Fase 2", date: f2Deadline, article: "3.2" },
    { key: "f2_extension", label: "Fine proroga Fase 2 (malattia)", date: p2 ? addDays(f2Deadline, 6) : f2Deadline, article: "4.8" },
    { key: "brackets_publication", label: "Pubblicazione tabelloni", date: p2 ? addDays(f2Deadline, 7) : addDays(f2Deadline, 1), article: "3" },
    { key: "ko_deadline", label: "Scadenza fase finale", date: sundayOf(total), article: "7.1" },
    { key: "finals_day", label: "Finals Day", date: finals ?? "", article: "3.3" },
  ].filter((k) => k.date);

  return {
    weeks,
    playWeeks: total,
    bounds: { f1: c1, recF1: c2, f2: c3, recF2: c4, extF2: c5, semis: c6, recKo: total },
    koRoundsBeforeFinal: koRounds,
    keyDates,
  };
}

/** Settimana di riferimento di una giornata di girone (art. 3.1). */
export function weekForGroupRound(schedule: Schedule, phase: "F1" | "F2", round: number) {
  const idx = phase === "F1" ? round : schedule.bounds.recF1 + round;
  const w = schedule.weeks.find((x) => x.playIndex === idx);
  return w ? { start: w.monday, end: w.sunday } : null;
}

/** Settimana di un turno di tabellone; la finale si gioca al Finals Day (art. 7.2). */
export function weekForBracketRound(schedule: Schedule, size: number, round: number, finalsDay: string | null) {
  const remaining = Math.log2(size) - round; // 0 = finale
  if (remaining <= 0) return finalsDay ? { start: finalsDay, end: finalsDay } : null;
  const idx = schedule.bounds.semis - remaining + 1;
  const w = schedule.weeks.find((x) => x.playIndex === idx);
  return w ? { start: w.monday, end: w.sunday } : null;
}

/** Prossima scadenza rispetto a oggi, per il countdown della home. */
export function nextKeyDate(schedule: Schedule, todayIso: string) {
  return schedule.keyDates
    .filter((k) => k.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
}

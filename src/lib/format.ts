import type { Match, SetScore } from "@/lib/tournament";

const DAYS = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];

/** "lun 23/11/2026" */
export function fmtDate(iso: string | null | undefined, withYear = true): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dd = String(d).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${DAYS[dt.getUTCDay()]} ${dd}/${mm}${withYear ? `/${y}` : ""}`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Punteggio leggibile di una partita. */
export function scoreText(m: Pick<Match, "result_type" | "home_games" | "away_games" | "sets" | "status">): string {
  if (!m.result_type || m.status === "scheduled") return "";
  switch (m.result_type) {
    case "walkover_home":
      return "9-0 (tav.)";
    case "walkover_away":
      return "0-9 (tav.)";
    case "double_walkover":
      return "doppio tavolino";
    case "annulled":
      return "annullata";
    default:
      if (m.sets && m.sets.length) return m.sets.map((s) => `${s.home}-${s.away}`).join(" ");
      return `${m.home_games ?? 0}-${m.away_games ?? 0}`;
  }
}

export const PHASE_LABEL: Record<string, string> = {
  F1: "Fase 1 — gironi di qualificazione",
  F2: "Fase 2 — gironi A e B",
  W: "Tabellone Winners",
  C: "Tabellone Challenger",
};

/** "6-4 3-6 10-8" → [{home:6,away:4}, …] */
export function parseSets(text: string | null): SetScore[] | null {
  if (!text) return null;
  const sets = text
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map((t) => t.split("-").map(Number))
    .map(([home, away]) => ({ home, away }));
  return sets.some((s) => Number.isNaN(s.home) || Number.isNaN(s.away)) ? null : sets;
}

import { fmtDate, scoreText } from "@/lib/format";
import type { Match } from "@/lib/tournament";
import { Badge } from "./ui";

/** Elenco partite con settimana di riferimento, giocatore di casa (art. 4.1), risultato e stato. */
export function MatchTable({ matches, names, highlight }: { matches: Match[]; names: Record<string, string>; highlight?: string | null }) {
  return (
    <div className="card overflow-x-auto p-0 sm:p-0">
      <table className="table">
        <thead>
          <tr>
            <th>Settimana</th>
            <th>Girone / turno</th>
            <th>Casa</th>
            <th>Ospite</th>
            <th className="text-center">Risultato</th>
            <th>Stato</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => {
            const mine = highlight && (m.home_id === highlight || m.away_id === highlight);
            const homeWon = (m.home_games ?? 0) > (m.away_games ?? 0) || m.result_type === "walkover_home";
            const awayWon = (m.away_games ?? 0) > (m.home_games ?? 0) || m.result_type === "walkover_away";
            return (
              <tr key={m.id} className={mine ? "bg-amber-50" : ""}>
                <td className="whitespace-nowrap">{fmtDate(m.week_start, false)} – {fmtDate(m.week_end, false)}</td>
                <td className="whitespace-nowrap">{m.group_code ? `Girone ${m.group_code} · G${m.round}` : `Turno ${m.round}`}</td>
                <td className={m.status !== "scheduled" && homeWon ? "font-semibold" : ""}>{names[m.home_id ?? ""] ?? "—"}</td>
                <td className={m.status !== "scheduled" && awayWon ? "font-semibold" : ""}>{names[m.away_id ?? ""] ?? "—"}</td>
                <td className="text-center font-mono">{scoreText(m)}</td>
                <td><Badge kind={m.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

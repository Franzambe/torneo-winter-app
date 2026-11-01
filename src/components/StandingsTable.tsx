import type { StandingRow } from "@/lib/tournament";

export type Zone = "W" | "C" | "A" | "B" | null;

/** Tabella classifica di un girone (art. 6). `zone` colora qualificazione e fasce. */
export function StandingsTable({
  title,
  rows,
  zone,
  highlight,
}: {
  title: string;
  rows: StandingRow[];
  zone?: (row: StandingRow) => Zone;
  highlight?: string | null;
}) {
  const color: Record<string, string> = {
    W: "border-l-4 border-l-club-black",
    A: "border-l-4 border-l-club-black",
    C: "border-l-4 border-l-club-slate",
    B: "border-l-4 border-l-club-slate",
  };
  return (
    <div className="card overflow-x-auto p-0 sm:p-0">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="h2">{title}</h3>
        {rows.some((r) => r.needs_draw) && <span className="text-xs text-amber-700">parità da risolvere con sorteggio</span>}
      </div>
      <table className="table">
        <thead>
          <tr>
            <th className="w-8">#</th>
            <th>Giocatore</th>
            <th className="text-center">G</th>
            <th className="text-center">V</th>
            <th className="text-center">P</th>
            <th className="text-center">Pt</th>
            <th className="text-center">GF</th>
            <th className="text-center">GS</th>
            <th className="text-center">Diff</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const z = zone?.(r);
            return (
              <tr key={r.player_id} className={`${z ? color[z] : ""} ${highlight === r.player_id ? "bg-amber-50" : ""}`}>
                <td className="font-semibold">{r.position}</td>
                <td>
                  {r.name}
                  {r.needs_draw && <span title="Parità assoluta: sorteggio del Comitato (art. 6.2)"> ⚑</span>}
                </td>
                <td className="text-center">{r.played}</td>
                <td className="text-center">{r.won}</td>
                <td className="text-center">{r.lost}</td>
                <td className="text-center font-bold">{r.points}</td>
                <td className="text-center">{r.games_for}</td>
                <td className="text-center">{r.games_against}</td>
                <td className="text-center">{r.games_diff > 0 ? `+${r.games_diff}` : r.games_diff}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

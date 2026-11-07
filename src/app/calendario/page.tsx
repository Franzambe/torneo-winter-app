import Link from "next/link";
import { MatchTable } from "@/components/MatchTable";
import { Empty, PageHeader } from "@/components/ui";
import { getTournament } from "@/lib/data";
import { fmtDate, todayIso } from "@/lib/format";
import { roundName } from "@/lib/tournament";

const KIND_STYLE: Record<string, string> = {
  PAUSE: "bg-red-50 text-red-800",
  KO: "bg-club-light",
  FINALS: "bg-club-black text-white",
};
const PHASES = [["F1", "Fase 1"], ["F2", "Fase 2"], ["W", "Winners"], ["C", "Challenger"]] as const;

export default async function Calendario({ searchParams }: { searchParams: { fase?: string; g?: string } }) {
  const d = await getTournament();
  const today = todayIso();
  // fase di default: l'ultima che ha partite
  const withMatches = PHASES.map(([k]) => k).filter((k) => d.matches.some((m) => m.phase === k));
  const fase = PHASES.some(([k]) => k === searchParams.fase) ? searchParams.fase! : withMatches.at(-1) ?? "F1";
  const player = searchParams.g && d.names[searchParams.g] ? searchParams.g : "";
  const list = d.matches
    .filter((m) => m.phase === fase && (!player || m.home_id === player || m.away_id === player))
    .sort((a, b) => a.round - b.round || (a.group_code ?? "").localeCompare(b.group_code ?? "") || a.slot - b.slot);
  const rounds = [...new Set(list.map((m) => m.round))];
  const isGroup = fase === "F1" || fase === "F2";
  const size = fase === "W" || fase === "C" ? 2 ** Math.ceil(Math.log2(Math.max(2, d.seeds[fase].length))) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Calendario e incontri" subtitle="Ogni giornata ha una settimana di riferimento, da lunedì a domenica (art. 3.1). Il giocatore di casa (a sinistra) prenota il campo e porta le palline (art. 4.1)." />

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {PHASES.map(([k, l]) => (
            <Link key={k} href={`?fase=${k}${player ? `&g=${player}` : ""}`} className={fase === k ? "btn" : "btn-ghost"}>{l}</Link>
          ))}
          <form className="ml-auto flex items-center gap-2" action="/calendario">
            <input type="hidden" name="fase" value={fase} />
            <select name="g" defaultValue={player} className="input w-56">
              <option value="">Tutti i giocatori</option>
              {d.players.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
            <button className="btn-ghost">Filtra</button>
          </form>
        </div>
        {list.length === 0 ? (
          <Empty>
            {fase === "F1" ? "Gli incontri di Fase 1 non sono ancora stati pubblicati." : fase === "F2" ? "Gli incontri di Fase 2 saranno pubblicati al termine della Fase 1 (3 gennaio 2027)." : "I tabelloni saranno pubblicati al termine della Fase 2 (14 marzo 2027)."}
          </Empty>
        ) : (
          <div className="space-y-5">
            {rounds.map((r) => {
              const ms = list.filter((m) => m.round === r);
              const ws = ms[0]?.week_start;
              const current = ws && ms[0].week_end && ws <= today && ms[0].week_end >= today;
              return (
                <div key={r}>
                  <h3 className="h2 mb-2">
                    {isGroup ? `Giornata ${r}` : roundName(Math.log2(size) - r + 1)}
                    <span className="ml-2 text-sm font-normal text-black/55">{fmtDate(ws)} – {fmtDate(ms[0]?.week_end)}</span>
                    {current && <span className="ml-2 rounded-full bg-amber-300 px-2 py-0.5 text-xs font-semibold">settimana in corso</span>}
                  </h3>
                  <MatchTable matches={ms} names={d.names} highlight={player || null} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="h2 mb-2">Settimane del torneo</h2>
        <div className="card overflow-x-auto p-0 sm:p-0">
          <table className="table">
            <thead><tr><th>Sett.</th><th>Dal</th><th>Al</th><th>Fase / turno</th></tr></thead>
            <tbody>
              {d.schedule.weeks.map((w) => (
                <tr key={w.monday} className={`${KIND_STYLE[w.kind] ?? ""} ${w.monday <= today && w.sunday >= today ? "outline outline-2 outline-amber-400" : ""}`}>
                  <td>{w.playIndex ?? "—"}</td>
                  <td className="whitespace-nowrap">{fmtDate(w.monday)}</td>
                  <td className="whitespace-nowrap">{fmtDate(w.sunday)}</td>
                  <td>{w.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

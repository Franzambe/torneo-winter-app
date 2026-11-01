import Link from "next/link";
import { MatchTable } from "@/components/MatchTable";
import { Empty, PageHeader } from "@/components/ui";
import { getTournament } from "@/lib/data";
import { fmtDate, todayIso } from "@/lib/format";

const KIND_STYLE: Record<string, string> = {
  PAUSE: "bg-red-50 text-red-800",
  KO: "bg-club-light",
  FINALS: "bg-club-black text-white",
};

export default async function Calendario({ searchParams }: { searchParams: { fase?: string } }) {
  const d = await getTournament();
  const today = todayIso();
  const fase = ["F1", "F2", "W", "C"].includes(searchParams.fase ?? "") ? searchParams.fase! : "F1";
  const list = d.matches.filter((m) => m.phase === fase).sort((a, b) => (a.week_start ?? "").localeCompare(b.week_start ?? "") || (a.group_code ?? "").localeCompare(b.group_code ?? ""));

  return (
    <div className="space-y-6">
      <PageHeader title="Calendario" subtitle="Ogni giornata ha una settimana di riferimento, da lunedì a domenica (art. 3.1). Il giocatore di casa prenota il campo e porta le palline (art. 4.1)." />

      <section className="card overflow-x-auto p-0 sm:p-0">
        <table className="table">
          <thead><tr><th>Settimana</th><th>Dal</th><th>Al</th><th>Fase / turno</th></tr></thead>
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
      </section>

      <section>
        <div className="mb-3 flex flex-wrap gap-2">
          {[["F1", "Fase 1"], ["F2", "Fase 2"], ["W", "Winners"], ["C", "Challenger"]].map(([k, l]) => (
            <Link key={k} href={`?fase=${k}`} className={fase === k ? "btn" : "btn-ghost"}>{l}</Link>
          ))}
        </div>
        {list.length ? <MatchTable matches={list} names={d.names} /> : <Empty>Partite non ancora generate per questa fase.</Empty>}
      </section>
    </div>
  );
}

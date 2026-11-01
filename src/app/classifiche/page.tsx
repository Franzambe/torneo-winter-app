import Link from "next/link";
import { StandingsTable } from "@/components/StandingsTable";
import { Empty, PageHeader } from "@/components/ui";
import { getTournament } from "@/lib/data";

export default async function Classifiche({ searchParams }: { searchParams: { fase?: string } }) {
  const d = await getTournament();
  const hasF2 = Object.keys(d.f2).length > 0;
  const fase = searchParams.fase === "F1" || searchParams.fase === "F2" ? searchParams.fase : hasF2 ? "F2" : "F1";
  const qa = d.settings.winners_size - d.settings.promoted_from_b;
  const nA = Math.ceil(d.overall.length / 2);

  return (
    <div>
      <PageHeader title="Classifiche" subtitle="Calcolo automatico: 1 punto a vittoria, poi scontro diretto, classifica avulsa, differenza game (art. 6)">
        <div className="flex gap-2">
          <Link href="?fase=F1" className={fase === "F1" ? "btn" : "btn-ghost"}>Fase 1</Link>
          <Link href="?fase=F2" className={fase === "F2" ? "btn" : "btn-ghost"}>Fase 2</Link>
        </div>
      </PageHeader>

      {fase === "F1" && (
        Object.keys(d.f1).length === 0 ? <Empty>I gironi di Fase 1 saranno pubblicati entro il 15 novembre.</Empty> : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(d.f1).map(([g, rows]) => (
                <StandingsTable key={g} title={`Girone ${g}`} rows={rows} />
              ))}
            </div>
            <div className="card overflow-x-auto p-0 sm:p-0">
              <div className="px-4 py-3">
                <h3 className="h2">Classifica unica di Fase 1</h3>
                <p className="muted">Posizione nel girone, poi media punti, media differenza game, media game vinti (art. 6.3). I primi {nA} vanno nel girone A.</p>
              </div>
              <table className="table">
                <thead>
                  <tr><th>#</th><th>Giocatore</th><th>Girone</th><th className="text-center">Pos.</th><th className="text-center">Media pt</th><th className="text-center">Media diff</th><th className="text-center">Media GF</th><th>Fase 2</th></tr>
                </thead>
                <tbody>
                  {d.overall.map((r) => (
                    <tr key={r.player_id}>
                      <td className="font-semibold">{r.overall}</td>
                      <td>{r.name}</td>
                      <td>{r.group}</td>
                      <td className="text-center">{r.position}</td>
                      <td className="text-center">{r.avg_points.toFixed(2)}</td>
                      <td className="text-center">{r.avg_diff.toFixed(2)}</td>
                      <td className="text-center">{r.avg_for.toFixed(2)}</td>
                      <td className="font-semibold">{r.overall <= nA ? "Girone A" : "Girone B"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {fase === "F2" && (
        !hasF2 ? <Empty>I gironi di Fase 2 saranno pubblicati il 3 gennaio 2027.</Empty> : (
          <div className="space-y-3">
            <div className="grid gap-4 md:grid-cols-2">
              {d.f2.A && <StandingsTable title="Girone A" rows={d.f2.A} zone={(r) => (r.position <= qa ? "W" : "C")} />}
              {d.f2.B && <StandingsTable title="Girone B" rows={d.f2.B} zone={(r) => (r.position <= d.settings.promoted_from_b ? "W" : "C")} />}
            </div>
            <p className="muted">
              <span className="mr-1 inline-block h-3 w-1 bg-club-black align-middle" /> Winners: primi {qa} di A e primi {d.settings.promoted_from_b} di B ·{" "}
              <span className="mr-1 inline-block h-3 w-1 bg-club-slate align-middle" /> Challenger: tutti gli altri (art. 2.5–2.6)
            </p>
          </div>
        )
      )}
    </div>
  );
}

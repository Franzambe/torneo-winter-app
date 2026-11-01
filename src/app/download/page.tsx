import { PdfExport, type PdfTable } from "@/components/PdfExport";
import { PageHeader } from "@/components/ui";
import { getTournament } from "@/lib/data";
import { fmtDate, scoreText, PHASE_LABEL, todayIso } from "@/lib/format";
import type { StandingRow } from "@/lib/tournament";

const standingsTable = (title: string, rows: StandingRow[]): PdfTable => ({
  title,
  head: ["#", "Giocatore", "G", "V", "P", "Pt", "GF", "GS", "Diff"],
  body: rows.map((r) => [r.position, r.name, r.played, r.won, r.lost, r.points, r.games_for, r.games_against, r.games_diff]),
});

export default async function Download() {
  const d = await getTournament();
  const stamp = `Aggiornato al ${fmtDate(todayIso())}`;

  const calendar: PdfTable[] = (["F1", "F2", "W", "C"] as const)
    .map((ph) => ({
      title: PHASE_LABEL[ph],
      head: ["Settimana", "Girone/turno", "Casa", "Ospite", "Risultato", "Stato"],
      body: d.matches
        .filter((m) => m.phase === ph)
        .sort((a, b) => (a.week_start ?? "").localeCompare(b.week_start ?? ""))
        .map((m) => [
          `${fmtDate(m.week_start, false)} – ${fmtDate(m.week_end, false)}`,
          m.group_code ? `${m.group_code} · G${m.round}` : `T${m.round}`,
          d.names[m.home_id ?? ""] ?? "",
          d.names[m.away_id ?? ""] ?? "",
          scoreText(m),
          m.status === "confirmed" ? "confermata" : m.status === "reported" ? "da confermare" : "da giocare",
        ]),
    }))
    .filter((t) => t.body.length);

  const standings: PdfTable[] = [
    ...Object.entries(d.f1).map(([g, rows]) => standingsTable(`Fase 1 · Girone ${g}`, rows)),
    ...(d.overall.length
      ? [{
          title: "Classifica unica di Fase 1 (art. 6.3)",
          head: ["#", "Giocatore", "Girone", "Pos.", "Media pt", "Media diff", "Media GF"],
          body: d.overall.map((r) => [r.overall, r.name, r.group, r.position, r.avg_points.toFixed(2), r.avg_diff.toFixed(2), r.avg_for.toFixed(2)]),
        }]
      : []),
    ...Object.entries(d.f2).map(([g, rows]) => standingsTable(`Fase 2 · Girone ${g}`, rows)),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Download" subtitle="Documenti ufficiali e PDF generati con i dati aggiornati in tempo reale." />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <h2 className="h2">Regolamento ufficiale</h2>
          <p className="muted mt-1">Versione approvata dal Comitato.</p>
          <a className="btn mt-4" href={d.settings.rules_pdf_url ?? "/docs/regolamento.pdf"} target="_blank">Scarica PDF</a>
        </div>
        <div className="card">
          <h2 className="h2">Calendario e risultati</h2>
          <p className="muted mt-1">Tutte le partite con settimana, risultato e stato.</p>
          <div className="mt-4">
            <PdfExport label="Genera PDF" filename="calendario-torneo-winter.pdf" title="Calendario e risultati" subtitle={`${d.settings.name} · ${stamp}`} tables={calendar} landscape />
          </div>
        </div>
        <div className="card">
          <h2 className="h2">Classifiche</h2>
          <p className="muted mt-1">Gironi di Fase 1, classifica unica e gironi A/B.</p>
          <div className="mt-4">
            <PdfExport label="Genera PDF" filename="classifiche-torneo-winter.pdf" title="Classifiche" subtitle={`${d.settings.name} · ${stamp}`} tables={standings} />
          </div>
        </div>
      </div>
    </div>
  );
}

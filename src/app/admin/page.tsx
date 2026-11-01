import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { getTournament } from "@/lib/data";
import { fmtDate, todayIso } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { nextKeyDate } from "@/lib/tournament";

export default async function AdminHome() {
  const supabase = createClient();
  const d = await getTournament(supabase);
  const { count: pending } = await supabase.from("result_reports").select("id", { count: "exact", head: true }).eq("status", "pending");
  const active = d.players.filter((p) => p.status === "active");
  const draws = [...Object.values(d.f1), ...Object.values(d.f2)].flat().filter((r) => r.needs_draw);
  const next = nextKeyDate(d.schedule, todayIso());
  const overdue = d.matches.filter((m) => m.status === "scheduled" && m.week_end && m.week_end < todayIso() && m.home_id && m.away_id);
  const kpi = [
    ["Iscritti attivi", `${active.length}`, `${active.filter((p) => p.fee_paid).length} con quota pagata`],
    ["Partite confermate", `${d.matches.filter((m) => m.status === "confirmed").length}/${d.matches.length}`, "tutte le fasi"],
    ["Segnalazioni da validare", `${pending ?? 0}`, "art. 4.7"],
    ["Prossima scadenza", next ? fmtDate(next.date) : "—", next?.label ?? ""],
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Pannello di controllo" subtitle={`Settimane di gioco: ${d.schedule.playWeeks} + Finals Day ${fmtDate(d.settings.finals_day)}`} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpi.map(([t, v, s]) => (
          <div key={t} className="card">
            <div className="text-xs uppercase text-black/50">{t}</div>
            <div className="mt-1 text-2xl font-bold">{v}</div>
            <div className="text-xs text-black/50">{s}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="h2 mb-2">Da fare</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {(pending ?? 0) > 0 && <li><Link className="underline" href="/admin/segnalazioni">{pending} risultati da confermare</Link></li>}
            {overdue.length > 0 && <li><Link className="underline" href="/admin/partite">{overdue.length} partite oltre la settimana di riferimento</Link> (recupero entro la scadenza di fase, poi art. 8)</li>}
            {draws.length > 0 && <li>Parità assolute da sorteggiare: {draws.map((r) => r.name).join(", ")} → imposta «sorteggio» nella scheda giocatore</li>}
            {active.some((p) => p.seed_score === null) && <li><Link className="underline" href="/admin/giocatori">Punteggio di seeding mancante</Link> per alcuni giocatori (art. 2.2)</li>}
            {(pending ?? 0) === 0 && overdue.length === 0 && draws.length === 0 && <li>Nessuna azione in sospeso.</li>}
          </ul>
        </section>
        <section className="card">
          <h2 className="h2 mb-2">Date chiave</h2>
          <table className="table">
            <tbody>
              {d.schedule.keyDates.map((k) => (
                <tr key={k.key}><td>{k.label}</td><td>{fmtDate(k.date)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

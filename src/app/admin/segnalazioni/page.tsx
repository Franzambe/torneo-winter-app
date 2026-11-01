import { reviewReport } from "@/app/admin/actions";
import { Empty, Flash, PageHeader } from "@/components/ui";
import { getTournament } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function Segnalazioni({ searchParams }: { searchParams: { msg?: string; err?: string } }) {
  const supabase = createClient();
  const d = await getTournament(supabase);
  const { data: reports } = await supabase.from("result_reports").select("*").order("created_at", { ascending: false }).limit(100);
  const { data: profiles } = await supabase.from("profiles").select("id, email");
  const who = new Map((profiles ?? []).map((p) => [p.id, p.email]));
  const pending = (reports ?? []).filter((r) => r.status === "pending");
  const done = (reports ?? []).filter((r) => r.status !== "pending").slice(0, 20);

  const describe = (r: NonNullable<typeof reports>[number]) => {
    const m = d.matches.find((x) => x.id === r.match_id);
    const score = r.sets ? (r.sets as { home: number; away: number }[]).map((s) => `${s.home}-${s.away}`).join(" ") : `${r.home_games}-${r.away_games}`;
    return { m, text: `${d.names[m?.home_id ?? ""] ?? "?"} – ${d.names[m?.away_id ?? ""] ?? "?"} · ${score}${r.retired ? " (ritiro)" : ""}` };
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Segnalazioni dei giocatori" subtitle="Il risultato segnalato conta subito in classifica (se attivo nelle impostazioni) e diventa definitivo con la conferma (art. 4.7)." />
      <Flash searchParams={searchParams} />
      {pending.length === 0 && <Empty>Nessuna segnalazione in attesa.</Empty>}
      {pending.map((r) => {
        const { m, text } = describe(r);
        return (
          <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{text}</div>
              <div className="text-xs text-black/55">{m?.phase} {m?.group_code ? `girone ${m.group_code}` : ""} · inviata da {who.get(r.reported_by) ?? "?"} il {fmtDate(r.created_at.slice(0, 10))}{r.note ? ` · «${r.note}»` : ""}</div>
            </div>
            <div className="flex gap-2">
              <form action={reviewReport}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="decision" value="approve" /><button className="btn">Conferma</button></form>
              <form action={reviewReport}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="decision" value="reject" /><button className="btn-ghost">Respingi</button></form>
            </div>
          </div>
        );
      })}
      {done.length > 0 && (
        <section className="card">
          <h2 className="h2 mb-2">Storico</h2>
          <ul className="divide-y divide-black/5 text-sm">
            {done.map((r) => (
              <li key={r.id} className="flex justify-between py-1.5"><span>{describe(r).text}</span><span className="text-black/55">{r.status === "approved" ? "confermata" : "respinta"}</span></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

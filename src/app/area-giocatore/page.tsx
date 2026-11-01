import { ResultForm } from "@/components/ResultForm";
import { Badge, Empty, Flash, PageHeader } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { getTournament, isBestOfThree } from "@/lib/data";
import { fmtDate, scoreText, PHASE_LABEL } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function AreaGiocatore({ searchParams }: { searchParams: { msg?: string; err?: string } }) {
  const viewer = await getViewer();
  const supabase = createClient();
  const d = await getTournament(supabase);

  if (!viewer.playerId) {
    return (
      <div>
        <PageHeader title="Area giocatore" />
        <Empty>
          Il tuo account ({viewer.email}) non è ancora collegato a un iscritto. Chiedi al Comitato di registrare questa email
          nella tua scheda giocatore.
        </Empty>
      </div>
    );
  }

  const me = d.players.find((p) => p.id === viewer.playerId);
  const mine = d.matches
    .filter((m) => m.home_id === viewer.playerId || m.away_id === viewer.playerId)
    .sort((a, b) => (a.week_start ?? "").localeCompare(b.week_start ?? ""));
  const { data: contacts } = await supabase.from("player_contacts").select("player_id, email, phone");
  const contact = new Map((contacts ?? []).map((c) => [c.player_id, c]));
  const { data: reports } = await supabase.from("result_reports").select("*").eq("reported_by", viewer.userId!).order("created_at", { ascending: false }).limit(10);

  return (
    <div className="space-y-6">
      <PageHeader title={`Ciao ${me?.full_name ?? ""}`} subtitle="Le tue partite: organizza con l'avversario su WhatsApp e inserisci il risultato entro 24 ore (art. 4.2, 4.7)." />
      <Flash searchParams={searchParams} />
      {mine.length === 0 && <Empty>Non hai ancora partite in calendario.</Empty>}
      <div className="grid gap-4 md:grid-cols-2">
        {mine.map((m) => {
          const iAmHome = m.home_id === viewer.playerId;
          const oppId = (iAmHome ? m.away_id : m.home_id) ?? "";
          const opp = d.names[oppId] ?? "da definire";
          const c = contact.get(oppId);
          return (
            <div key={m.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-black/50">{PHASE_LABEL[m.phase]}{m.group_code ? ` · girone ${m.group_code} · giornata ${m.round}` : ` · turno ${m.round}`}</div>
                  <div className="mt-1 font-semibold">vs {opp}</div>
                  <div className="text-sm text-black/60">{fmtDate(m.week_start)} – {fmtDate(m.week_end)}</div>
                </div>
                <Badge kind={m.status} />
              </div>
              <p className="mt-2 text-sm">
                {iAmHome ? "Sei il giocatore di casa: proponi le date entro la domenica precedente, prenoti il campo e porti le palline." : `Il giocatore di casa è ${opp}: ti proporrà le date.`}
              </p>
              {c && (c.phone || c.email) && (
                <p className="mt-1 text-sm">
                  Contatti: {c.phone && <a className="underline" href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}>{c.phone}</a>} {c.email && <a className="underline" href={`mailto:${c.email}`}>{c.email}</a>}
                </p>
              )}
              {m.status !== "scheduled" && <p className="mt-2 font-mono text-sm">Risultato (casa-ospite): {scoreText(m)}</p>}
              {m.status !== "confirmed" && m.home_id && m.away_id && (
                <ResultForm matchId={m.id} opponent={opp} bestOfThree={isBestOfThree(m, d)} />
              )}
            </div>
          );
        })}
      </div>

      {reports && reports.length > 0 && (
        <section className="card">
          <h2 className="h2 mb-2">Le tue segnalazioni</h2>
          <ul className="divide-y divide-black/5 text-sm">
            {reports.map((r) => (
              <li key={r.id} className="flex justify-between py-1.5">
                <span>{fmtDate(r.created_at.slice(0, 10))} · {r.sets ? (r.sets as { home: number; away: number }[]).map((s) => `${s.home}-${s.away}`).join(" ") : `${r.home_games}-${r.away_games}`}</span>
                <span className="text-black/60">{r.status === "pending" ? "in attesa" : r.status === "approved" ? "confermata" : "respinta"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

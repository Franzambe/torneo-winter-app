import { generateBrackets, generateF1, generateF2, recomputeDates } from "@/app/admin/actions";
import { Flash, PageHeader } from "@/components/ui";
import { getTournament } from "@/lib/data";

function Step({ n, title, text, action, label, confirmText }: { n: number; title: string; text: string; action: (f: FormData) => Promise<void>; label: string; confirmText?: string }) {
  return (
    <form action={action} className="card space-y-2">
      <div className="text-xs font-semibold uppercase text-club-slate">Passo {n}</div>
      <h2 className="h2">{title}</h2>
      <p className="muted">{text}</p>
      {confirmText && (
        <label className="flex items-center gap-2 text-sm text-amber-800"><input type="checkbox" name="confirm" /> {confirmText}</label>
      )}
      <button className="btn">{label}</button>
    </form>
  );
}

/**
 * Allineamento con il foglio Excel (art. 1.6): in F2_PARTITE la colonna «Inverti casa (X)» indica
 * le partite in cui il giocatore di casa è quello dello Slot B. Lo slot è la posizione nel girone F2
 * secondo la classifica unica di Fase 1, come nel foglio.
 */
function ExcelF2({ d }: { d: Awaited<ReturnType<typeof getTournament>> }) {
  const f2 = d.matches.filter((m) => m.phase === "F2" && m.home_id && m.away_id);
  if (!f2.length) return null;
  const rank = new Map(d.overall.map((r) => [r.player_id, r.overall]));
  const slot = new Map<string, number>();
  for (const g of ["A", "B"]) {
    d.players
      .filter((p) => p.f2_group === g)
      .sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99))
      .forEach((p, i) => slot.set(p.id, i + 1));
  }
  const rows = f2
    .map((m) => {
      const sh = slot.get(m.home_id!) ?? 0;
      const sa = slot.get(m.away_id!) ?? 0;
      return { g: m.group_code ?? "", lo: Math.min(sh, sa), hi: Math.max(sh, sa), round: m.round, invert: sh > sa };
    })
    .filter((r) => r.invert)
    .sort((a, b) => a.g.localeCompare(b.g) || a.lo - b.lo || a.hi - b.hi);
  return (
    <div className="card space-y-2">
      <h2 className="h2">Allinea l&apos;Excel — Fase 2</h2>
      <p className="muted">
        Nel foglio F2_PARTITE cancella tutte le X della colonna «Inverti casa (X)» e scrivi X solo in queste {rows.length} righe
        (Girone, Slot A, Slot B). Così il foglio di gestione ha gli stessi giocatori di casa dell&apos;app.
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm sm:grid-cols-4">
        {rows.map((r) => (
          <span key={`${r.g}-${r.lo}-${r.hi}`}>{r.g} · {r.lo}–{r.hi} <span className="text-black/40">(G{r.round})</span></span>
        ))}
      </div>
      <ExcelF2 d={d} />
    </div>
  );
}

export default async function Fasi({ searchParams }: { searchParams: { msg?: string; err?: string } }) {
  const d = await getTournament();
  const count = (ph: string) => d.matches.filter((m) => m.phase === ph).length;
  return (
    <div className="space-y-5">
      <PageHeader title="Fasi e tabelloni" subtitle="Genera le fasi in ordine. Ogni rigenerazione cancella e ricrea le partite della fase." />
      <Flash searchParams={searchParams} />
      <div className="grid gap-4 md:grid-cols-2">
        <Step n={1} title={`Gironi di Fase 1 (${count("F1")} partite)`} action={generateF1} label="Genera gironi e calendario F1"
          text="Serpentina sul punteggio di seeding (art. 2.2): gironi da 4, eventualmente da 3 (A.1). Crea il girone all'italiana con le settimane di riferimento. Casa/trasferta: mai 3 di fila, 1–2 partite in casa a testa, decide il sorteggio."
          confirmText="Rigenera anche se ci sono già risultati" />
        <Step n={2} title={`Gironi A e B di Fase 2 (${count("F2")} partite)`} action={generateF2} label="Genera gironi e calendario F2"
          text="Metà alta della classifica unica di Fase 1 nel girone A, metà bassa nel girone B (art. 2.4). Le classifiche ripartono da zero. Casa/trasferta: mai 3 di fila, compensando le partite in casa della Fase 1."
          confirmText="Procedi anche se la Fase 1 non è tutta confermata" />
        <Step n={3} title={`Tabelloni Winners e Challenger (${count("W") + count("C")} partite)`} action={generateBrackets} label="Genera tabelloni"
          text={`Winners: primi ${d.settings.winners_size - d.settings.promoted_from_b} di A + primi ${d.settings.promoted_from_b} di B; Challenger: tutti gli altri. I seed vengono congelati (art. 7).`}
          confirmText="Procedi anche se la Fase 2 non è tutta confermata" />
        <Step n={4} title="Ricalcola le date" action={recomputeDates} label="Ricalcola settimane"
          text="Riallinea le settimane di riferimento di tutte le partite al calendario (dopo modifiche a date o formula nelle impostazioni)." />
      </div>
      <ExcelF2 d={d} />
    </div>
  );
}

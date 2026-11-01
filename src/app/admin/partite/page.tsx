import Link from "next/link";
import { saveMatch } from "@/app/admin/actions";
import { Badge, Empty, Flash, PageHeader } from "@/components/ui";
import { getTournament, isBestOfThree } from "@/lib/data";
import { fmtDate, scoreText } from "@/lib/format";

export default async function Partite({ searchParams }: { searchParams: { fase?: string; msg?: string; err?: string } }) {
  const d = await getTournament();
  const fase = ["F1", "F2", "W", "C"].includes(searchParams.fase ?? "") ? searchParams.fase! : "F1";
  const list = d.matches
    .filter((m) => m.phase === fase)
    .sort((a, b) => a.round - b.round || (a.group_code ?? "").localeCompare(b.group_code ?? "") || a.slot - b.slot);

  return (
    <div className="space-y-4">
      <PageHeader title="Partite e risultati" subtitle="Correggi qualsiasi risultato, assegna tavolini (9-0) e doppi tavolini, sposta le settimane. Il tavolino non richiede game." />
      <Flash searchParams={searchParams} />
      <div className="flex flex-wrap gap-2">
        {[["F1", "Fase 1"], ["F2", "Fase 2"], ["W", "Winners"], ["C", "Challenger"]].map(([k, l]) => (
          <Link key={k} href={`?fase=${k}`} className={fase === k ? "btn" : "btn-ghost"}>{l}</Link>
        ))}
      </div>
      {list.length === 0 && <Empty>Nessuna partita in questa fase: generala da «Fasi e tabelloni».</Empty>}
      {list.map((m) => {
        const bo3 = isBestOfThree(m, d);
        const home = d.names[m.home_id ?? ""] ?? "—";
        const away = d.names[m.away_id ?? ""] ?? "—";
        return (
          <details key={m.id} className="card">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm">
              <span><b>{m.group_code ? `${m.group_code} · G${m.round}` : `T${m.round}·${m.slot}`}</b> — {home} <span className="text-black/40">(casa)</span> vs {away}</span>
              <span className="flex items-center gap-2">
                <span className="text-black/50">{fmtDate(m.week_start, false)}</span>
                <span className="font-mono">{scoreText(m)}</span>
                <Badge kind={m.status} />
              </span>
            </summary>
            <form action={saveMatch} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6">
              <input type="hidden" name="id" value={m.id} />
              <div className="col-span-2"><span className="label">Esito</span>
                <select name="result_type" defaultValue={m.result_type ?? ""} className="input">
                  <option value="">— da giocare —</option>
                  <option value="played">giocata</option>
                  <option value="walkover_home">tavolino a favore di {home} (9-0)</option>
                  <option value="walkover_away">tavolino a favore di {away} (9-0)</option>
                  <option value="double_walkover">doppio tavolino (art. 8.1 / 7.5)</option>
                  <option value="annulled">annullata (art. 8.3)</option>
                </select>
              </div>
              {bo3 ? (
                <div className="col-span-2"><span className="label">Set (casa-ospite), es. 6-4 3-6 10-8</span>
                  <input name="sets" defaultValue={m.sets?.map((s) => `${s.home}-${s.away}`).join(" ") ?? ""} className="input font-mono" />
                </div>
              ) : (
                <>
                  <div><span className="label">Game {home}</span><input name="home_games" type="number" min={0} max={9} defaultValue={m.home_games ?? ""} className="input" /></div>
                  <div><span className="label">Game {away}</span><input name="away_games" type="number" min={0} max={9} defaultValue={m.away_games ?? ""} className="input" /></div>
                </>
              )}
              <div><span className="label">Stato</span>
                <select name="status" defaultValue={m.status === "scheduled" ? "confirmed" : m.status} className="input">
                  <option value="confirmed">confermata</option><option value="reported">da confermare</option>
                </select>
              </div>
              {!bo3 && <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="retired" /> ritiro (9-x)</label>}
              <div><span className="label">Settimana dal</span><input name="week_start" type="date" defaultValue={m.week_start ?? ""} className="input" /></div>
              <div><span className="label">al</span><input name="week_end" type="date" defaultValue={m.week_end ?? ""} className="input" /></div>
              <div className="col-span-2 sm:col-span-3"><span className="label">Note</span><input name="notes" defaultValue={m.notes ?? ""} className="input" /></div>
              <div className="col-span-2 flex items-end justify-end sm:col-span-1"><button className="btn w-full">Salva</button></div>
            </form>
          </details>
        );
      })}
    </div>
  );
}

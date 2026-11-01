import { deletePlayer, savePlayer } from "@/app/admin/actions";
import { Flash, PageHeader } from "@/components/ui";
import { getTournament } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { Player } from "@/lib/tournament";

function PlayerForm({ p, contact }: { p?: Player; contact?: { email: string | null; phone: string | null } }) {
  return (
    <form action={savePlayer} className="grid grid-cols-2 gap-2 sm:grid-cols-6">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="col-span-2"><span className="label">Cognome Nome</span><input name="full_name" defaultValue={p?.full_name} className="input" required /></div>
      <div className="col-span-2"><span className="label">Email (per l&apos;accesso)</span><input name="email" type="email" defaultValue={contact?.email ?? ""} className="input" /></div>
      <div><span className="label">Cellulare</span><input name="phone" defaultValue={contact?.phone ?? ""} className="input" /></div>
      <div><span className="label">Stato</span>
        <select name="status" defaultValue={p?.status ?? "active"} className="input">
          <option value="active">attivo</option><option value="withdrawn">ritirato</option><option value="excluded">escluso</option>
        </select>
      </div>
      <div><span className="label">Livello 1-5</span><input name="level" type="number" min={1} max={5} defaultValue={p?.level ?? ""} className="input" /></div>
      <div><span className="label">Classifica FITP</span><input name="fitp_rank" defaultValue={p?.fitp_rank ?? ""} className="input" /></div>
      <div><span className="label">Seeding (art. 2.2)</span><input name="seed_score" type="number" step="0.1" defaultValue={p?.seed_score ?? ""} className="input" /></div>
      <div><span className="label">Girone F1</span><input name="f1_group" maxLength={1} defaultValue={p?.f1_group ?? ""} className="input" /></div>
      <div><span className="label">Girone F2</span><input name="f2_group" maxLength={1} defaultValue={p?.f2_group ?? ""} className="input" /></div>
      <div><span className="label">Sorteggio F1 / F2</span>
        <div className="flex gap-1"><input name="lot_f1" type="number" defaultValue={p?.lot_f1 ?? ""} className="input" /><input name="lot_f2" type="number" defaultValue={p?.lot_f2 ?? ""} className="input" /></div>
      </div>
      <label className="col-span-2 flex items-center gap-2 text-sm sm:col-span-1"><input type="checkbox" name="fee_paid" defaultChecked={p?.fee_paid} /> quota pagata</label>
      <div className="col-span-2 flex items-end justify-end sm:col-span-5"><button className="btn">{p ? "Salva" : "Aggiungi giocatore"}</button></div>
    </form>
  );
}

export default async function Giocatori({ searchParams }: { searchParams: { msg?: string; err?: string } }) {
  const supabase = createClient();
  const d = await getTournament(supabase);
  const { data: contacts } = await supabase.from("player_contacts").select("*");
  const byId = new Map((contacts ?? []).map((c) => [c.player_id, c]));
  const active = d.players.filter((p) => p.status === "active").length;
  return (
    <div className="space-y-5">
      <PageHeader title="Giocatori" subtitle={`${d.players.length} iscritti, ${active} attivi. Ritirati ed esclusi: non cancellarli, cambia lo stato (art. 8.3). «Sorteggio» = ordine manuale per le parità assolute (più alto = meglio).`} />
      <Flash searchParams={searchParams} />
      <section className="card"><h2 className="h2 mb-3">Nuovo giocatore</h2><PlayerForm /></section>
      {d.players.map((p) => (
        <details key={p.id} className="card">
          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
            <span className="font-semibold">{p.full_name}</span>
            <span className="text-xs text-black/55">
              {p.status !== "active" && <b className="text-red-700">{p.status} · </b>}
              seed {p.seed_score ?? "—"} · F1 {p.f1_group ?? "—"} · F2 {p.f2_group ?? "—"} · {p.fee_paid ? "quota ok" : "quota da pagare"} · {byId.get(p.id)?.email ?? "email mancante"}
            </span>
          </summary>
          <div className="mt-3 space-y-3">
            <PlayerForm p={p} contact={byId.get(p.id)} />
            <form action={deletePlayer} className="text-right">
              <input type="hidden" name="id" value={p.id} />
              <button className="text-xs text-red-700 underline">Elimina definitivamente (solo prima del sorteggio)</button>
            </form>
          </div>
        </details>
      ))}
    </div>
  );
}

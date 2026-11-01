import { saveAdminEmail, saveSettings, uploadRules } from "@/app/admin/actions";
import { Flash, PageHeader } from "@/components/ui";
import { getTournament } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function Impostazioni({ searchParams }: { searchParams: { msg?: string; err?: string } }) {
  const supabase = createClient();
  const { settings: s } = await getTournament(supabase);
  const { data: admins } = await supabase.from("admin_emails").select("email").order("email");
  const field = (name: keyof typeof s, label: string, type = "text", note?: string) => (
    <div>
      <span className="label">{label}</span>
      <input name={name} type={type} defaultValue={(s[name] as string | number | null) ?? ""} className="input" />
      {note && <span className="text-[11px] text-black/45">{note}</span>}
    </div>
  );
  return (
    <div className="space-y-5">
      <PageHeader title="Impostazioni del torneo" subtitle="Parametri del regolamento: il calendario e le date chiave si ricalcolano da qui." />
      <Flash searchParams={searchParams} />
      <form action={saveSettings} className="card space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">{field("name", "Nome del torneo")}</div>
          {field("start_date", "Inizio Fase 1 (lunedì)", "date", "art. 3")}
          {field("pause_weeks", "Settimane di pausa natalizia", "number")}
          {field("finals_day", "Finals Day", "date", "art. 3.3")}
          {field("registration_close", "Chiusura iscrizioni", "date", "art. 1.4")}
          {field("f1_groups_publication", "Pubblicazione gironi F1", "date")}
          {field("f2_groups_publication", "Pubblicazione gironi F2", "date")}
          {field("f1_max_group_size", "Giocatori max per girone F1", "number", "4 (A.1)")}
          {field("recovery_weeks_f1", "Settimane recupero F1", "number")}
          {field("recovery_weeks_f2", "Settimane recupero F2", "number")}
          {field("winners_size", "Giocatori nel Winners", "number", "8")}
          {field("promoted_from_b", "Promossi dal girone B", "number", "2")}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="count_reported_results" defaultChecked={s.count_reported_results} />
          I risultati segnalati dai giocatori contano subito in classifica (altrimenti solo dopo la conferma)
        </label>
        <div>
          <span className="label">Regolamento in sintesi (una riga per punto, mostrato in home)</span>
          <textarea name="rules_summary" rows={6} defaultValue={s.rules_summary} className="input" />
        </div>
        <button className="btn">Salva impostazioni</button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        <form action={uploadRules} className="card space-y-3">
          <h2 className="h2">Regolamento PDF</h2>
          <p className="muted">Attuale: <a className="underline" href={s.rules_pdf_url ?? "/docs/regolamento.pdf"} target="_blank">apri</a></p>
          <input type="file" name="file" accept="application/pdf" className="input" />
          <button className="btn">Carica nuova versione</button>
        </form>
        <div className="card space-y-3">
          <h2 className="h2">Admin (Founders)</h2>
          <ul className="text-sm">
            {(admins ?? []).map((a) => (
              <li key={a.email} className="flex items-center justify-between border-b border-black/5 py-1">
                {a.email}
                <form action={saveAdminEmail}><input type="hidden" name="email" value={a.email} /><input type="hidden" name="op" value="remove" /><button className="text-xs text-red-700 underline">rimuovi</button></form>
              </li>
            ))}
          </ul>
          <form action={saveAdminEmail} className="flex gap-2">
            <input name="email" type="email" placeholder="email founder" className="input" required />
            <button className="btn">Aggiungi</button>
          </form>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { loadContacts, STATUS_LABEL, waNumber } from "@/lib/contacts";
import { createClient } from "@/lib/supabase/server";
import { canSeeContacts } from "./access";

export const dynamic = "force-dynamic";

export default async function Contatti() {
  const { viewer, allowed } = await canSeeContacts();
  if (!allowed) {
    return (
      <div className="space-y-4">
        <PageHeader title="Contatti dei partecipanti" />
        <Empty>
          I contatti sono riservati ai partecipanti del torneo. L&apos;email {viewer.email} non corrisponde a nessun iscritto:
          accedi con l&apos;email dell&apos;iscrizione oppure chiedi al Comitato di aggiornarla.
        </Empty>
      </div>
    );
  }
  const rows = await loadContacts(createClient());
  const hasF2 = rows.some((r) => r.f2_group);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contatti dei partecipanti"
        subtitle="Per organizzare le partite (art. 4.2). Riservati ai partecipanti: non condividerli fuori dal torneo."
      >
        <div className="flex flex-wrap gap-2">
          <a href="/contatti/csv" className="btn" download>Scarica Excel (CSV)</a>
          <a href="/contatti/vcard" className="btn-ghost" download>Aggiungi alla rubrica (vCard)</a>
        </div>
      </PageHeader>

      {rows.length === 0 ? (
        <Empty>Nessun contatto disponibile.</Empty>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-black/[0.03] text-left text-xs uppercase tracking-wide text-black/50">
              <tr>
                <th className="px-3 py-2">Giocatore</th>
                <th className="px-3 py-2">Girone F1</th>
                {hasF2 && <th className="px-3 py-2">Girone F2</th>}
                <th className="px-3 py-2">Cellulare</th>
                <th className="px-3 py-2">Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const wa = waNumber(r.phone);
                return (
                  <tr key={r.id} className={`border-t border-black/5 ${r.id === viewer.playerId ? "bg-amber-50" : ""}`}>
                    <td className="px-3 py-2 font-medium">
                      {r.name} {r.status !== "active" && <Badge kind="scheduled" text={STATUS_LABEL[r.status]} />}
                    </td>
                    <td className="px-3 py-2">{r.f1_group ?? "—"}</td>
                    {hasF2 && <td className="px-3 py-2">{r.f2_group ?? "—"}</td>}
                    <td className="whitespace-nowrap px-3 py-2">
                      {r.phone ? (
                        <>
                          <a className="underline" href={`tel:${r.phone.replace(/\s/g, "")}`}>{r.phone}</a>
                          {wa && <a className="ml-2 text-xs font-semibold text-emerald-700 underline" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2">{r.email ? <a className="underline" href={`mailto:${r.email}`}>{r.email}</a> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted text-xs">
        Il file vCard contiene tutti i partecipanti: aprilo dal telefono per importarli in rubrica.
        Dati errati? Scrivi al Comitato. Le tue partite e il giocatore di casa sono nell&apos;<Link className="underline" href="/area-giocatore">Area giocatore</Link>.
      </p>
    </div>
  );
}

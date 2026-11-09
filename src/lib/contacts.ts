/**
 * Contatti dei partecipanti (art. 4.2: servono per organizzare le partite).
 * Visibili solo ai giocatori registrati e agli admin: lo garantisce la policy RLS
 * "contacts read participants" su player_contacts, oltre ai controlli nelle pagine.
 */
import type { createClient } from "@/lib/supabase/server";

export interface ContactRow {
  id: string;
  name: string; // "Cognome Nome", come in anagrafica
  email: string | null;
  phone: string | null;
  f1_group: string | null;
  f2_group: string | null;
  status: "active" | "withdrawn" | "excluded";
}

export const STATUS_LABEL: Record<ContactRow["status"], string> = {
  active: "attivo",
  withdrawn: "ritirato",
  excluded: "escluso",
};

export async function loadContacts(supabase: ReturnType<typeof createClient>): Promise<ContactRow[]> {
  const [p, c] = await Promise.all([
    supabase.from("players").select("id, full_name, f1_group, f2_group, status").order("full_name"),
    supabase.from("player_contacts").select("player_id, email, phone"),
  ]);
  const byId = new Map((c.data ?? []).map((x) => [x.player_id as string, x]));
  return (p.data ?? []).map((x) => ({
    id: x.id,
    name: x.full_name,
    email: byId.get(x.id)?.email ?? null,
    phone: byId.get(x.id)?.phone ?? null,
    f1_group: x.f1_group,
    f2_group: x.f2_group,
    status: x.status,
  }));
}

/** Numero solo cifre per i link wa.me (con prefisso internazionale; senza prefisso si assume +39). */
export function waNumber(phone: string | null): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (trimmed.startsWith("00")) digits = digits.slice(2);
  else if (!trimmed.startsWith("+") && digits.length <= 10) digits = "39" + digits;
  return digits;
}

/** "Cognome Nome" → { first, last }: l'ultima parola è il nome (es. "El Moutaouakkil Sabrine"). */
export function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return { first: full.trim(), last: "" };
  return { first: parts[parts.length - 1], last: parts.slice(0, -1).join(" ") };
}

const csvCell = (v: string | null) => {
  const s = v ?? "";
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV per Excel italiano: separatore ";" e BOM UTF-8 (accenti corretti). */
export function contactsCsv(rows: ContactRow[]): string {
  const head = ["Giocatore", "Email", "Cellulare", "WhatsApp", "Girone F1", "Girone F2", "Stato"];
  const lines = rows.map((r) => {
    const wa = waNumber(r.phone);
    return [r.name, r.email, r.phone, wa ? `https://wa.me/${wa}` : null, r.f1_group, r.f2_group, STATUS_LABEL[r.status]]
      .map(csvCell)
      .join(";");
  });
  return "\uFEFF" + [head.join(";"), ...lines].join("\r\n") + "\r\n";
}

const vEsc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** vCard 3.0 (un file con tutti i contatti): si importa nella rubrica di iPhone, Android e Outlook. */
export function contactsVcard(rows: ContactRow[], org = "Torneo Winter Alumni POLIMI GSoM"): string {
  return rows
    .map((r) => {
      const { first, last } = splitName(r.name);
      const groups = [r.f1_group && `girone F1 ${r.f1_group}`, r.f2_group && `girone F2 ${r.f2_group}`].filter(Boolean).join(", ");
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${vEsc(last)};${vEsc(first)};;;`,
        `FN:${vEsc(`${first} ${last}`.trim())}`,
        `ORG:${vEsc(org)}`,
        "CATEGORIES:Torneo Winter",
      ];
      if (r.phone) lines.push(`TEL;TYPE=CELL:${r.phone.trim()}`);
      if (r.email) lines.push(`EMAIL;TYPE=INTERNET:${r.email.trim()}`);
      if (groups) lines.push(`NOTE:${vEsc(groups)}`);
      lines.push("END:VCARD");
      return lines.join("\r\n");
    })
    .join("\r\n") + "\r\n";
}

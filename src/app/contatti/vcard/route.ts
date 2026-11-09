import { NextResponse } from "next/server";
import { contactsVcard, loadContacts } from "@/lib/contacts";
import { createClient } from "@/lib/supabase/server";
import { canSeeContacts } from "../access";

export const dynamic = "force-dynamic";

export async function GET() {
  const { allowed } = await canSeeContacts();
  if (!allowed) return new NextResponse("Contatti riservati ai partecipanti del torneo.", { status: 403 });
  const rows = await loadContacts(createClient());
  return new NextResponse(contactsVcard(rows), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="contatti-torneo-winter.vcf"',
      "Cache-Control": "private, no-store",
    },
  });
}

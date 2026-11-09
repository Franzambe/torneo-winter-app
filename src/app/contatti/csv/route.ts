import { NextResponse } from "next/server";
import { contactsCsv, loadContacts } from "@/lib/contacts";
import { createClient } from "@/lib/supabase/server";
import { canSeeContacts } from "../access";

export const dynamic = "force-dynamic";

export async function GET() {
  const { allowed } = await canSeeContacts();
  if (!allowed) return new NextResponse("Contatti riservati ai partecipanti del torneo.", { status: 403 });
  const rows = await loadContacts(createClient());
  return new NextResponse(contactsCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="contatti-torneo-winter.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}

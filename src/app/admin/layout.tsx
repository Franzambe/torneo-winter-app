import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const TABS = [
  ["/admin", "Panoramica"],
  ["/admin/giocatori", "Giocatori"],
  ["/admin/fasi", "Fasi e tabelloni"],
  ["/admin/partite", "Partite e risultati"],
  ["/admin/segnalazioni", "Segnalazioni"],
  ["/admin/impostazioni", "Impostazioni"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin(); // doppio controllo oltre al middleware e alle policy RLS
  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2 border-b border-black/10 pb-3">
        <span className="mr-2 rounded bg-amber-300 px-2 py-1 text-xs font-bold uppercase">Admin</span>
        {TABS.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-md px-2 py-1 text-sm hover:bg-white">{label}</Link>
        ))}
      </div>
      {children}
    </div>
  );
}

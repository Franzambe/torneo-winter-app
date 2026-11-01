import Image from "next/image";
import Link from "next/link";
import type { Viewer } from "@/lib/auth";

const LINKS = [
  ["/", "Home"],
  ["/classifiche", "Classifiche"],
  ["/calendario", "Calendario"],
  ["/tabelloni", "Tabelloni"],
  ["/download", "Download"],
] as const;

export function Nav({ viewer }: { viewer: Viewer }) {
  return (
    <header className="bg-club-black text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.jpg" alt="Tennis Alumni Club POLIMI GSoM" width={150} height={46} className="h-9 w-auto rounded-sm" priority />
          <span className="hidden text-sm font-semibold sm:inline">Torneo Winter 2026/27</span>
        </Link>
        <nav className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-sm">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="text-white/80 hover:text-white">{label}</Link>
          ))}
          {viewer.userId && <Link href="/area-giocatore" className="text-white/80 hover:text-white">Area giocatore</Link>}
          {viewer.role === "admin" && <Link href="/admin" className="font-semibold text-amber-300 hover:text-amber-200">Admin</Link>}
        </nav>
        {viewer.userId ? (
          <form action="/auth/signout" method="post" className="flex items-center gap-3 text-xs text-white/70">
            <span className="hidden md:inline">{viewer.email}</span>
            <button className="rounded-md border border-white/30 px-2 py-1 hover:bg-white/10">Esci</button>
          </form>
        ) : (
          <Link href="/login" className="rounded-md border border-white/30 px-3 py-1 text-sm hover:bg-white/10">Accedi</Link>
        )}
      </div>
    </header>
  );
}

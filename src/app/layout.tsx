import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Torneo Winter · Tennis Alumni Club POLIMI GSoM",
  description: "Classifiche, calendario e tabelloni del 1° Torneo Winter Alumni POLIMI GSoM",
};

export const dynamic = "force-dynamic"; // dati sempre aggiornati

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  return (
    <html lang="it">
      <body className="min-h-screen">
        <Nav viewer={viewer} />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-black/45">
          Tennis Alumni Club POLIMI Graduate School of Management · Regolamento ufficiale v4
        </footer>
      </body>
    </html>
  );
}

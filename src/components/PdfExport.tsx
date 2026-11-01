"use client";

import { useState } from "react";

export interface PdfTable {
  title: string;
  head: string[];
  body: (string | number)[][];
}

async function logoDataUrl(): Promise<string | null> {
  try {
    const blob = await (await fetch("/logo.jpg")).blob();
    return await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Genera nel browser un PDF aggiornato (calendario o classifiche) con il logo del club. */
export function PdfExport({ label, filename, title, subtitle, tables, landscape = false }: {
  label: string;
  filename: string;
  title: string;
  subtitle: string;
  tables: PdfTable[];
  landscape?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "mm", format: "a4" });
      const width = doc.internal.pageSize.getWidth();
      const logo = await logoDataUrl();
      if (logo) doc.addImage(logo, "JPEG", 14, 10, 60, 18);
      doc.setFontSize(15);
      doc.text(title, 14, 36);
      doc.setFontSize(9);
      doc.setTextColor(110);
      doc.text(subtitle, 14, 42);
      doc.setTextColor(0);
      let y = 48;
      for (const t of tables) {
        if (y > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage();
          y = 16;
        }
        doc.setFontSize(11);
        doc.text(t.title, 14, y);
        autoTable(doc, {
          head: [t.head],
          body: t.body,
          startY: y + 2,
          styles: { fontSize: 8, cellPadding: 1.5 },
          headStyles: { fillColor: [31, 31, 31] },
          alternateRowStyles: { fillColor: [232, 236, 241] },
          margin: { left: 14, right: 14 },
          tableWidth: width - 28,
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      }
      doc.save(filename);
    } finally {
      setBusy(false);
    }
  }
  return (
    <button className="btn" onClick={run} disabled={busy}>
      {busy ? "Generazione…" : label}
    </button>
  );
}

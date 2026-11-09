import { describe, expect, it } from "vitest";
import { contactsCsv, contactsVcard, splitName, waNumber, type ContactRow } from "../../contacts";

const rows: ContactRow[] = [
  { id: "1", name: "El Moutaouakkil Sabrine", email: "s@x.it", phone: "+39 375 627 9201", f1_group: "A", f2_group: null, status: "active" },
  { id: "2", name: "Kostanišek Katrin", email: null, phone: "+38630399660", f1_group: "A", f2_group: "B", status: "withdrawn" },
];

describe("contatti", () => {
  it("numero WhatsApp", () => {
    expect(waNumber("+39 333 121 1093")).toBe("393331211093");
    expect(waNumber("333 121 1093")).toBe("393331211093");
    expect(waNumber("0038630399660")).toBe("38630399660");
    expect(waNumber(null)).toBeNull();
  });
  it("nome e cognome da 'Cognome Nome'", () => {
    expect(splitName("El Moutaouakkil Sabrine")).toEqual({ first: "Sabrine", last: "El Moutaouakkil" });
  });
  it("CSV per Excel: BOM, separatore ;, accenti", () => {
    const csv = contactsCsv(rows);
    expect(csv.startsWith("﻿Giocatore;Email;Cellulare")).toBe(true);
    expect(csv).toContain("Kostanišek Katrin;;+38630399660;https://wa.me/38630399660;A;B;ritirato");
  });
  it("vCard 3.0", () => {
    const v = contactsVcard(rows);
    expect(v.match(/BEGIN:VCARD/g)).toHaveLength(2);
    expect(v).toContain("N:El Moutaouakkil;Sabrine;;;\r\nFN:Sabrine El Moutaouakkil");
    expect(v).toContain("TEL;TYPE=CELL:+39 375 627 9201");
    expect(v).toContain("NOTE:girone F1 A\\, girone F2 B");
  });
});

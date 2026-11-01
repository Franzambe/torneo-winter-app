-- =====================================================================
-- Dati iniziali — eseguire dopo schema.sql
-- =====================================================================

-- Impostazioni del regolamento v4 (valori di default della tabella)
insert into public.settings (id, rules_summary) values (1,
'16 giocatori · 3 fasi · dal 23 novembre 2026 al Finals Day del 17–18 aprile 2027
Fase 1: 4 gironi da 4 (23/11 – 20/12) · Pausa natalizia (21/12 – 10/01)
Fase 2: girone A (1°–8° della Fase 1) e girone B (9°–16°) (11/01 – 07/03)
Fase finale (15/03 – 04/04): Winners (primi 6 di A + primi 2 di B) e Challenger (tutti gli altri)
Set unico a 9 game · killer point · tie-break sull''8-8 · massimo 60 minuti, riscaldamento compreso')
on conflict (id) do nothing;

-- Email dei Founders: SOSTITUIRE con quelle reali prima del primo accesso
insert into public.admin_emails (email) values
  ('marco.vigini67@gmail.com'),
  ('raffaella.galiano@gsom.polimi.it'),
  ('maura.mormile@gsom.polimi.it'),
  ('tommaso.piraldi@gsom.polimi.it'),
  ('francesco.zambelli@gsom.polimi.it')
on conflict do nothing;

-- Iscritti confermati (quota pagata). Email e telefono si aggiungono dall'area admin.
insert into public.players (full_name, fee_paid) values
  ('Bodini Niccolò', true),
  ('Saccoccia Francesca', true),
  ('Rizzi Gianluca', true),
  ('Rota Alessandro', true),
  ('Alessandra Mario', true),
  ('Lopomarda Sara', true),
  ('Megnani Alessandro', true),
  ('Marincola Marco', true),
  ('El Moutaouakkil Sabrine', true),
  ('Ciaglia Riccardo', true),
  ('Meneghelli Andrea', true);

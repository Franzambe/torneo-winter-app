-- =====================================================================
-- Fase 1 — ribilanciamento casa/trasferta (art. 4.1, 4.6)
-- Eseguire una volta in Supabase › SQL Editor. Si può rieseguire senza danni.
--
-- Cosa fa:
--   1. corregge il cognome «Lopomarda» in «Lapomarda»;
--   2. assegna chi gioca in casa nelle 24 partite di Fase 1, SENZA cambiare
--      accoppiamenti, giornate e settimane. Tocca solo le partite non ancora giocate.
--
-- Regole: nessuno gioca 3 partite di fila in casa o in trasferta; in ogni girone
-- due giocatori hanno 2 partite in casa e due ne hanno 1. Chi ne ha 2 è stato
-- sorteggiato (generatore crittografico, 2026-11-09 19:11 UTC):
--   Girone A: Kostanišek Katrin, Bodini Niccolò
--   Girone B: Catalani Vito, Saccoccia Francesca
--   Girone C: Diotti Stefano, Rizzi Gianluca
--   Girone D: Dragomir Vlad, Rota Alessandro
-- In Fase 2 l'app compensa: chi ha giocato 2 partite in casa in F1 ne gioca meno in F2.
--
-- Sequenze risultanti (C = casa, T = trasferta; giornate 1-2-3):
--   Bodini Niccolò             CTC  (2/3 in casa)
--   Kostanišek Katrin          TCC  (2/3 in casa)
--   Marincola Marco            CTT  (1/3 in casa)
--   El Moutaouakkil Sabrine    TCT  (1/3 in casa)
--   Saccoccia Francesca        CTC  (2/3 in casa)
--   Catalani Vito              TCC  (2/3 in casa)
--   Legnani Alessandro         CTT  (1/3 in casa)
--   Ciaglia Riccardo           TCT  (1/3 in casa)
--   Rizzi Gianluca             CTC  (2/3 in casa)
--   Diotti Stefano             TCC  (2/3 in casa)
--   Lapomarda Sara             CTT  (1/3 in casa)
--   Meneghelli Andrea          TCT  (1/3 in casa)
--   Rota Alessandro            CTC  (2/3 in casa)
--   Monestier Benedetta        TCT  (1/3 in casa)
--   Alessandra Mario           CTT  (1/3 in casa)
--   Dragomir Vlad              TCC  (2/3 in casa)
-- =====================================================================

update public.players set full_name = 'Lapomarda Sara' where full_name = 'Lopomarda Sara';

with m(group_code, round, slot, home, away) as (values
  ('A', 1, 1, 'Bodini Niccolò', 'Kostanišek Katrin'),
  ('A', 1, 2, 'Marincola Marco', 'El Moutaouakkil Sabrine'),
  ('A', 2, 3, 'El Moutaouakkil Sabrine', 'Bodini Niccolò'),
  ('A', 2, 4, 'Kostanišek Katrin', 'Marincola Marco'),
  ('A', 3, 5, 'Bodini Niccolò', 'Marincola Marco'),
  ('A', 3, 6, 'Kostanišek Katrin', 'El Moutaouakkil Sabrine'),
  ('B', 1, 1, 'Saccoccia Francesca', 'Catalani Vito'),
  ('B', 1, 2, 'Legnani Alessandro', 'Ciaglia Riccardo'),
  ('B', 2, 3, 'Ciaglia Riccardo', 'Saccoccia Francesca'),
  ('B', 2, 4, 'Catalani Vito', 'Legnani Alessandro'),
  ('B', 3, 5, 'Saccoccia Francesca', 'Legnani Alessandro'),
  ('B', 3, 6, 'Catalani Vito', 'Ciaglia Riccardo'),
  ('C', 1, 1, 'Rizzi Gianluca', 'Diotti Stefano'),
  ('C', 1, 2, 'Lapomarda Sara', 'Meneghelli Andrea'),
  ('C', 2, 3, 'Meneghelli Andrea', 'Rizzi Gianluca'),
  ('C', 2, 4, 'Diotti Stefano', 'Lapomarda Sara'),
  ('C', 3, 5, 'Rizzi Gianluca', 'Lapomarda Sara'),
  ('C', 3, 6, 'Diotti Stefano', 'Meneghelli Andrea'),
  ('D', 1, 1, 'Rota Alessandro', 'Monestier Benedetta'),
  ('D', 1, 2, 'Alessandra Mario', 'Dragomir Vlad'),
  ('D', 2, 3, 'Dragomir Vlad', 'Rota Alessandro'),
  ('D', 2, 4, 'Monestier Benedetta', 'Alessandra Mario'),
  ('D', 3, 5, 'Rota Alessandro', 'Alessandra Mario'),
  ('D', 3, 6, 'Dragomir Vlad', 'Monestier Benedetta')
)
update public.matches x set
  home_id = h.id,
  away_id = a.id,
  updated_at = now()
from m
join public.players h on h.full_name = m.home
join public.players a on a.full_name = m.away
where x.phase = 'F1' and x.group_code = m.group_code and x.round = m.round and x.slot = m.slot
  and x.status = 'scheduled'
  and (x.home_id is distinct from h.id or x.away_id is distinct from a.id);

-- ---------- Verifica: partite in casa per giocatore (atteso 1 o 2, totale 24) ----------
select p.full_name, p.f1_group as girone,
       count(*) filter (where x.home_id = p.id) as in_casa,
       count(*) filter (where x.away_id = p.id) as in_trasferta,
       string_agg(case when x.home_id = p.id then 'C' else 'T' end, '' order by x.round) as sequenza
from public.players p
join public.matches x on x.phase = 'F1' and p.id in (x.home_id, x.away_id)
group by p.full_name, p.f1_group
order by p.f1_group, p.full_name;

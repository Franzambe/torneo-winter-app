-- =====================================================================
-- Torneo Winter · correzione accessi + import dati dal file Excel v4
-- Eseguire UNA volta in Supabase › SQL Editor (è ripetibile senza danni).
-- 1) admin: promuove gli utenti già registrati con email in admin_emails
-- 2) 16 iscritti con email, cellulare, livello e girone di Fase 1
-- 3) 24 partite di Fase 1 con le settimane di riferimento
-- =====================================================================

-- ---------- 1. Admin e collegamenti automatici ----------
insert into public.admin_emails (email) values
  ('francesco.zambelli@gsom.polimi.it'),
  ('marco.vigini67@gmail.com'),
  ('raffaella.galiano@gsom.polimi.it'),
  ('maura.mormile@gsom.polimi.it'),
  ('tommaso.piraldi@gsom.polimi.it')
on conflict do nothing;
delete from public.admin_emails where email like 'founder%@example.com';

-- profili mancanti per utenti registrati prima dei trigger
insert into public.profiles (id, email, role)
select u.id, lower(u.email), 'player' from auth.users u
on conflict (id) do nothing;

-- ruolo sempre allineato alla tabella admin_emails (anche in futuro)
create or replace function public.sync_admin_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles p set role = case when exists (
    select 1 from public.admin_emails a where lower(a.email) = lower(p.email)) then 'admin' else 'player' end;
  return null;
end $$;
drop trigger if exists on_admin_emails_change on public.admin_emails;
create trigger on_admin_emails_change after insert or update or delete on public.admin_emails
  for each statement execute function public.sync_admin_role();

update public.profiles p set role = case when exists (
  select 1 from public.admin_emails a where lower(a.email) = lower(p.email)) then 'admin' else 'player' end;

-- ---------- 2. Iscritti ----------
update public.players set full_name = 'Legnani Alessandro' where full_name = 'Megnani Alessandro';

with data(full_name, level, fitp_rank, seed_score, f1_group, fee_paid, status, email, phone) as (values
  ('Bodini Niccolò', 1, null, null, 'A', true, 'active', 'nico.bodini@gmail.com', '+39 333 121 1093'),
  ('Saccoccia Francesca', 2, null, null, 'B', true, 'active', 'francesca.saccoccia@gmail.com', '+39 348 971 0527'),
  ('Rizzi Gianluca', 2, null, null, 'C', true, 'active', 'gianlurizzi@gmail.com', '+39 373 752 7441'),
  ('Rota Alessandro', 3, null, null, 'D', true, 'active', 'studio@alessandrorota.com', '+39 349 391 7815'),
  ('Alessandra Mario', 4, null, null, 'D', true, 'active', 'mario@bronco-capital.com', '+39 340 715 1990'),
  ('Lapomarda Sara', 3, null, null, 'C', true, 'active', 'sara.lapo9@gmail.com', '+39 349 817 0006'),
  ('Legnani Alessandro', 1, null, null, 'B', true, 'active', 'alessandro.legnani72@gmail.com', '+39 338 663 0539'),
  ('Marincola Marco', 2, null, null, 'A', true, 'active', 'marco.marincola@gmail.com', '+39 335 841 2753'),
  ('El Moutaouakkil Sabrine', 4, null, null, 'A', true, 'active', 'sabrine.elmoutaouakkil@gsom.polimi.it', '+39 375 627 9201'),
  ('Ciaglia Riccardo', 1, '4.4', null, 'B', true, 'active', 'riccardo.ciaglia@gmail.com', '+39 331 431 8046'),
  ('Meneghelli Andrea', 3, null, null, 'C', true, 'active', 'andreameneg@gmail.com', '+39 329 604 1101'),
  ('Dragomir Vlad', 4, null, null, 'D', true, 'active', 'vladdragomir86935@gmail.com', '+39 388 127 0406'),
  ('Monestier Benedetta', 2, null, null, 'D', true, 'active', 'benedetta.f.monestier@gmail.com', '+39 339 404 1576'),
  ('Diotti Stefano', 1, '3.4', null, 'C', true, 'active', 'stefano.diotti@gmail.com', '+39 342 835 4574'),
  ('Catalani Vito', 3, null, null, 'B', true, 'active', 'vito_catalani@hotmail.com', '+39 340 666 8856'),
  ('Kostanišek Katrin', 1, null, null, 'A', true, 'active', 'katrin.kostanjsek@gmail.com', '+38630399660')
)
insert into public.players (full_name, level, fitp_rank, seed_score, f1_group, fee_paid, status)
select d.full_name, d.level::int, d.fitp_rank::text, d.seed_score::numeric, d.f1_group::text, d.fee_paid::boolean, d.status::text from data d
where not exists (select 1 from public.players p where p.full_name = d.full_name);

with data(full_name, level, fitp_rank, seed_score, f1_group, fee_paid, status, email, phone) as (values
  ('Bodini Niccolò', 1, null, null, 'A', true, 'active', 'nico.bodini@gmail.com', '+39 333 121 1093'),
  ('Saccoccia Francesca', 2, null, null, 'B', true, 'active', 'francesca.saccoccia@gmail.com', '+39 348 971 0527'),
  ('Rizzi Gianluca', 2, null, null, 'C', true, 'active', 'gianlurizzi@gmail.com', '+39 373 752 7441'),
  ('Rota Alessandro', 3, null, null, 'D', true, 'active', 'studio@alessandrorota.com', '+39 349 391 7815'),
  ('Alessandra Mario', 4, null, null, 'D', true, 'active', 'mario@bronco-capital.com', '+39 340 715 1990'),
  ('Lapomarda Sara', 3, null, null, 'C', true, 'active', 'sara.lapo9@gmail.com', '+39 349 817 0006'),
  ('Legnani Alessandro', 1, null, null, 'B', true, 'active', 'alessandro.legnani72@gmail.com', '+39 338 663 0539'),
  ('Marincola Marco', 2, null, null, 'A', true, 'active', 'marco.marincola@gmail.com', '+39 335 841 2753'),
  ('El Moutaouakkil Sabrine', 4, null, null, 'A', true, 'active', 'sabrine.elmoutaouakkil@gsom.polimi.it', '+39 375 627 9201'),
  ('Ciaglia Riccardo', 1, '4.4', null, 'B', true, 'active', 'riccardo.ciaglia@gmail.com', '+39 331 431 8046'),
  ('Meneghelli Andrea', 3, null, null, 'C', true, 'active', 'andreameneg@gmail.com', '+39 329 604 1101'),
  ('Dragomir Vlad', 4, null, null, 'D', true, 'active', 'vladdragomir86935@gmail.com', '+39 388 127 0406'),
  ('Monestier Benedetta', 2, null, null, 'D', true, 'active', 'benedetta.f.monestier@gmail.com', '+39 339 404 1576'),
  ('Diotti Stefano', 1, '3.4', null, 'C', true, 'active', 'stefano.diotti@gmail.com', '+39 342 835 4574'),
  ('Catalani Vito', 3, null, null, 'B', true, 'active', 'vito_catalani@hotmail.com', '+39 340 666 8856'),
  ('Kostanišek Katrin', 1, null, null, 'A', true, 'active', 'katrin.kostanjsek@gmail.com', '+38630399660')
)
update public.players p set level = d.level::int, fitp_rank = d.fitp_rank::text, seed_score = d.seed_score::numeric,
  f1_group = d.f1_group::text, fee_paid = d.fee_paid::boolean, status = d.status::text
from data d where p.full_name = d.full_name;

with data(full_name, level, fitp_rank, seed_score, f1_group, fee_paid, status, email, phone) as (values
  ('Bodini Niccolò', 1, null, null, 'A', true, 'active', 'nico.bodini@gmail.com', '+39 333 121 1093'),
  ('Saccoccia Francesca', 2, null, null, 'B', true, 'active', 'francesca.saccoccia@gmail.com', '+39 348 971 0527'),
  ('Rizzi Gianluca', 2, null, null, 'C', true, 'active', 'gianlurizzi@gmail.com', '+39 373 752 7441'),
  ('Rota Alessandro', 3, null, null, 'D', true, 'active', 'studio@alessandrorota.com', '+39 349 391 7815'),
  ('Alessandra Mario', 4, null, null, 'D', true, 'active', 'mario@bronco-capital.com', '+39 340 715 1990'),
  ('Lapomarda Sara', 3, null, null, 'C', true, 'active', 'sara.lapo9@gmail.com', '+39 349 817 0006'),
  ('Legnani Alessandro', 1, null, null, 'B', true, 'active', 'alessandro.legnani72@gmail.com', '+39 338 663 0539'),
  ('Marincola Marco', 2, null, null, 'A', true, 'active', 'marco.marincola@gmail.com', '+39 335 841 2753'),
  ('El Moutaouakkil Sabrine', 4, null, null, 'A', true, 'active', 'sabrine.elmoutaouakkil@gsom.polimi.it', '+39 375 627 9201'),
  ('Ciaglia Riccardo', 1, '4.4', null, 'B', true, 'active', 'riccardo.ciaglia@gmail.com', '+39 331 431 8046'),
  ('Meneghelli Andrea', 3, null, null, 'C', true, 'active', 'andreameneg@gmail.com', '+39 329 604 1101'),
  ('Dragomir Vlad', 4, null, null, 'D', true, 'active', 'vladdragomir86935@gmail.com', '+39 388 127 0406'),
  ('Monestier Benedetta', 2, null, null, 'D', true, 'active', 'benedetta.f.monestier@gmail.com', '+39 339 404 1576'),
  ('Diotti Stefano', 1, '3.4', null, 'C', true, 'active', 'stefano.diotti@gmail.com', '+39 342 835 4574'),
  ('Catalani Vito', 3, null, null, 'B', true, 'active', 'vito_catalani@hotmail.com', '+39 340 666 8856'),
  ('Kostanišek Katrin', 1, null, null, 'A', true, 'active', 'katrin.kostanjsek@gmail.com', '+38630399660')
)
insert into public.player_contacts (player_id, email, phone)
select p.id, d.email::text, d.phone::text from data d join public.players p on p.full_name = d.full_name
on conflict (player_id) do update set email = excluded.email, phone = excluded.phone;

-- collega i giocatori che si erano già registrati
update public.profiles pr set player_id = c.player_id
from public.player_contacts c where lower(c.email) = lower(pr.email);

-- ---------- 3. Partite di Fase 1 (casa/trasferta ribilanciate, vedi f1_casa_trasferta.sql) ----------
delete from public.matches where phase = 'F1' and status = 'scheduled';

with m(group_code, round, slot, home, away, week_start, week_end) as (values
  ('A', 1, 1, 'Bodini Niccolò', 'Kostanišek Katrin', '2026-11-23', '2026-11-29'),
  ('A', 1, 2, 'Marincola Marco', 'El Moutaouakkil Sabrine', '2026-11-23', '2026-11-29'),
  ('A', 2, 3, 'El Moutaouakkil Sabrine', 'Bodini Niccolò', '2026-11-30', '2026-12-06'),
  ('A', 2, 4, 'Kostanišek Katrin', 'Marincola Marco', '2026-11-30', '2026-12-06'),
  ('A', 3, 5, 'Bodini Niccolò', 'Marincola Marco', '2026-12-07', '2026-12-13'),
  ('A', 3, 6, 'Kostanišek Katrin', 'El Moutaouakkil Sabrine', '2026-12-07', '2026-12-13'),
  ('B', 1, 1, 'Saccoccia Francesca', 'Catalani Vito', '2026-11-23', '2026-11-29'),
  ('B', 1, 2, 'Legnani Alessandro', 'Ciaglia Riccardo', '2026-11-23', '2026-11-29'),
  ('B', 2, 3, 'Ciaglia Riccardo', 'Saccoccia Francesca', '2026-11-30', '2026-12-06'),
  ('B', 2, 4, 'Catalani Vito', 'Legnani Alessandro', '2026-11-30', '2026-12-06'),
  ('B', 3, 5, 'Saccoccia Francesca', 'Legnani Alessandro', '2026-12-07', '2026-12-13'),
  ('B', 3, 6, 'Catalani Vito', 'Ciaglia Riccardo', '2026-12-07', '2026-12-13'),
  ('C', 1, 1, 'Rizzi Gianluca', 'Diotti Stefano', '2026-11-23', '2026-11-29'),
  ('C', 1, 2, 'Lapomarda Sara', 'Meneghelli Andrea', '2026-11-23', '2026-11-29'),
  ('C', 2, 3, 'Meneghelli Andrea', 'Rizzi Gianluca', '2026-11-30', '2026-12-06'),
  ('C', 2, 4, 'Diotti Stefano', 'Lapomarda Sara', '2026-11-30', '2026-12-06'),
  ('C', 3, 5, 'Rizzi Gianluca', 'Lapomarda Sara', '2026-12-07', '2026-12-13'),
  ('C', 3, 6, 'Diotti Stefano', 'Meneghelli Andrea', '2026-12-07', '2026-12-13'),
  ('D', 1, 1, 'Rota Alessandro', 'Monestier Benedetta', '2026-11-23', '2026-11-29'),
  ('D', 1, 2, 'Alessandra Mario', 'Dragomir Vlad', '2026-11-23', '2026-11-29'),
  ('D', 2, 3, 'Dragomir Vlad', 'Rota Alessandro', '2026-11-30', '2026-12-06'),
  ('D', 2, 4, 'Monestier Benedetta', 'Alessandra Mario', '2026-11-30', '2026-12-06'),
  ('D', 3, 5, 'Rota Alessandro', 'Alessandra Mario', '2026-12-07', '2026-12-13'),
  ('D', 3, 6, 'Dragomir Vlad', 'Monestier Benedetta', '2026-12-07', '2026-12-13')
)
insert into public.matches (phase, group_code, round, slot, home_id, away_id, week_start, week_end, status)
select 'F1', m.group_code, m.round, m.slot, h.id, a.id, m.week_start::date, m.week_end::date, 'scheduled'
from m join public.players h on h.full_name = m.home join public.players a on a.full_name = m.away
where not exists (select 1 from public.matches x where x.phase = 'F1' and x.group_code = m.group_code and x.round = m.round and x.slot = m.slot);

-- ---------- Verifica ----------
select 'giocatori' as cosa, count(*)::text as valore from public.players
union all select 'con email', count(*)::text from public.player_contacts where email is not null
union all select 'partite F1', count(*)::text from public.matches where phase = 'F1'
union all select 'admin registrati', string_agg(email, ', ') from public.profiles where role = 'admin';

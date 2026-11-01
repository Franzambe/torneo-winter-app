-- =====================================================================
-- Torneo Winter Alumni POLIMI GSoM — schema Supabase (Postgres)
-- Eseguire una volta in Supabase › SQL Editor, poi seed.sql
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Impostazioni (riga unica, modificabile solo dagli admin) ----------
create table if not exists public.settings (
  id                      int primary key default 1 check (id = 1),
  name                    text not null default '1° Torneo Winter Alumni POLIMI GSoM',
  start_date              date not null default '2026-11-23',
  pause_weeks             int  not null default 3,
  f1_max_group_size       int  not null default 4,
  recovery_weeks_f1       int  not null default 1,
  recovery_weeks_f2       int  not null default 1,
  winners_size            int  not null default 8,
  promoted_from_b         int  not null default 2,
  finals_day              date default '2027-04-17',
  registration_close      date default '2026-11-08',
  f1_groups_publication   date default '2026-11-15',
  f2_groups_publication   date default '2027-01-03',
  count_reported_results  boolean not null default true,
  rules_summary           text not null default '',
  rules_pdf_url           text,
  updated_at              timestamptz not null default now()
);

-- ---------- Giocatori (dati pubblici) ----------
create table if not exists public.players (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  level       int check (level between 1 and 5),
  fitp_rank   text,
  seed_score  numeric,
  status      text not null default 'active' check (status in ('active','withdrawn','excluded')),
  fee_paid    boolean not null default false,
  f1_group    text check (f1_group ~ '^[A-H]$'),
  f2_group    text check (f2_group in ('A','B')),
  lot_f1      int,
  lot_f2      int,
  created_at  timestamptz not null default now()
);

-- ---------- Contatti (visibili solo ai partecipanti loggati e agli admin) ----------
create table if not exists public.player_contacts (
  player_id  uuid primary key references public.players(id) on delete cascade,
  email      text unique,
  phone      text
);

-- ---------- Email dei Founders (diventano admin al primo accesso) ----------
create table if not exists public.admin_emails (
  email text primary key
);

-- ---------- Profili utente (1:1 con auth.users) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  role       text not null default 'player' check (role in ('admin','player')),
  player_id  uuid references public.players(id) on delete set null
);

-- ---------- Partite ----------
create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  phase         text not null check (phase in ('F1','F2','W','C')),
  group_code    text,
  round         int  not null,
  slot          int  not null default 1,
  home_id       uuid references public.players(id) on delete set null,
  away_id       uuid references public.players(id) on delete set null,
  home_games    int check (home_games between 0 and 9),
  away_games    int check (away_games between 0 and 9),
  sets          jsonb,
  result_type   text check (result_type in ('played','walkover_home','walkover_away','double_walkover','annulled')),
  status        text not null default 'scheduled' check (status in ('scheduled','reported','confirmed')),
  week_start    date,
  week_end      date,
  notes         text,
  reported_by   uuid references auth.users(id),
  reported_at   timestamptz,
  confirmed_by  uuid references auth.users(id),
  confirmed_at  timestamptz,
  updated_at    timestamptz not null default now()
);
create unique index if not exists matches_position_uq on public.matches (phase, coalesce(group_code,''), round, slot);

-- ---------- Seed congelati dei tabelloni (art. 7) ----------
create table if not exists public.bracket_seeds (
  phase      text not null check (phase in ('W','C')),
  seed       int  not null,
  player_id  uuid references public.players(id) on delete set null,
  primary key (phase, seed)
);

-- ---------- Segnalazioni di risultato dei giocatori (art. 4.7) ----------
create table if not exists public.result_reports (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references public.matches(id) on delete cascade,
  reported_by  uuid not null references auth.users(id) default auth.uid(),
  home_games   int check (home_games between 0 and 9),
  away_games   int check (away_games between 0 and 9),
  sets         jsonb,
  retired      boolean not null default false,
  note         text,
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at   timestamptz not null default now(),
  reviewed_by  uuid references auth.users(id),
  reviewed_at  timestamptz
);

-- =====================================================================
-- Funzioni di supporto
-- =====================================================================
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_player_id() returns uuid
language sql stable security definer set search_path = public as $$
  select player_id from public.profiles where id = auth.uid();
$$;

-- Nuovo utente: crea il profilo, lo collega al giocatore con la stessa email, admin se Founder
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role, player_id)
  values (
    new.id,
    lower(new.email),
    case when exists (select 1 from public.admin_emails a where lower(a.email) = lower(new.email)) then 'admin' else 'player' end,
    (select c.player_id from public.player_contacts c where lower(c.email) = lower(new.email) limit 1)
  )
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Email aggiunta/modificata dopo la registrazione: ricollega il profilo
create or replace function public.link_contact_to_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set player_id = new.player_id where lower(email) = lower(new.email);
  return new;
end $$;
drop trigger if exists on_contact_change on public.player_contacts;
create trigger on_contact_change after insert or update of email on public.player_contacts
  for each row execute function public.link_contact_to_profile();

-- Segnalazione di un giocatore: il risultato entra subito nella partita come "reported" (art. 4.7)
create or replace function public.apply_report() returns trigger
language plpgsql security definer set search_path = public as $$
declare m public.matches;
begin
  select * into m from public.matches where id = new.match_id;
  if m.status = 'confirmed' then
    raise exception 'Risultato già confermato dal Comitato';
  end if;
  update public.matches set
    home_games  = new.home_games,
    away_games  = new.away_games,
    sets        = new.sets,
    result_type = 'played',
    status      = 'reported',
    reported_by = new.reported_by,
    reported_at = now(),
    notes       = coalesce(new.note, notes),
    updated_at  = now()
  where id = new.match_id;
  return new;
end $$;
drop trigger if exists on_report_insert on public.result_reports;
create trigger on_report_insert after insert on public.result_reports
  for each row execute function public.apply_report();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.settings        enable row level security;
alter table public.players         enable row level security;
alter table public.player_contacts enable row level security;
alter table public.admin_emails    enable row level security;
alter table public.profiles        enable row level security;
alter table public.matches         enable row level security;
alter table public.bracket_seeds   enable row level security;
alter table public.result_reports  enable row level security;

-- lettura pubblica: impostazioni, giocatori, partite, seed
create policy "settings read"  on public.settings      for select using (true);
create policy "players read"   on public.players       for select using (true);
create policy "matches read"   on public.matches       for select using (true);
create policy "seeds read"     on public.bracket_seeds for select using (true);

-- scrittura solo admin
create policy "settings admin" on public.settings      for all using (public.is_admin()) with check (public.is_admin());
create policy "players admin"  on public.players       for all using (public.is_admin()) with check (public.is_admin());
create policy "matches admin"  on public.matches       for all using (public.is_admin()) with check (public.is_admin());
create policy "seeds admin"    on public.bracket_seeds for all using (public.is_admin()) with check (public.is_admin());
create policy "admins admin"   on public.admin_emails  for all using (public.is_admin()) with check (public.is_admin());

-- contatti: li vedono i partecipanti loggati (servono per organizzare le partite, art. 4.2) e gli admin
create policy "contacts read participants" on public.player_contacts for select
  using (public.is_admin() or public.my_player_id() is not null);
create policy "contacts admin" on public.player_contacts for all using (public.is_admin()) with check (public.is_admin());

-- profili: ognuno vede il proprio, gli admin tutti
create policy "profiles self"  on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles admin" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- segnalazioni: il giocatore segnala solo le proprie partite non confermate
create policy "reports insert own match" on public.result_reports for insert with check (
  reported_by = auth.uid() and exists (
    select 1 from public.matches m
    where m.id = match_id and m.status <> 'confirmed'
      and public.my_player_id() in (m.home_id, m.away_id)
  )
);
create policy "reports read" on public.result_reports for select using (reported_by = auth.uid() or public.is_admin());
create policy "reports admin" on public.result_reports for update using (public.is_admin()) with check (public.is_admin());
create policy "reports admin delete" on public.result_reports for delete using (public.is_admin());

-- =====================================================================
-- Storage: bucket "documents" per il regolamento in PDF (lettura pubblica, scrittura admin)
-- =====================================================================
insert into storage.buckets (id, name, public) values ('documents', 'documents', true)
  on conflict (id) do nothing;
create policy "documents read" on storage.objects for select using (bucket_id = 'documents');
create policy "documents admin write" on storage.objects for insert with check (bucket_id = 'documents' and public.is_admin());
create policy "documents admin update" on storage.objects for update using (bucket_id = 'documents' and public.is_admin());
create policy "documents admin delete" on storage.objects for delete using (bucket_id = 'documents' and public.is_admin());

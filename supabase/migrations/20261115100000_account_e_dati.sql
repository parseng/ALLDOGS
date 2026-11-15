-- AllDogs: account e dati per utente/cane.
-- Scritta per essere rieseguibile: crea solo ciò che manca e completa le tabelle già esistenti.
-- Regole di sicurezza (RLS): ognuno legge e scrive solo i propri dati; le recensioni si leggono da tutti.

-- ============ profiles ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  creato_il timestamptz not null default now()
);
alter table public.profiles add column if not exists nome text;
alter table public.profiles add column if not exists creato_il timestamptz not null default now();
alter table public.profiles add column if not exists impostazioni jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists aggiornato_il timestamptz not null default now();

-- profilo creato in automatico alla registrazione
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- aggiorna "aggiornato_il" a ogni modifica
create or replace function public.tocca_aggiornato()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.aggiornato_il = now();
  return new;
end;
$$;

-- ============ dogs ============
create table if not exists public.dogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nome text not null default '',
  creato_il timestamptz not null default now()
);
alter table public.dogs add column if not exists local_id text;          -- id del cane nell'app (d1, d...)
alter table public.dogs add column if not exists razza text;
alter table public.dogs add column if not exists eta_anni numeric;
alter table public.dogs add column if not exists data_nascita date;
alter table public.dogs add column if not exists peso_kg numeric;
alter table public.dogs add column if not exists energia text;           -- allenamento: poco / medio / molto
alter table public.dogs add column if not exists agilita text;
alter table public.dogs add column if not exists mantello text;
alter table public.dogs add column if not exists brachicefalo boolean not null default false;
alter table public.dogs add column if not exists patologie jsonb not null default '{}'::jsonb;
alter table public.dogs add column if not exists patologie_note text;
alter table public.dogs add column if not exists foto_url text;
alter table public.dogs add column if not exists dati jsonb not null default '{}'::jsonb;  -- profilo completo + obiettivo, lezioni, salute
alter table public.dogs add column if not exists aggiornato_il timestamptz not null default now();
create unique index if not exists dogs_owner_local_uq on public.dogs (owner_id, local_id);
create index if not exists dogs_owner_idx on public.dogs (owner_id);

-- ============ reviews ============
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trail_id text not null,
  creato_il timestamptz not null default now()
);
alter table public.reviews add column if not exists voto smallint;
alter table public.reviews add column if not exists testo text;
alter table public.reviews add column if not exists cani_ammessi boolean;
alter table public.reviews add column if not exists tag text[] not null default '{}';
alter table public.reviews add column if not exists domande jsonb not null default '{}'::jsonb;
alter table public.reviews add column if not exists foto text[] not null default '{}';
alter table public.reviews add column if not exists aggiornato_il timestamptz not null default now();
do $$ begin
  alter table public.reviews add constraint reviews_voto_ck check (voto is null or voto between 1 and 5);
exception when duplicate_object then null; end $$;
create unique index if not exists reviews_user_trail_uq on public.reviews (user_id, trail_id);
create index if not exists reviews_trail_idx on public.reviews (trail_id);
create index if not exists reviews_user_idx on public.reviews (user_id);

-- ============ walks (uscite) ============
create table if not exists public.walks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dog_id uuid references public.dogs(id) on delete set null,
  inizio timestamptz not null,
  creato_il timestamptz not null default now()
);
alter table public.walks add column if not exists local_id text;   -- ora di inizio in millisecondi, come nell'app
alter table public.walks add column if not exists fine timestamptz;
alter table public.walks add column if not exists km numeric;
alter table public.walks add column if not exists passi integer;
alter table public.walks add column if not exists dislivello integer;
alter table public.walks add column if not exists traccia jsonb;    -- GeoJSON LineString
alter table public.walks add column if not exists trail_id text;
alter table public.walks add column if not exists nome text;
alter table public.walks add column if not exists cani text[] not null default '{}';  -- id locali di tutti i cani usciti
alter table public.walks add column if not exists dati jsonb not null default '{}'::jsonb;  -- uscita com'è nell'app (diario, ecc.)
alter table public.walks add column if not exists aggiornato_il timestamptz not null default now();
create unique index if not exists walks_user_local_uq on public.walks (user_id, local_id);
create index if not exists walks_user_idx on public.walks (user_id);
create index if not exists walks_dog_idx on public.walks (dog_id);

-- ============ daily_progress ============
create table if not exists public.daily_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  giorno date not null,
  creato_il timestamptz not null default now()
);
alter table public.daily_progress add column if not exists passi integer not null default 0;
alter table public.daily_progress add column if not exists km numeric not null default 0;
alter table public.daily_progress add column if not exists minuti integer not null default 0;
alter table public.daily_progress add column if not exists obiettivi_raggiunti jsonb not null default '{}'::jsonb;
alter table public.daily_progress add column if not exists note text;
alter table public.daily_progress add column if not exists aggiornato_il timestamptz not null default now();
create unique index if not exists daily_progress_user_dog_giorno_uq on public.daily_progress (user_id, dog_id, giorno);
create index if not exists daily_progress_dog_idx on public.daily_progress (dog_id);

-- trigger "aggiornato_il"
do $$
declare t text;
begin
  foreach t in array array['profiles','dogs','reviews','walks','daily_progress'] loop
    execute format('drop trigger if exists tocca_aggiornato on public.%I', t);
    execute format('create trigger tocca_aggiornato before update on public.%I for each row execute function public.tocca_aggiornato()', t);
  end loop;
end $$;

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.dogs enable row level security;
alter table public.reviews enable row level security;
alter table public.walks enable row level security;
alter table public.daily_progress enable row level security;

-- profiles: solo il proprio
drop policy if exists "profilo: leggo il mio" on public.profiles;
create policy "profilo: leggo il mio" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profilo: creo il mio" on public.profiles;
create policy "profilo: creo il mio" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "profilo: modifico il mio" on public.profiles;
create policy "profilo: modifico il mio" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- dogs: solo i propri
drop policy if exists "cani: solo i miei" on public.dogs;
create policy "cani: solo i miei" on public.dogs for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

-- walks: solo le proprie, e il cane deve essere mio
drop policy if exists "uscite: solo le mie" on public.walks;
create policy "uscite: solo le mie" on public.walks for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and (dog_id is null or exists (select 1 from public.dogs d where d.id = dog_id and d.owner_id = (select auth.uid()))));

-- daily_progress: solo i propri, e il cane deve essere mio
drop policy if exists "progressi: solo i miei" on public.daily_progress;
create policy "progressi: solo i miei" on public.daily_progress for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and exists (select 1 from public.dogs d where d.id = dog_id and d.owner_id = (select auth.uid())));

-- reviews: lettura per tutti, scrittura solo delle proprie
drop policy if exists "recensioni: lettura pubblica" on public.reviews;
create policy "recensioni: lettura pubblica" on public.reviews for select to anon, authenticated using (true);
drop policy if exists "recensioni: scrivo le mie" on public.reviews;
create policy "recensioni: scrivo le mie" on public.reviews for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "recensioni: modifico le mie" on public.reviews;
create policy "recensioni: modifico le mie" on public.reviews for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "recensioni: cancello le mie" on public.reviews;
create policy "recensioni: cancello le mie" on public.reviews for delete to authenticated using ((select auth.uid()) = user_id);

-- permessi di base (RLS decide poi le righe)
grant select on public.reviews to anon;
grant select, insert, update, delete on public.profiles, public.dogs, public.reviews, public.walks, public.daily_progress to authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- funzione di servizio creata da Supabase (attiva RLS sulle nuove tabelle): non deve essere richiamabile dall'app
do $$ begin
  revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
exception when undefined_function then null; end $$;

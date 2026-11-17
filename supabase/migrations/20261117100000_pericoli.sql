-- Pericoli segnalati lungo i percorsi (buca, vetri, animale aggressivo, sentiero franato...):
-- li vede chiunque, li scrive solo chi ha l'account (così niente spam), ognuno può togliere i suoi.
-- L'app mostra solo quelli degli ultimi 30 giorni.
create table if not exists public.hazards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  tipo text not null,
  nota text,
  creato_il timestamptz not null default now()
);
do $$ begin
  alter table public.hazards add constraint hazards_coord_ck check (lat between -90 and 90 and lng between -180 and 180);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.hazards add constraint hazards_tipo_ck check (tipo in ('buca','vetri','animale','frana','acqua','caldo','esche','altro'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.hazards add constraint hazards_nota_len check (nota is null or char_length(nota) <= 300);
exception when duplicate_object then null; end $$;
create index if not exists hazards_quando_idx on public.hazards (creato_il desc);
create index if not exists hazards_posto_idx on public.hazards (lat, lng);
create index if not exists hazards_user_idx on public.hazards (user_id);

alter table public.hazards enable row level security;
drop policy if exists "pericoli: lettura pubblica" on public.hazards;
create policy "pericoli: lettura pubblica" on public.hazards for select to anon, authenticated using (true);
drop policy if exists "pericoli: scrivo i miei" on public.hazards;
create policy "pericoli: scrivo i miei" on public.hazards for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "pericoli: cancello i miei" on public.hazards;
create policy "pericoli: cancello i miei" on public.hazards for delete to authenticated using ((select auth.uid()) = user_id);

grant select on public.hazards to anon;
grant select, insert, delete on public.hazards to authenticated;

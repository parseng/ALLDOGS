-- Abitudini del cane raccolte al primo avvio: energia, orari liberi, durata preferita, obiettivo.
-- orari_liberi: {"fasce": {"feriali": ["mattina","sera"], "weekend": [...]},
--                "slots": [{"giorni":[1,2,3,4,5],"fascia":"mattina","dalle":"7:00","alle":"9:00"}, ...]}  (giorni: 0 = domenica)
-- Gli "slots" servono per mandare le notifiche all'orario scelto.
alter table public.dogs add column if not exists energia text;
alter table public.dogs add column if not exists allenamento text;           -- poco / medio / molto (come nel profilo dell'app)
alter table public.dogs add column if not exists orari_liberi jsonb not null default '{}'::jsonb;
alter table public.dogs add column if not exists durata_preferita integer;   -- minuti
alter table public.dogs add column if not exists obiettivo text;             -- movimento / social / addestramento / peso / scoprire
alter table public.dogs add column if not exists soffre_caldo boolean not null default false;
do $$ begin
  alter table public.dogs add constraint dogs_energia_ck check (energia is null or energia in ('bassa','media','alta','poco','medio','molto'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.dogs add constraint dogs_durata_ck check (durata_preferita is null or durata_preferita between 5 and 600);
exception when duplicate_object then null; end $$;

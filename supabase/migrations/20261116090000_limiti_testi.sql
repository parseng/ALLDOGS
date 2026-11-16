-- Controllo di sicurezza: limiti di lunghezza sui testi scritti dagli utenti (soprattutto le recensioni, che sono pubbliche),
-- così nessuno può riempire il database con testi enormi.
do $$ begin
  alter table public.reviews add constraint reviews_testo_len check (testo is null or char_length(testo) <= 2000);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.reviews add constraint reviews_trail_len check (char_length(trail_id) between 1 and 100);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.reviews add constraint reviews_tag_len check (cardinality(tag) <= 20 and cardinality(foto) <= 12);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.reviews add constraint reviews_domande_len check (pg_column_size(domande) <= 4000);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.dogs add constraint dogs_nome_len check (char_length(nome) <= 80);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_nome_len check (nome is null or char_length(nome) <= 80);
exception when duplicate_object then null; end $$;

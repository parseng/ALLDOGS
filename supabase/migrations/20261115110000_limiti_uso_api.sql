-- Limiti d'uso per le funzioni sul server (chat AI e calcolo dei giri):
-- contatore per "chi" (utente o indirizzo IP) e per finestra di tempo. Usato solo dalle Edge Function con la chiave di servizio.
create table if not exists public.api_usage (
  chiave text not null,          -- es. "ai:user:<uuid>", "ors:ip:<hash>", "ai:tutti"
  finestra timestamptz not null, -- inizio dell'ora o del giorno
  conta integer not null default 0,
  primary key (chiave, finestra)
);
alter table public.api_usage enable row level security;
-- nessuna policy: dall'app (anon/authenticated) non si legge né si scrive nulla
revoke all on public.api_usage from anon, authenticated;

-- aumenta il contatore e dice se si è ancora sotto il limite (atomico)
create or replace function public.api_conta(p_chiave text, p_secondi integer, p_limite integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_secondi) * p_secondi);
  n integer;
begin
  insert into public.api_usage as u (chiave, finestra, conta) values (p_chiave, w, 1)
  on conflict (chiave, finestra) do update set conta = u.conta + 1
  returning conta into n;
  -- pulizia leggera delle finestre vecchie
  if random() < 0.01 then
    delete from public.api_usage where finestra < now() - interval '3 days';
  end if;
  return n <= p_limite;
end;
$$;
revoke execute on function public.api_conta(text, integer, integer) from anon, authenticated, public;
grant execute on function public.api_conta(text, integer, integer) to service_role;

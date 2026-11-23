-- IK-mat Kontroll · databaseskjema (PostgreSQL / Supabase)
-- Kjør hele fila én gang i Supabase → SQL Editor.

-- ---------- Plan ----------
create table if not exists stevne (
  id          uuid primary key,
  nr          text not null default '',
  navn        text not null,
  kilde       text not null default '',
  qa          jsonb not null default '[]',
  opprettet   timestamptz not null default now(),
  opprettet_av uuid default auth.uid()
);

create table if not exists stevne_dag (
  id         uuid primary key,
  stevne_id  uuid not null references stevne(id) on delete cascade,
  dato       date not null,
  ukedag     text not null default '',
  info       text not null default '',
  unique (stevne_id, dato)
);

create table if not exists plan_sted (
  id          uuid primary key,
  dag_id      uuid not null references stevne_dag(id) on delete cascade,
  gruppe      text not null check (gruppe in ('kiosk','utlevering','kjokken')),
  navn        text not null,
  tider       text not null default '',   -- åpningstid, f.eks. "16:00–23:00 · 21:30–00:00"
  vindu       text not null default '',   -- kontrollvindu
  ubekreftet  boolean not null default false,
  aktiv       boolean not null default true,
  notes       text[] not null default '{}',
  kort        text[] not null default '{}', -- varm / kald / grill / allergen / zerofood
  mal_tpl     text,
  mal_id      text,
  sortering   int not null default 0
);
create index if not exists plan_sted_dag on plan_sted(dag_id);

-- ---------- Runder ----------
create table if not exists runde (
  id              uuid primary key,
  stevne_id       uuid references stevne(id) on delete set null,
  event           text not null,
  tpl             text not null check (tpl in ('kiosk','utlevering','kjokken')),
  dato            date not null,
  kontrollor_navn text not null,
  kontrollor_id   uuid default auth.uid(),
  last            boolean not null default false,
  last_tid        text,
  opprettet       timestamptz not null default now()
);
create index if not exists runde_stevne on runde(stevne_id);

create table if not exists runde_sted (
  id             uuid primary key,
  runde_id       uuid not null references runde(id) on delete cascade,
  plan_sted_id   uuid,                 -- ingen FK: planen kan endres/slettes, runden står
  sortering      int not null default 0,
  def            jsonb not null,       -- øyeblikksbilde av sjekklisten ved start {navn,items,tider,vindu,notes}
  ferdig         boolean not null default false,
  kontrollert_kl text
);
create index if not exists runde_sted_runde on runde_sted(runde_id);

create table if not exists svar (
  runde_sted_id uuid not null references runde_sted(id) on delete cascade,
  idx           int not null,
  verdi         text,
  notat         text,
  foto          text,                  -- sti i Storage-bøtta "foto"
  endret        timestamptz not null default now(),
  primary key (runde_sted_id, idx)
);

-- ---------- Avvik ----------
create table if not exists avvik (
  id            uuid primary key,
  runde_id      uuid not null references runde(id) on delete cascade,
  runde_sted_id uuid not null references runde_sted(id) on delete cascade,
  sted_navn     text not null,
  idx           int not null,
  niva          text not null check (niva in ('warn','crit')),
  tekst         text not null,
  verdi         text not null default '',
  krav          text not null default '',
  notat         text not null default '',
  dato          date not null,
  tid           text not null default '',
  av            text not null default '',
  status        text not null default 'åpen' check (status in ('åpen','lukket')),
  tiltak        text not null default '',
  lukket        date,
  lukket_av     uuid
);
create index if not exists avvik_runde on avvik(runde_id);

-- ---------- Låste runder kan ikke endres (dokumentasjon for Mattilsynet) ----------
create or replace function ikmat_sjekk_last() returns trigger language plpgsql as $$
declare r_id uuid; er_last boolean;
begin
  if tg_table_name = 'svar' then
    select rs.runde_id into r_id from runde_sted rs where rs.id = coalesce(new.runde_sted_id, old.runde_sted_id);
  elsif tg_table_name in ('runde_sted', 'avvik') then
    r_id := coalesce(new.runde_id, old.runde_id);
  end if;
  select last into er_last from runde where id = r_id;
  if coalesce(er_last, false) then
    raise exception 'Runden er låst og kan ikke endres';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists svar_last on svar;
create trigger svar_last before insert or update or delete on svar for each row execute function ikmat_sjekk_last();
drop trigger if exists runde_sted_last on runde_sted;
create trigger runde_sted_last before insert or update or delete on runde_sted for each row execute function ikmat_sjekk_last();
-- avvik kan bare slettes mens runden pågår (lukking med tiltak er alltid lov)
drop trigger if exists avvik_slett_last on avvik;
create trigger avvik_slett_last before delete on avvik for each row execute function ikmat_sjekk_last();

create or replace function ikmat_runde_last() returns trigger language plpgsql as $$
begin
  -- bare koblingen til stevneplanen får endres etter låsing (f.eks. når planen importeres på nytt)
  if old.last and row(new.id, new.event, new.tpl, new.dato, new.kontrollor_navn, new.last, new.last_tid)
       is distinct from row(old.id, old.event, old.tpl, old.dato, old.kontrollor_navn, old.last, old.last_tid) then
    raise exception 'Runden er låst og kan ikke endres';
  end if;
  return new;
end $$;
drop trigger if exists runde_last on runde;
create trigger runde_last before update on runde for each row execute function ikmat_runde_last();

-- ---------- Tilgang for Data API (bare innloggede, aldri anonyme) ----------
grant usage on schema public to authenticated;
grant select, insert, update, delete on stevne, stevne_dag, plan_sted, runde, runde_sted, svar, avvik to authenticated;

-- ---------- Tilgang (Row Level Security) ----------
-- Testfase: alle innloggede brukere i prosjektet er IK-mat-teamet (ny registrering slås av i Supabase).
-- Runder kan ikke slettes fra appen. Avvik bare mens runden pågår (trigger).
alter table stevne     enable row level security;
alter table stevne_dag enable row level security;
alter table plan_sted  enable row level security;
alter table runde      enable row level security;
alter table runde_sted enable row level security;
alter table svar       enable row level security;
alter table avvik      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['stevne','stevne_dag','plan_sted','runde','runde_sted','svar','avvik'] loop
    execute format('drop policy if exists "%s_les" on %I', t, t);
    execute format('create policy "%s_les" on %I for select to authenticated using (true)', t, t);
    execute format('drop policy if exists "%s_ny" on %I', t, t);
    execute format('create policy "%s_ny" on %I for insert to authenticated with check (true)', t, t);
    execute format('drop policy if exists "%s_endre" on %I', t, t);
    execute format('create policy "%s_endre" on %I for update to authenticated using (true) with check (true)', t, t);
  end loop;
  -- planen kan slettes fra appen; svar kan erstattes mens runden pågår (trigger stopper etter låsing)
  foreach t in array array['stevne','stevne_dag','plan_sted','svar','avvik'] loop
    execute format('drop policy if exists "%s_slett" on %I', t, t);
    execute format('create policy "%s_slett" on %I for delete to authenticated using (true)', t, t);
  end loop;
end $$;

-- ---------- Bilder ----------
insert into storage.buckets (id, name, public) values ('foto', 'foto', false)
  on conflict (id) do nothing;

drop policy if exists "foto_les" on storage.objects;
create policy "foto_les" on storage.objects for select to authenticated using (bucket_id = 'foto');
drop policy if exists "foto_ny" on storage.objects;
create policy "foto_ny" on storage.objects for insert to authenticated with check (bucket_id = 'foto');
drop policy if exists "foto_endre" on storage.objects;
create policy "foto_endre" on storage.objects for update to authenticated using (bucket_id = 'foto');

alter table public.gyms
  add column if not exists slug text,
  add column if not exists nome text,
  add column if not exists indirizzo text,
  add column if not exists citta text,
  add column if not exists provincia text,
  add column if not exists regione text,
  add column if not exists telefono text,
  add column if not exists email text,
  add column if not exists sito text,
  add column if not exists descrizione text,
  add column if not exists disciplines text[],
  add column if not exists orari text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists is_premium boolean not null default false,
  add column if not exists is_verified boolean not null default false,
  add column if not exists priority_score integer not null default 0,
  add column if not exists deleted_at timestamp with time zone null,
  add column if not exists created_at timestamp with time zone not null default now(),
  add column if not exists updated_at timestamp with time zone not null default now(),
  add column if not exists data_quality_score smallint not null default 0;

create table if not exists public.admin_audit_log (
  id bigserial primary key,
  created_at timestamp with time zone not null default now(),
  actor text not null default current_user,
  action text not null,
  table_name text not null,
  record_id text,
  before_data jsonb,
  after_data jsonb
);

create index if not exists gyms_slug_idx on public.gyms (slug);
create index if not exists gyms_citta_idx on public.gyms (citta);
create index if not exists gyms_deleted_at_idx on public.gyms (deleted_at);
create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_record_id_idx on public.admin_audit_log (record_id);

create or replace function public.gyms_quality_score_from_row(row_data jsonb)
returns smallint
language plpgsql
stable
as $$
declare
  score smallint := 0;
  discipline_text text := coalesce(row_data->>'discipline', '');
  disciplines_text text := coalesce(row_data->>'discipline', '');
  hours_text text := coalesce(row_data->>'orari', row_data->>'hours_info', '');
  description_text text := coalesce(row_data->>'descrizione', row_data->>'description', '');
begin
  if coalesce(row_data->>'telefono', row_data->>'phone', '') <> '' then
    score := score + 20;
  end if;

  if coalesce(row_data->>'sito', row_data->>'website', '') <> '' then
    score := score + 20;
  end if;

  if hours_text <> '' and hours_text !~* 'da verificare' then
    score := score + 20;
  end if;

  if length(description_text) >= 80 then
    score := score + 20;
  end if;

  if row_data ? 'disciplines' then
    disciplines_text := row_data->>'disciplines';
  end if;

  if disciplines_text <> '' and lower(discipline_text) not in ('fitness', 'sport', 'palestra') then
    score := score + 20;
  end if;

  return greatest(0, least(100, score));
end;
$$;

create or replace function public.gyms_before_write_guard()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.data_quality_score := public.gyms_quality_score_from_row(to_jsonb(new));
  return new;
end;
$$;

create or replace function public.gyms_audit_log_write()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.admin_audit_log (action, table_name, record_id, before_data, after_data)
  values (
    tg_op,
    tg_table_name,
    coalesce(new.id::text, old.id::text),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

create or replace function public.gyms_block_physical_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Cancellazione fisica bloccata: usa deleted_at per archiviare la scheda.';
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'gyms_before_write_guard_trigger'
  ) then
    create trigger gyms_before_write_guard_trigger
    before insert or update on public.gyms
    for each row execute function public.gyms_before_write_guard();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'gyms_audit_log_write_trigger'
  ) then
    create trigger gyms_audit_log_write_trigger
    after insert or update on public.gyms
    for each row execute function public.gyms_audit_log_write();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'gyms_block_physical_delete_trigger'
  ) then
    create trigger gyms_block_physical_delete_trigger
    before delete on public.gyms
    for each row execute function public.gyms_block_physical_delete();
  end if;
end $$;

comment on column public.gyms.nome is 'Nome palestra nello schema italiano definitivo.';
comment on column public.gyms.citta is 'Citta/localita nello schema italiano definitivo.';
comment on column public.gyms.deleted_at is 'Soft delete: valorizzato quando la scheda viene archiviata.';
comment on column public.gyms.data_quality_score is 'Punteggio 0-100 calcolato da telefono, sito, orari, descrizione e disciplina.';
comment on table public.admin_audit_log is 'Audit log additivo per modifiche admin sulle schede palestre.';

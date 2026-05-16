-- Additive metadata columns and backfill for staging/preview discipline taxonomy.

alter table public.gyms
  add column if not exists discipline_aliases jsonb not null default '[]'::jsonb;

alter table public.gyms
  add column if not exists discipline_canonical_slugs text[] not null default '{}'::text[];

update public.gyms
set
  discipline_aliases = case
    when jsonb_typeof(weekly_hours->'_discipline_aliases') = 'array'
      then weekly_hours->'_discipline_aliases'
    else discipline_aliases
  end,
  discipline_canonical_slugs = case
    when jsonb_typeof(weekly_hours->'_discipline_canonical_slugs') = 'array'
      then array(select jsonb_array_elements_text(weekly_hours->'_discipline_canonical_slugs'))
    else discipline_canonical_slugs
  end
where
  weekly_hours ? '_discipline_aliases'
  or weekly_hours ? '_discipline_canonical_slugs';

# Discipline Taxonomy Preview Report

Scope: staging/preview only. No production writes were executed.

## Staging Read

- Active gym records read: 683
- Raw discipline values found: 23
- Canonical values currently exposed after normalization: 23
- Records that would change with the current alias mapping: 8

## Raw Values Requiring Normalization

| Raw value | Canonical value | Impacted records |
| --- | --- | ---: |
| Functional | Functional Training | 1 |
| Jujitsu Brasiliano | Brazilian Jiu Jitsu | 4 |
| Kickboxe | Kickboxing | 3 |

Known impacted ids from staging read:

- `csv-298`: Functional -> Functional Training
- `csv-606`, `csv-526`, `csv-364`, `csv-95`: Jujitsu Brasiliano -> Brazilian Jiu Jitsu
- `csv-316`, `csv-324`, `csv-317`: Kickboxe -> Kickboxing

## Canonical Mapping Added

| Alias | Canonical |
| --- | --- |
| Kickboxe | Kickboxing |
| Personal Trainer | Personal Training |
| Functional | Functional Training |
| Ginnastica Funzionale | Functional Training |
| Crosstraining | Cross Training |
| Cross-Training | Cross Training |
| G.a.g | GAG |
| G.A.G. | GAG |
| Hiit | HIIT |
| Trx | TRX |
| Ems | EMS Training |
| EMS | EMS Training |
| Jujitsu Brasiliano | Brazilian Jiu Jitsu |
| BJJ | Brazilian Jiu Jitsu |
| Brazilian Jiujitsu | Brazilian Jiu Jitsu |
| Brazilian Jujitsu | Brazilian Jiu Jitsu |

## Do Not Merge

- CrossFit != Cross Training
- Yoga != Pilates
- MMA != Krav Maga
- Judo != Jujitsu
- Jujitsu != Brazilian Jiu Jitsu
- Boxe != Kickboxing
- Kickboxing != Muay Thai

## Manual Review

- Fitness: very broad, should remain available but used only when no specific discipline is known.
- Arti Marziali: broad umbrella, should be reviewed when a more specific combat discipline is available.
- Difesa Personale: can overlap with Krav Maga, but must remain separate unless the source explicitly says Krav Maga.
- K1, Kickboxing, Muay Thai: related striking disciplines, but not interchangeable.
- GAG, HIIT, TRX, EMS Training: now canonical for future inserts; no current staging records use these raw values.

## Redirect / Canonical Needs

Alias URLs should redirect to canonical discipline URLs:

- `/discipline/kickboxe` -> `/discipline/kickboxing`
- `/discipline/personal-trainer` -> `/discipline/personal-training`
- `/discipline/functional` -> `/discipline/functional-training`
- `/discipline/ginnastica-funzionale` -> `/discipline/functional-training`
- `/discipline/crosstraining` -> `/discipline/cross-training`
- `/discipline/g-a-g` -> `/discipline/gag`
- `/discipline/hiit-alias` -> `/discipline/hiit`
- `/discipline/trx-alias` -> `/discipline/trx`
- `/discipline/ems` -> `/discipline/ems-training`
- `/discipline/jujitsu-brasiliano` -> `/discipline/brazilian-jiu-jitsu`
- `/discipline/bjj` -> `/discipline/brazilian-jiu-jitsu`

The SvelteKit discipline route already resolves alias slugs through the taxonomy and returns a 301 to the canonical slug.

## Preview Migration SQL

Run only on staging/preview after exporting a backup and verifying counts.

```sql
begin;

alter table public.gyms
  add column if not exists discipline_aliases jsonb not null default '[]'::jsonb;

alter table public.gyms
  add column if not exists discipline_canonical_slugs text[] not null default '{}'::text[];

with mapping(raw_value, canonical_value, canonical_slug) as (
  values
    ('Functional', 'Functional Training', 'functional-training'),
    ('Ginnastica Funzionale', 'Functional Training', 'functional-training'),
    ('Kickboxe', 'Kickboxing', 'kickboxing'),
    ('Jujitsu Brasiliano', 'Brazilian Jiu Jitsu', 'brazilian-jiu-jitsu'),
    ('Personal Trainer', 'Personal Training', 'personal-training'),
    ('Crosstraining', 'Cross Training', 'cross-training'),
    ('G.a.g', 'GAG', 'gag'),
    ('Hiit', 'HIIT', 'hiit'),
    ('Trx', 'TRX', 'trx'),
    ('Ems', 'EMS Training', 'ems-training')
),
expanded as (
  select
    g.id,
    g.discipline as old_discipline,
    g.disciplines as old_disciplines,
    array_agg(distinct coalesce(m.canonical_value, item.value) order by coalesce(m.canonical_value, item.value)) as next_disciplines,
    array_agg(distinct coalesce(m.canonical_slug, lower(regexp_replace(item.value, '[^a-zA-Z0-9]+', '-', 'g'))) order by coalesce(m.canonical_slug, lower(regexp_replace(item.value, '[^a-zA-Z0-9]+', '-', 'g')))) as next_slugs,
    jsonb_agg(
      jsonb_build_object(
        'input', item.value,
        'canonical', m.canonical_value,
        'canonical_slug', m.canonical_slug
      )
    ) filter (where m.canonical_value is not null) as alias_log
  from public.gyms g
  cross join lateral unnest(
    case
      when coalesce(array_length(g.disciplines, 1), 0) > 0 then g.disciplines
      when nullif(g.discipline, '') is not null then array[g.discipline]
      else array[]::text[]
    end
  ) as item(value)
  left join mapping m on lower(trim(item.value)) = lower(trim(m.raw_value))
  where g.deleted_at is null
  group by g.id, g.discipline, g.disciplines
),
changed as (
  select *
  from expanded
  where alias_log is not null
)
update public.gyms g
set
  discipline = changed.next_disciplines[1],
  disciplines = changed.next_disciplines,
  discipline_aliases = coalesce(g.discipline_aliases, '[]'::jsonb) || changed.alias_log,
  discipline_canonical_slugs = changed.next_slugs,
  weekly_hours = coalesce(g.weekly_hours, '{}'::jsonb) || jsonb_build_object(
    '_discipline_aliases', changed.alias_log,
    '_discipline_canonical_slugs', changed.next_slugs,
    '_discipline_original', jsonb_build_object(
      'discipline', changed.old_discipline,
      'disciplines', changed.old_disciplines
    )
  )
from changed
where g.id = changed.id;

-- Expected staging impact from the read-only analysis: 8 gym records.
-- select count(*) from public.gyms where weekly_hours ? '_discipline_original';

commit;
```

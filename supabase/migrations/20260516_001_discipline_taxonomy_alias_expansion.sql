-- Additive alias expansion for staging/preview discipline taxonomy.
-- Additive only: creates or updates taxonomy seed rows and aliases.

insert into public.discipline_master (nome, slug, descrizione, ordine)
values
  ('GAG', 'gag', 'Corsi gambe, addominali e glutei.', 35),
  ('HIIT', 'hiit', 'Allenamento intervallato ad alta intensita.', 36),
  ('TRX', 'trx', 'Allenamento in sospensione con TRX o attrezzi analoghi.', 37),
  ('EMS Training', 'ems-training', 'Allenamento con elettrostimolazione muscolare.', 38)
on conflict (slug) do update set
  nome = excluded.nome,
  descrizione = excluded.descrizione,
  ordine = excluded.ordine,
  updated_at = now();

with aliases(alias, alias_slug, discipline_slug) as (
  values
    ('Ginnastica Funzionale', 'ginnastica-funzionale', 'functional-training'),
    ('G.a.g', 'g-a-g', 'gag'),
    ('G.A.G.', 'g-a-g-alt', 'gag'),
    ('Gambe Addominali Glutei', 'gambe-addominali-glutei', 'gag'),
    ('Hiit', 'hiit-alias', 'hiit'),
    ('High Intensity Interval Training', 'high-intensity-interval-training', 'hiit'),
    ('Trx', 'trx-alias', 'trx'),
    ('Suspension Training', 'suspension-training', 'trx'),
    ('Ems', 'ems', 'ems-training'),
    ('EMS', 'ems-uppercase', 'ems-training'),
    ('Elettrostimolazione', 'elettrostimolazione', 'ems-training')
)
insert into public.discipline_alias (discipline_id, alias, alias_slug)
select dm.id, aliases.alias, aliases.alias_slug
from aliases
join public.discipline_master dm on dm.slug = aliases.discipline_slug
on conflict (alias_slug) do update set
  discipline_id = excluded.discipline_id,
  alias = excluded.alias;

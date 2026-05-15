-- Additive discipline taxonomy for staging/preview.
-- No destructive operation: this only creates taxonomy tables, indexes, seed rows,
-- and optional metadata columns on gyms.

create extension if not exists pgcrypto;

create table if not exists public.discipline_master (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  slug text not null unique,
  descrizione text,
  ordine integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.discipline_alias (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid not null references public.discipline_master(id) on delete restrict,
  alias text not null,
  alias_slug text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists discipline_alias_discipline_id_idx
  on public.discipline_alias (discipline_id);

alter table public.gyms
  add column if not exists discipline_aliases jsonb not null default '[]'::jsonb;

alter table public.gyms
  add column if not exists discipline_canonical_slugs text[] not null default '{}'::text[];

insert into public.discipline_master (nome, slug, descrizione, ordine)
values
  ('Fitness', 'fitness', 'Palestre generaliste, sala attrezzi e attivita fitness non specialistiche.', 10),
  ('Personal Training', 'personal-training', 'Percorsi individuali o semi-individuali con trainer qualificato.', 20),
  ('Functional Training', 'functional-training', 'Allenamento funzionale, circuiti e preparazione fisica generale.', 30),
  ('Cross Training', 'cross-training', 'Allenamento incrociato non affiliato CrossFit.', 40),
  ('CrossFit', 'crossfit', 'Box e palestre affiliate o dichiaratamente focalizzate su CrossFit.', 50),
  ('Bodybuilding', 'bodybuilding', 'Allenamento orientato a ipertrofia, pesi liberi e macchine isotoniche.', 60),
  ('Calisthenics', 'calisthenics', 'Allenamento a corpo libero, skill e forza relativa.', 70),
  ('Yoga', 'yoga', 'Corsi e centri yoga, inclusi stili tradizionali e contemporanei.', 80),
  ('Pilates', 'pilates', 'Pilates matwork, reformer e percorsi posturali collegati.', 90),
  ('Nuoto', 'nuoto', 'Piscine, corsi di nuoto e attivita acquatiche.', 100),
  ('Boxe', 'boxe', 'Palestre e corsi di pugilato.', 110),
  ('Kickboxing', 'kickboxing', 'Sport da combattimento con tecniche di pugno e calcio.', 120),
  ('Muay Thai', 'muay-thai', 'Boxe thailandese e discipline da striking collegate.', 130),
  ('K1', 'k1', 'Disciplina da ring con regolamento K1.', 140),
  ('MMA', 'mma', 'Mixed Martial Arts, combattimento misto e preparazione collegata.', 150),
  ('Brazilian Jiu Jitsu', 'brazilian-jiu-jitsu', 'Brazilian Jiu Jitsu e grappling con kimono o no-gi.', 160),
  ('Jujitsu', 'jujitsu', 'Jujitsu tradizionale e sistemi affini non specificamente brasiliani.', 170),
  ('Grappling', 'grappling', 'Lotta, submission grappling e discipline di controllo a terra.', 180),
  ('Judo', 'judo', 'Dojo e corsi di judo.', 190),
  ('Karate', 'karate', 'Dojo e scuole di karate, inclusi stili specifici.', 200),
  ('Taekwondo', 'taekwondo', 'Corsi e societa di taekwondo.', 210),
  ('Aikido', 'aikido', 'Dojo e corsi di aikido.', 220),
  ('Krav Maga', 'krav-maga', 'Sistema di difesa personale Krav Maga.', 230),
  ('Difesa Personale', 'difesa-personale', 'Corsi di autodifesa e sicurezza personale.', 240),
  ('Arti Marziali', 'arti-marziali', 'Categoria generale da usare solo quando la disciplina specifica non e chiara.', 250),
  ('Kung Fu', 'kung-fu', 'Scuole di kung fu e arti marziali cinesi.', 260),
  ('Wing Chun', 'wing-chun', 'Scuole di Wing Chun.', 270),
  ('Tai Chi', 'tai-chi', 'Tai Chi, Taiji Quan e pratiche affini.', 280),
  ('Scherma', 'scherma', 'Scherma sportiva e corsi collegati.', 290),
  ('Chanbara', 'chanbara', 'Sport chanbara e discipline con armi imbottite.', 300),
  ('Iaido', 'iaido', 'Arte marziale giapponese focalizzata sull estrazione della spada.', 310),
  ('Ginnastica Artistica', 'ginnastica-artistica', 'Corsi e societa di ginnastica artistica.', 320),
  ('Ginnastica Ritmica', 'ginnastica-ritmica', 'Corsi e societa di ginnastica ritmica.', 330),
  ('Basket', 'basket', 'Basket e pallacanestro.', 340),
  ('Calcio', 'calcio', 'Calcio, scuole calcio e preparazione collegata.', 350),
  ('Padel', 'padel', 'Centri e campi da padel.', 360),
  ('Pattinaggio', 'pattinaggio', 'Pattinaggio e skating.', 370),
  ('Golf', 'golf', 'Golf club e corsi collegati.', 380),
  ('Hockey', 'hockey', 'Hockey e attivita collegate.', 390),
  ('Goshindo', 'goshindo', 'Scuole e corsi di Goshindo.', 400)
on conflict (slug) do update set
  nome = excluded.nome,
  descrizione = excluded.descrizione,
  ordine = excluded.ordine,
  updated_at = now();

with aliases(alias, alias_slug, discipline_slug) as (
  values
    ('Fitnes', 'fitnes', 'fitness'),
    ('Fitness ! Bodybuilding', 'fitness-bodybuilding', 'fitness'),
    ('Palestra', 'palestra', 'fitness'),
    ('Sport', 'sport', 'fitness'),
    ('Personal Trainer', 'personal-trainer', 'personal-training'),
    ('PT', 'pt', 'personal-training'),
    ('Allenamento personale', 'allenamento-personale', 'personal-training'),
    ('Functional', 'functional', 'functional-training'),
    ('Allenamento funzionale', 'allenamento-funzionale', 'functional-training'),
    ('Functional Fitness', 'functional-fitness', 'functional-training'),
    ('Crosstraining', 'crosstraining', 'cross-training'),
    ('Cross-Training', 'cross-training-alias', 'cross-training'),
    ('Cross Fit', 'cross-fit', 'crossfit'),
    ('Body Building', 'body-building', 'bodybuilding'),
    ('Street Workout', 'street-workout', 'calisthenics'),
    ('Kundalini Yoga', 'kundalini-yoga', 'yoga'),
    ('Hatha Yoga', 'hatha-yoga', 'yoga'),
    ('Vinyasa Yoga', 'vinyasa-yoga', 'yoga'),
    ('Pilates Reformer', 'pilates-reformer', 'pilates'),
    ('Mat Pilates', 'mat-pilates', 'pilates'),
    ('Swimming', 'swimming', 'nuoto'),
    ('Boxing', 'boxing', 'boxe'),
    ('Pugilato', 'pugilato', 'boxe'),
    ('Kickboxe', 'kickboxe', 'kickboxing'),
    ('Kick Boxing', 'kick-boxing', 'kickboxing'),
    ('Kick-boxing', 'kick-boxing-alt', 'kickboxing'),
    ('Thai Boxe', 'thai-boxe', 'muay-thai'),
    ('K-1', 'k-1', 'k1'),
    ('Mixed Martial Arts', 'mixed-martial-arts', 'mma'),
    ('BJJ', 'bjj', 'brazilian-jiu-jitsu'),
    ('Brazilian Jiujitsu', 'brazilian-jiujitsu', 'brazilian-jiu-jitsu'),
    ('Brazilian Jujitsu', 'brazilian-jujitsu', 'brazilian-jiu-jitsu'),
    ('Jujitsu Brasiliano', 'jujitsu-brasiliano', 'brazilian-jiu-jitsu'),
    ('Jiu Jitsu Brasiliano', 'jiu-jitsu-brasiliano', 'brazilian-jiu-jitsu'),
    ('Ju Jitsu Brasiliano', 'ju-jitsu-brasiliano', 'brazilian-jiu-jitsu'),
    ('Jiujitsu', 'jiujitsu', 'jujitsu'),
    ('Jiu Jitsu', 'jiu-jitsu', 'jujitsu'),
    ('Ju Jitsu', 'ju-jitsu', 'jujitsu'),
    ('Jiu-Jitsu', 'jiu-jitsu-alt', 'jujitsu'),
    ('Ju-Jitsu', 'ju-jitsu-alt', 'jujitsu'),
    ('Wrestling', 'wrestling', 'grappling'),
    ('Lotta', 'lotta', 'grappling'),
    ('Submission Grappling', 'submission-grappling', 'grappling'),
    ('Jodo', 'jodo', 'judo'),
    ('Kyokushin', 'kyokushin', 'karate'),
    ('Shito Ryu', 'shito-ryu', 'karate'),
    ('Wa Rei Ryu', 'wa-rei-ryu', 'karate'),
    ('Kravmaga', 'kravmaga', 'krav-maga'),
    ('Self Defense', 'self-defense', 'difesa-personale'),
    ('Autodifesa', 'autodifesa', 'difesa-personale'),
    ('Difesa Personae', 'difesa-personae', 'difesa-personale'),
    ('Martial Arts', 'martial-arts', 'arti-marziali'),
    ('Kungfu', 'kungfu', 'kung-fu'),
    ('Choy Lay Fut', 'choy-lay-fut', 'kung-fu'),
    ('Choy Lee Fut', 'choy-lee-fut', 'kung-fu'),
    ('Win Chun', 'win-chun', 'wing-chun'),
    ('Win Chung', 'win-chung', 'wing-chun'),
    ('Ving Tsun', 'ving-tsun', 'wing-chun'),
    ('Taiji', 'taiji', 'tai-chi'),
    ('Taiji Quan', 'taiji-quan', 'tai-chi'),
    ('Fencing', 'fencing', 'scherma'),
    ('Iado', 'iado', 'iaido'),
    ('Laido', 'laido', 'iaido'),
    ('Ginnastica Ritimica', 'ginnastica-ritimica', 'ginnastica-ritmica'),
    ('Basketball', 'basketball', 'basket'),
    ('Football', 'football', 'calcio'),
    ('Soccer', 'soccer', 'calcio'),
    ('Skating', 'skating', 'pattinaggio')
)
insert into public.discipline_alias (discipline_id, alias, alias_slug)
select dm.id, aliases.alias, aliases.alias_slug
from aliases
join public.discipline_master dm on dm.slug = aliases.discipline_slug
on conflict (alias_slug) do update set
  discipline_id = excluded.discipline_id,
  alias = excluded.alias;

create table if not exists public.gyms (
  id text primary key,
  slug text,
  nome text,
  indirizzo text,
  citta text,
  provincia text,
  regione text,
  telefono text,
  email text,
  sito text,
  descrizione text,
  disciplines text[] not null default '{}',
  orari text,
  lat double precision,
  lng double precision,
  is_premium boolean not null default false,
  is_verified boolean not null default false,
  priority_score integer not null default 0,
  deleted_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  -- Legacy compatibility columns. Keep until the app is fully migrated to Italian fields.
  name text,
  discipline text,
  address text,
  city text,
  phone text,
  hours_info text,
  website text,
  description text,
  latitude double precision,
  longitude double precision,
  image_url text,
  weekly_hours jsonb not null default '{}'::jsonb,
  official_source_url text,
  editorial_summary text,
  editorial_highlights jsonb not null default '[]'::jsonb,
  editorial_faq_items jsonb not null default '[]'::jsonb,
  social_links jsonb,
  price_info text,
  price_source_url text,
  price_updated_at timestamp with time zone,
  data_verified_at timestamp with time zone,
  enrichment_status text not null default 'pending',
  enrichment_notes text,
  enrichment_updated_at timestamp with time zone,
  data_quality_score smallint not null default 0
);

create index if not exists gyms_baseline_slug_idx on public.gyms (slug);
create index if not exists gyms_baseline_city_idx on public.gyms (city);
create index if not exists gyms_baseline_citta_idx on public.gyms (citta);
create index if not exists gyms_baseline_deleted_at_idx on public.gyms (deleted_at);

comment on table public.gyms is
  'Catalogo palestre. Schema italiano definitivo con colonne legacy temporanee per compatibilita applicativa.';

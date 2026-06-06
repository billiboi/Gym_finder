# Constraint da migration locali

Nota: Supabase REST OpenAPI espone gli hint di primary key, ma non tutte le constraint live. Questa sezione e ricostruita dai file SQL locali.

## supabase/migrations/20260429_004_add_gym_editorial_enrichment_fields.sql

```sql
comment on column public.gyms.editorial_summary is 'Reviewed unique public summary derived from official sources.';
```

## supabase/migrations/20260429_004_add_gym_editorial_enrichment_fields.sql

```sql
comment on column public.gyms.editorial_highlights is 'Reviewed unique highlights. Expected shape: ["...", "..."].';
```

## supabase/migrations/20260506_000_create_gyms_baseline.sql

```sql
create table if not exists public.gyms ( id text primary key, slug text, nome text, indirizzo text, citta text, provincia text, regione text, telefono text, email text, sito text, descrizione text, disciplines text[] not null default '{}', orari text, lat double precision, lng double precision, is_premium boolean not null default false, is_verified boolean not null default false, priority_score integer not null default 0, deleted_at timestamp with time zone null, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), name text, discipline text, address text, city text, phone text, hours_info text, website text, description text, latitude double precision, longitude double precision, image_url text, weekly_hours jsonb not null default '{}'::jsonb, official_source_url text, editorial_summary text, editorial_highlights jsonb not null default '[]'::jsonb, editorial_faq_items jsonb not null default '[]'::jsonb, social_links jsonb, price_info text, price_source_url text, price_updated_at timestamp with time zone, data_verified_at timestamp with time zone, enrichment_status text not null default 'pending', enrichment_notes text, enrichment_updated_at timestamp with time zone, data_quality_score smallint not null default 0 );
```

## supabase/migrations/20260506_006_gyms_stability_hardening.sql

```sql
create table if not exists public.admin_audit_log ( id bigserial primary key, created_at timestamp with time zone not null default now(), actor text not null default current_user, action text not null, table_name text not null, record_id text, before_data jsonb, after_data jsonb );
```

## supabase/migrations/20260509_001_claim_system.sql

```sql
create table if not exists public.claim_requests ( id text primary key, gym_id text null, gym_name text null, gym_url text null, reason text null, requester_name text null, requester_role text null, requester_email text null, requester_phone text null, message text null, status text not null default 'pending', verification_token text null, verification_sent_at timestamp with time zone null, email_verified_at timestamp with time zone null, approved_at timestamp with time zone null, rejected_at timestamp with time zone null, owner_token text null, requested_updates jsonb not null default '{}'::jsonb, image_uploads jsonb not null default '[]'::jsonb, admin_notes text null, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone null );
```

## supabase/migrations/20260509_001_claim_system.sql

```sql
create unique index if not exists claim_requests_verification_token_idx on public.claim_requests (verification_token) where verification_token is not null and verification_token <> '';
```

## supabase/migrations/20260509_001_claim_system.sql

```sql
create unique index if not exists claim_requests_owner_token_idx on public.claim_requests (owner_token) where owner_token is not null and owner_token <> '';
```

## supabase/migrations/20260515_001_discipline_taxonomy.sql

```sql
create table if not exists public.discipline_master ( id uuid primary key default gen_random_uuid(), nome text not null unique, slug text not null unique, descrizione text, ordine integer not null default 1000, created_at timestamptz not null default now(), updated_at timestamptz not null default now() );
```

## supabase/migrations/20260515_001_discipline_taxonomy.sql

```sql
create table if not exists public.discipline_alias ( id uuid primary key default gen_random_uuid(), discipline_id uuid not null references public.discipline_master(id) on delete restrict, alias text not null, alias_slug text not null unique, created_at timestamptz not null default now() );
```

## migrations/20260509_001_claim_system.sql

```sql
create table if not exists public.claim_requests ( id text primary key, gym_id text null, gym_name text null, gym_url text null, reason text null, requester_name text null, requester_role text null, requester_email text null, requester_phone text null, message text null, status text not null default 'pending', verification_token text null, verification_sent_at timestamp with time zone null, email_verified_at timestamp with time zone null, approved_at timestamp with time zone null, rejected_at timestamp with time zone null, owner_token text null, requested_updates jsonb not null default '{}'::jsonb, image_uploads jsonb not null default '[]'::jsonb, admin_notes text null, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone null );
```

## migrations/20260509_001_claim_system.sql

```sql
create unique index if not exists claim_requests_verification_token_idx on public.claim_requests (verification_token) where verification_token is not null and verification_token <> '';
```

## migrations/20260509_001_claim_system.sql

```sql
create unique index if not exists claim_requests_owner_token_idx on public.claim_requests (owner_token) where owner_token is not null and owner_token <> '';
```
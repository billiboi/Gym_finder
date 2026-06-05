-- Additive staging/preview migration only.
-- Do not run automatically. No destructive statements.

alter table if exists public.official_source_snapshots
  add column if not exists pages_scraped jsonb default '[]'::jsonb,
  add column if not exists facts_json jsonb default '{}'::jsonb,
  add column if not exists sections_json jsonb default '{}'::jsonb,
  add column if not exists confidence_score integer,
  add column if not exists extraction_warnings jsonb default '[]'::jsonb;

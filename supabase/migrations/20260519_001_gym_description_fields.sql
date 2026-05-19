-- Description engine additive fields.
-- Safe to run on staging first. Do not use DROP/TRUNCATE/DELETE.
-- These columns separate owner/editorial/generated copy from the currently public description.

alter table public.gyms add column if not exists descrizione_owner text;
alter table public.gyms add column if not exists descrizione_editoriale text;
alter table public.gyms add column if not exists descrizione_generata text;
alter table public.gyms add column if not exists descrizione_pubblica text;
alter table public.gyms add column if not exists descrizione_source text;
alter table public.gyms add column if not exists descrizione_quality_score integer default 0;
alter table public.gyms add column if not exists descrizione_needs_review boolean default false;

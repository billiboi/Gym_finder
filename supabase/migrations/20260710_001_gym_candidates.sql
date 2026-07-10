-- Review queue for scraped/candidate gym records. Never written to by the
-- public app or public API; only the acquisition pipeline scripts and the
-- admin review UI touch this table. public.gyms is only ever written to by
-- the manual "approve" action in admin, not by this table or any automation.
-- See docs/ACQUISITION_PIPELINE.md for the full design.
--
-- Safe to run on staging first; do not run on production before backup and
-- review, per docs/OPERATIONS.md.

create extension if not exists pgcrypto;

create table if not exists public.gym_candidates (
  id uuid primary key default gen_random_uuid(),

  -- gym fields, same conventions as public.gyms where applicable
  nome text not null,
  indirizzo text,
  citta text,
  provincia text,
  regione text,
  telefono text,
  email text,
  sito text,
  discipline text,
  disciplines text[],
  orari text,
  latitude double precision,
  longitude double precision,
  descrizione text,

  -- provenance
  source text not null,
  source_id text,
  source_url text,
  scraped_at timestamp with time zone not null default now(),

  -- validation and dedup
  validation_flags jsonb not null default '[]'::jsonb,
  dedup_score numeric,
  dedup_match_gym_id text,
  dedup_match_candidate_id uuid references public.gym_candidates (id),

  -- review workflow
  status text not null default 'pending',
  reviewed_at timestamp with time zone,
  reviewed_by text,
  rejection_reason text,
  published_gym_id text,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint gym_candidates_status_check
    check (status in ('pending', 'approved', 'rejected', 'merged')),
  constraint gym_candidates_source_source_id_key
    unique (source, source_id)
);

create index if not exists gym_candidates_status_idx on public.gym_candidates (status);
create index if not exists gym_candidates_citta_idx on public.gym_candidates (citta);
create index if not exists gym_candidates_dedup_score_idx on public.gym_candidates (dedup_score);

comment on table public.gym_candidates is
  'Review queue for scraped/candidate gym records (acquisition pipeline). Backoffice-only, never public. public.gyms is written to only via the manual admin approve/merge action.';

-- Backoffice-only, same pattern as public.claim_requests.
alter table public.gym_candidates enable row level security;
alter table public.gym_candidates force row level security;

revoke all on table public.gym_candidates from anon;
revoke all on table public.gym_candidates from authenticated;

drop policy if exists "gym_candidates_public_select" on public.gym_candidates;
drop policy if exists "gym_candidates_public_insert" on public.gym_candidates;
drop policy if exists "gym_candidates_public_update" on public.gym_candidates;
drop policy if exists "gym_candidates_public_delete" on public.gym_candidates;

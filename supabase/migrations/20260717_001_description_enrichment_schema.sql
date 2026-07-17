-- Description enrichment pipeline: readiness scoring, generation lifecycle,
-- and a normalized raw-facts table for web-sourced enrichment.
-- Additive only. Do not use DROP/TRUNCATE/DELETE. Show to the user and get
-- explicit confirmation before applying to staging or production.
--
-- Deliberately reuses and extends the existing descrizione_* family
-- (descrizione_generata, descrizione_pubblica, descrizione_source,
-- descrizione_quality_score, descrizione_needs_review - added in
-- 20260519_001_gym_description_fields.sql) rather than adding parallel
-- English-named columns. Those columns are unchanged by this migration.
--
-- data_quality_score / computeGymQualityScore() (general admin listing
-- quality, live in the /admin/qualita dashboard with hardcoded 40/70 bands)
-- is intentionally NOT reused for description-readiness gating - the two
-- scores answer different questions and reusing one column would reshuffle
-- existing admin rankings. See descrizione_readiness_score below instead.
--
-- source_discovery_status is intentionally a NEW, separately-named column,
-- not a repurposing of the existing `enrichment_status` column
-- (20260429_004_add_gym_editorial_enrichment_fields.sql). That column is
-- an actively-used human content-approval workflow state (pending/drafted/
-- reviewed/published/skipped), written directly by an admin action in
-- src/routes/admin/gyms/[id]/+page.server.js and read throughout
-- public-data-sanitizer.js. source_discovery_status tracks a different
-- thing: the outcome of the last automated web-enrichment agent run for a
-- gym. Conflating the two would mean an agent re-run could silently affect
-- whether already-reviewed editorial content is considered published.

alter table public.gyms
  add column if not exists descrizione_status text not null default 'pending',
  add column if not exists descrizione_generated_at timestamptz,
  add column if not exists descrizione_model text,
  add column if not exists descrizione_readiness_score integer not null default 0,
  add column if not exists source_discovery_status text not null default 'pending',
  add column if not exists source_discovery_checked_at timestamptz,
  add column if not exists source_discovery_notes text;

alter table public.gyms
  drop constraint if exists gyms_descrizione_status_check;
alter table public.gyms
  add constraint gyms_descrizione_status_check
  check (descrizione_status in ('pending', 'generata', 'revisionata', 'pubblicata', 'esclusa'));

alter table public.gyms
  drop constraint if exists gyms_descrizione_readiness_score_check;
alter table public.gyms
  add constraint gyms_descrizione_readiness_score_check
  check (descrizione_readiness_score >= 0 and descrizione_readiness_score <= 100);

alter table public.gyms
  drop constraint if exists gyms_source_discovery_status_check;
alter table public.gyms
  add constraint gyms_source_discovery_status_check
  check (source_discovery_status in ('pending', 'enriched', 'needs_review', 'no_sources_found', 'verified'));

comment on column public.gyms.descrizione_status is
  'Publication lifecycle for the generated description: pending (not yet generated) -> generata (written, unreviewed) -> revisionata (human-reviewed) -> pubblicata (live on the public page) -> esclusa (permanently below threshold or rejected). Orthogonal to descrizione_needs_review, which flags a specific quality/safety concern (near-duplicate, low score) rather than pipeline stage.';

comment on column public.gyms.descrizione_generated_at is
  'Timestamp of the last Stage B generation run that wrote descrizione_generata.';

comment on column public.gyms.descrizione_model is
  'Model identifier used for the last Stage B generation (e.g. claude-sonnet-5).';

comment on column public.gyms.descrizione_readiness_score is
  'Output of computeDescriptionReadinessScore() (src/lib/description-readiness.js) - 0-100, gates whether a description is eligible for Stage B generation. Recalculated after every enrichment run that promotes new facts into canonical fields. Distinct from data_quality_score (general admin listing-quality score, unrelated purpose).';

comment on column public.gyms.source_discovery_status is
  'Outcome of the last Stage A web-enrichment agent run for this gym: pending (not yet run) / enriched (facts found and extracted) / needs_review (ambiguous source match, no extraction performed) / no_sources_found / verified (facts promoted from high-confidence gym_facts). Distinct from enrichment_status (human editorial-content approval workflow) - see file header.';

comment on column public.gyms.source_discovery_checked_at is
  'Timestamp of the last Stage A web-enrichment agent run.';

comment on column public.gyms.source_discovery_notes is
  'Internal notes from the Stage A agent run: ambiguity reasons, source conflicts, why a gym was flagged needs_review.';

-- Raw facts extracted from the web by the Stage A agent, with full
-- provenance. Canonical gym columns are only ever populated by promoting a
-- fact from here (high confidence -> automatic; medium/low -> human review),
-- never written directly from web content. This supersedes the abandoned
-- official_source_snapshots concept from 20260605_001 (that migration's
-- base table was never actually created in any environment - confirmed via
-- direct schema probe on production, 2026-07-17 - and its one-row-per-source
-- design with a facts_json blob is coarser than the per-fact audit trail
-- this pipeline needs). Do not resurrect official_source_snapshots.
create extension if not exists pgcrypto;

create table if not exists public.gym_facts (
  id uuid primary key default gen_random_uuid(),
  gym_id text not null references public.gyms (id),

  field text not null,
  value jsonb not null,

  source_url text not null,
  source_type text not null,
  extracted_at timestamptz not null default now(),
  confidence text not null,

  applied boolean not null default false,
  applied_at timestamptz,

  created_at timestamptz not null default now(),

  constraint gym_facts_source_type_check
    check (source_type in ('official_site', 'google_business', 'social', 'article')),
  constraint gym_facts_confidence_check
    check (confidence in ('high', 'medium', 'low'))
);

create index if not exists gym_facts_gym_id_idx on public.gym_facts (gym_id);
create index if not exists gym_facts_applied_idx on public.gym_facts (applied);
create index if not exists gym_facts_confidence_idx on public.gym_facts (confidence);

comment on table public.gym_facts is
  'Raw facts extracted by the Stage A web-enrichment agent, with source/confidence provenance. Backoffice-only, never public. Canonical public.gyms columns are populated only by explicitly promoting a fact from here (scripts/promote-gym-facts.ts, high-confidence facts only automatically) - never written directly from web content or LLM prose.';

-- Backoffice-only, same pattern as public.gym_candidates and
-- public.claim_requests: no public read/write, service-role only.
alter table public.gym_facts enable row level security;
alter table public.gym_facts force row level security;

revoke all on table public.gym_facts from anon;
revoke all on table public.gym_facts from authenticated;

drop policy if exists "gym_facts_public_select" on public.gym_facts;
drop policy if exists "gym_facts_public_insert" on public.gym_facts;
drop policy if exists "gym_facts_public_update" on public.gym_facts;
drop policy if exists "gym_facts_public_delete" on public.gym_facts;

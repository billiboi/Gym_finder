-- Additive fields for public data contamination review.
-- Safe to run on staging first; do not run on production before backup and review.

alter table public.gyms
  add column if not exists data_quality_flags jsonb default '[]'::jsonb,
  add column if not exists needs_review boolean default false,
  add column if not exists review_reason text,
  add column if not exists last_data_audit_at timestamp with time zone,
  add column if not exists safe_public_description text;


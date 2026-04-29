-- Enrichment fields for public gym cards and detail pages.
-- This migration is intentionally additive and idempotent: it does not rewrite existing records.
alter table public.gyms
  add column if not exists social_links jsonb not null default '[]'::jsonb,
  add column if not exists price_info text,
  add column if not exists price_source_url text,
  add column if not exists price_updated_at timestamptz,
  add column if not exists data_verified_at timestamptz;

comment on column public.gyms.social_links is
  'Reviewed official social links. Expected shape: [{"platform":"instagram","url":"https://...","source_url":"https://..."}].';

comment on column public.gyms.price_info is
  'Publicly visible price or offer summary, only when sourced and reviewed.';

comment on column public.gyms.price_source_url is
  'Official or trusted source URL used to verify price_info.';

comment on column public.gyms.price_updated_at is
  'Timestamp of the latest price verification.';

comment on column public.gyms.data_verified_at is
  'Timestamp of the latest manual review of core public data for this gym.';

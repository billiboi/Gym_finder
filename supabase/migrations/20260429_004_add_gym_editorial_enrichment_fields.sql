-- Reviewed editorial enrichment generated from official gym websites.
-- Additive only: no existing records are rewritten.
alter table public.gyms
  add column if not exists official_source_url text,
  add column if not exists editorial_summary text,
  add column if not exists editorial_highlights jsonb not null default '[]'::jsonb,
  add column if not exists editorial_faq_items jsonb not null default '[]'::jsonb,
  add column if not exists enrichment_status text not null default 'pending',
  add column if not exists enrichment_notes text,
  add column if not exists enrichment_updated_at timestamptz;

comment on column public.gyms.official_source_url is
  'Official page used as the main source for editorial enrichment. Usually equals website unless a more specific club page exists.';

comment on column public.gyms.editorial_summary is
  'Reviewed unique public summary derived from official sources.';

comment on column public.gyms.editorial_highlights is
  'Reviewed unique highlights. Expected shape: ["...", "..."].';

comment on column public.gyms.editorial_faq_items is
  'Reviewed FAQ items. Expected shape: [{"question":"...","answer":"..."}].';

comment on column public.gyms.enrichment_status is
  'Editorial enrichment state: pending, drafted, reviewed, published, skipped.';

comment on column public.gyms.enrichment_notes is
  'Internal notes for source quality, ambiguity, or manual review decisions.';

comment on column public.gyms.enrichment_updated_at is
  'Timestamp of the latest editorial enrichment review.';

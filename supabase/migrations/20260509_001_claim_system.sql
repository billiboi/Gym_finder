-- Claim system additive migration.
-- Safe rules: no DROP, no TRUNCATE, no DELETE, no column rename.

alter table if exists public.claim_requests
  add column if not exists gym_id text null,
  add column if not exists verification_token text null,
  add column if not exists verification_sent_at timestamp with time zone null,
  add column if not exists email_verified_at timestamp with time zone null,
  add column if not exists approved_at timestamp with time zone null,
  add column if not exists rejected_at timestamp with time zone null,
  add column if not exists owner_token text null,
  add column if not exists requested_updates jsonb not null default '{}'::jsonb,
  add column if not exists image_uploads jsonb not null default '[]'::jsonb,
  add column if not exists admin_notes text null,
  add column if not exists updated_at timestamp with time zone null;

create index if not exists claim_requests_status_idx
  on public.claim_requests (status);

create unique index if not exists claim_requests_verification_token_idx
  on public.claim_requests (verification_token)
  where verification_token is not null and verification_token <> '';

create unique index if not exists claim_requests_owner_token_idx
  on public.claim_requests (owner_token)
  where owner_token is not null and owner_token <> '';

comment on column public.claim_requests.status is
  'Claim workflow status: pending, approved, rejected. Legacy values are normalized in the app.';

comment on column public.claim_requests.requested_updates is
  'Owner dashboard proposed updates. Admin must approve before applying changes to gyms.';

-- Claim system additive migration.
-- Safe rules: no DROP, no TRUNCATE, no DELETE, no column rename.

create table if not exists public.claim_requests (
  id text primary key,
  gym_id text null,
  gym_name text null,
  gym_url text null,
  reason text null,
  requester_name text null,
  requester_role text null,
  requester_email text null,
  requester_phone text null,
  message text null,
  status text not null default 'pending',
  verification_token text null,
  verification_sent_at timestamp with time zone null,
  email_verified_at timestamp with time zone null,
  approved_at timestamp with time zone null,
  rejected_at timestamp with time zone null,
  owner_token text null,
  requested_updates jsonb not null default '{}'::jsonb,
  image_uploads jsonb not null default '[]'::jsonb,
  admin_notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null
);

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

alter table public.claim_requests enable row level security;
alter table public.claim_requests force row level security;

revoke all on table public.claim_requests from anon;
revoke all on table public.claim_requests from authenticated;

comment on table public.claim_requests is
  'Backoffice table for claim/update requests. Access is intentionally blocked for anon/authenticated; server-side service role only.';

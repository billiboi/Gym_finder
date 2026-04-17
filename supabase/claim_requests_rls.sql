alter table public.claim_requests enable row level security;

alter table public.claim_requests force row level security;

revoke all on table public.claim_requests from anon;
revoke all on table public.claim_requests from authenticated;

drop policy if exists "claim_requests_public_select" on public.claim_requests;
drop policy if exists "claim_requests_public_insert" on public.claim_requests;
drop policy if exists "claim_requests_public_update" on public.claim_requests;
drop policy if exists "claim_requests_public_delete" on public.claim_requests;

comment on table public.claim_requests is
  'Backoffice table for claim/update requests. Access is intentionally blocked for anon/authenticated; server-side service role only.';

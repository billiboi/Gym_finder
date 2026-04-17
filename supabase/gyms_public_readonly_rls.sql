alter table public.gyms enable row level security;

revoke all on table public.gyms from anon;
revoke all on table public.gyms from authenticated;

grant select on table public.gyms to anon;
grant select on table public.gyms to authenticated;

drop policy if exists "gyms_public_read" on public.gyms;
drop policy if exists "gyms_public_insert" on public.gyms;
drop policy if exists "gyms_public_update" on public.gyms;
drop policy if exists "gyms_public_delete" on public.gyms;

create policy "gyms_public_read"
on public.gyms
for select
to anon, authenticated
using (true);

comment on table public.gyms is
  'Public catalog table. Read-only via RLS for anon/authenticated; writes are server-side only.';

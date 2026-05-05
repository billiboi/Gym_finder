alter table public.gyms
  add column if not exists deleted_at timestamp with time zone null;

comment on column public.gyms.deleted_at is
  'Soft-delete timestamp for archived gym records. Null means active.';

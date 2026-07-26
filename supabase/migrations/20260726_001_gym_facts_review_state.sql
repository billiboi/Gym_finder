-- Review state for public.gym_facts, backing the admin review queue at
-- /admin/qualita/fatti.
-- Additive only. Do not use DROP/TRUNCATE/DELETE. Show to the user and get
-- explicit confirmation before applying to staging or production.
--
-- Uses timestamptz throughout, never "timestamp with time zone" - the Supabase
-- SQL editor has silently dropped part of an alter table statement on that
-- spelling twice on this project (see supabase/migrations/README.md).
--
-- Why a new column instead of reusing `applied`: `applied` records a fact that
-- was written into a canonical gyms column, which is only ever true for facts
-- a human or the batch script accepted. It has no way to express "a human
-- looked at this and said no", so a rejected fact would stay indistinguishable
-- from an unreviewed one and the queue could never drain. review_status covers
-- the decision; `applied` stays what it is - the record of a canonical write.

alter table public.gym_facts
  add column if not exists review_status text not null default 'pending',
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text;

alter table public.gym_facts
  drop constraint if exists gym_facts_review_status_check;
alter table public.gym_facts
  add constraint gym_facts_review_status_check
  check (review_status in ('pending', 'approved', 'rejected'));

create index if not exists gym_facts_review_status_idx on public.gym_facts (review_status);

-- Facts promoted before this migration existed were approved by definition:
-- the batch script only ever sets applied = true after a successful write into
-- a canonical column.
update public.gym_facts
  set review_status = 'approved',
      reviewed_at = coalesce(reviewed_at, applied_at)
  where applied = true
    and review_status = 'pending';

comment on column public.gym_facts.review_status is
  'Human review decision for this fact: pending (awaiting review) / approved (accepted, written into the canonical gyms column) / rejected (looked at and refused - wrong, contaminated, or not worth publishing). Distinct from `applied`, which records whether a canonical write actually happened.';

comment on column public.gym_facts.reviewed_at is
  'Timestamp of the review decision recorded in review_status.';

comment on column public.gym_facts.review_notes is
  'Optional free-text note from the reviewer, typically why a fact was rejected.';

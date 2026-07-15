-- Repair migration: re-asserts the extended claim_requests columns from
-- 20260509_001_claim_system.sql in case the earlier manual production
-- apply (see migrations/README.md) silently dropped part of the ALTER
-- statement due to the known Supabase SQL editor paste issue with
-- "timestamp with time zone". Idempotent, additive only.
-- Safe rules: no DROP, no TRUNCATE, no DELETE, no column rename.

alter table if exists public.claim_requests
  add column if not exists gym_id text null,
  add column if not exists verification_token text null,
  add column if not exists verification_sent_at timestamptz null,
  add column if not exists email_verified_at timestamptz null,
  add column if not exists approved_at timestamptz null,
  add column if not exists rejected_at timestamptz null,
  add column if not exists owner_token text null,
  add column if not exists requested_updates jsonb not null default '{}'::jsonb,
  add column if not exists image_uploads jsonb not null default '[]'::jsonb,
  add column if not exists admin_notes text null,
  add column if not exists updated_at timestamptz null;

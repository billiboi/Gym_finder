# Supabase migrations

Migrations in this folder are the source of truth for database structure changes.

Rules:

- Use timestamped, ordered filenames: `YYYYMMDD_NNN_short_description.sql`.
- Migrations must be idempotent when practical: prefer `if not exists` and safe `drop policy if exists`.
- UI, SEO, accessibility, and performance work must not edit or apply DB migrations.
- Before applying a production migration, export the live table first and record the current row count.
- Never use a destructive migration on production without a reviewed backup, dry run plan, and explicit confirmation.

Current migration order:

1. `20260506_000_create_gyms_baseline.sql` (only needed when a staging project starts empty)
1. `20260429_001_gyms_public_readonly_rls.sql`
2. `20260429_002_claim_requests_private_rls.sql`
3. `20260429_003_add_gym_enrichment_fields.sql`
4. `20260429_004_add_gym_editorial_enrichment_fields.sql`
5. `20260505_005_add_soft_delete_to_gyms.sql`
6. `20260506_006_gyms_stability_hardening.sql`

Production apply checklist:

1. Export `public.gyms` to a timestamped local backup.
2. Verify the export row count.
3. Apply the migration SQL in staging first.
4. Verify the expected columns, audit trigger, soft-delete guard, and row count in staging.
5. Apply the same migration SQL in production.
6. Verify the live row count is unchanged.

Staging readiness:

- Use a separate Supabase project for staging.
- Configure staging-only `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, and `SUPABASE_GYMS_TABLE`.
- Never point a preview deployment at production service role credentials.
- Run imports against staging first, export staging after import, then compare counts before touching production.

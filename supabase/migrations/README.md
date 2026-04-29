# Supabase migrations

Migrations in this folder are the source of truth for database structure changes.

Rules:

- Use timestamped, ordered filenames: `YYYYMMDD_NNN_short_description.sql`.
- Migrations must be idempotent when practical: prefer `if not exists` and safe `drop policy if exists`.
- UI, SEO, accessibility, and performance work must not edit or apply DB migrations.
- Before applying a production migration, export the live table first and record the current row count.
- Never use a destructive migration on production without a reviewed backup, dry run plan, and explicit confirmation.

Current migration order:

1. `20260429_001_gyms_public_readonly_rls.sql`
2. `20260429_002_claim_requests_private_rls.sql`
3. `20260429_003_add_gym_enrichment_fields.sql`

Production apply checklist:

1. Export `public.gyms` to a timestamped local backup.
2. Verify the export row count.
3. Apply the migration SQL in order.
4. Verify the expected columns exist.
5. Verify the live row count is unchanged.

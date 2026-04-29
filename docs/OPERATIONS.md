# Operations

This document captures the safe operating path for production data and schema changes.

## Production data rule

The manually reviewed Supabase catalog is the production source of truth. Local JSON/CSV files are development and recovery material only unless a migration plan explicitly says otherwise.

Do not replace production data from local files as a convenience path.

## Before any production data change

1. Export `public.gyms` with:

```bash
bun scripts/export-supabase-gyms.mjs --env-file=.env.vercel.production.check
```

2. Record the exported filename and row count.
3. Prepare the exact write or SQL change.
4. Confirm whether the action changes rows, schema, policies, or permissions.
5. Apply the change only after explicit approval.
6. Verify the row count again.

## Schema migrations

Schema changes live in `supabase/migrations/`.

Migration naming:

```text
YYYYMMDD_NNN_short_description.sql
```

Migrations should be additive and idempotent where practical. Use `add column if not exists` and `drop policy if exists` when safe.

## Enrichment schema check

After applying the enrichment migration, verify:

```bash
bun run db:check:enrichment
```

Expected result:

```text
[check-supabase-enrichment-schema] OK table=gyms columns=social_links,price_info,price_source_url,price_updated_at,data_verified_at
```

## Deployment

The app deploys from `main` on Vercel. Normal workflow:

```bash
bun run check
git status --short
git push origin main
```

`bun run build` may require a healthy local `node_modules` installation. If Bun reports a remap/corrupted `node_modules` error, reinstall dependencies locally before using build as a release gate.

## Buyer diligence notes

For a potential acquirer or technical reviewer, the important checks are:

- `bun run check`
- Supabase migrations in `supabase/migrations/`
- production data export count before and after any DB operation
- Vercel environment variables configured for production
- RLS policies applied for `gyms` and `claim_requests`

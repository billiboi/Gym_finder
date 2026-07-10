# Operations

This document captures the safe operating path for production data and schema changes.

## Supabase environments — which env file points to what

There are **two separate, independently-writable Supabase projects**, not a staging/production split of the same project:

| Env file | Points to | Role |
|---|---|---|
| `.env.vercel.production.check` | The real production project (`opcd...`) — what Vercel production and `www.palestreinzona.it` actually read | **Source of truth.** |
| `.env.staging.local` | A separate, forked project (`wftd...`) | Rehearsal/dry-run environment for scripts. **Not** a live mirror of production — it drifts and must be manually resynced. |

They diverged around mid-May 2026 (see `docs/audit/staging-production-diff-2026-07.md` for the full diff and `docs/ROADMAP.md` priority 1 for the incident). Discovered 2026-07-10 while debugging a gym that was invisible on the live site despite passing every filter — it was archived in production but active in staging, and every verification that session had used staging.

**Rules that follow from this:**

- Any check of "is this live", "did this take effect on the site", "does production have X" must query `.env.vercel.production.check` directly (or hit `www.palestreinzona.it` itself) — never infer it from staging, a local dev server, or a Vercel Preview deployment (Previews use the staging project).
- A script defaulting to `.env.staging.local` is safe to run freely (rehearsal only) — it has **zero effect on the live site** until the same action is deliberately re-run with `--env-file=.env.vercel.production.check` and the full protocol below.
- `sync:gyms:prod` (`scripts/sync-supabase-gyms.mjs --env-file=.env.vercel.production.check`) writes `data/gyms.json` straight into production via upsert. That local file is not kept in lockstep with production's live enrichment edits — running this with `--write --confirm` can silently revert recent production edits for any matching id. Treat it as a disaster-recovery/seed tool, not a routine sync; diff `data/gyms.json` against a fresh production export first.
- To re-check or re-align the two projects: `bun scripts/audit-staging-production-diff.mjs` (read-only, writes `docs/audit/staging-production-diff-2026-07.md`) and `bun scripts/reconcile-staging-with-production.mjs` (staging-only writes, dry-run by default, needs `--confirm-apply`).

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

## Description engine rollout

The description engine separates owner, editorial, generated, and public copy. It must be rolled out in two steps: additive schema first, generated copy second.

Staging is the proving ground. Production requires a fresh export, exact row counts, dry-run review, and explicit approval before any write.

### 1. Additive schema

Apply this migration manually in Supabase SQL editor:

```text
supabase/migrations/20260519_001_gym_description_fields.sql
```

The migration only uses `add column if not exists`; it must not drop, truncate, delete, rename, or reset anything.

### 2. Backup before production apply

Export production `public.gyms` before any write:

```bash
bun scripts/export-supabase-gyms.mjs --env-file=.env.vercel.production.check --out=data/supabase-gyms-production-before-descriptions-YYYYMMDD-HHMMSS.json
```

Record the reported count and keep the file out of git.

### 3. Production dry-run

Generate the preview files without writing:

```bash
bun scripts/generate-gym-descriptions.ts --mode=dry-run --env-file=.env.vercel.production.check --allow-production
```

Review the generated JSON/CSV in `data/`. Confirm:

- total and active counts match expectations
- no owner or editorial descriptions are overwritten
- rows marked `needs_review=true` have no public generated copy
- contaminated or uncertain descriptions remain review-only

### 4. Production apply

Apply only after explicit approval and after the dry-run report has been reviewed:

```bash
bun scripts/generate-gym-descriptions.ts --mode=apply --env-file=.env.vercel.production.check --allow-production --confirm-apply
```

The script writes generated description metadata to additive columns. Rows marked `needs_review=true` keep `descrizione_pubblica` empty so the public frontend falls back to safe copy.

### 5. Verify after apply

Export again and compare counts:

```bash
bun scripts/export-supabase-gyms.mjs --env-file=.env.vercel.production.check --out=data/supabase-gyms-production-after-descriptions-YYYYMMDD-HHMMSS.json
```

Then verify:

- total row count unchanged
- active row count unchanged
- `descrizione_generata` populated for generated candidates
- `descrizione_pubblica` populated only for rows not marked review
- public pages do not expose generated copy for `descrizione_needs_review=true`
- representative homepage, zone, discipline, and gym detail URLs still render

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

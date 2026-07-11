# Scripts Directory

These scripts support data import, normalization, inspection, and cleanup workflows.

## Main Reusable Scripts

- `export-supabase-gyms.mjs`
  Exports the live Supabase `gyms` table to a timestamped local JSON backup. Use before any production data change.

- `build-recovery-gyms-from-csv.mjs`
  Builds a local JSON recovery file from a CSV source. It never writes to Supabase and defaults to a timestamped output file; use `--source=...`, optional `--out=...`, and optional `--limit=...`.

- `check-supabase-enrichment-schema.mjs`
  Verifies that enrichment columns exist on the production `gyms` table.

- `check-supabase-staging-readiness.mjs`
  Checks a staging Supabase target before applying migrations. It refuses production-like targets unless explicitly overridden.

- `set-vercel-preview-envs.mjs`
  Sets Vercel Preview environment variables from `.env.staging.local` using a local `VERCEL_TOKEN`. It never targets production.

- `vercel-preview-status.mjs`
  Lists the latest Vercel Preview deployment URL for the linked project without exposing secrets.

- `report-gym-content-enrichment.mjs`
  Generates a read-only report of gyms with websites and missing editorial, social, or price enrichment.

- `sync-supabase-gyms.mjs`
  Safe-upserts local records into Supabase after a dry run and backup. It must not delete existing records or replace the production catalog.

- `sync-official-overrides-enrichment.mjs`
  Dry-runs or applies the reviewed official-source overrides into additive Supabase editorial fields. Requires `--apply` to write.

- `sync-reviewed-enrichment-batch.mjs`
  Dry-runs or applies a reviewed JSON batch by immutable gym `id`. Use `--batch=content/enrichment/<file>.json`; requires `--apply` to write.

- `generate-gym-descriptions.ts`
  Audits and generates safe public gym descriptions. Default commands use staging. `audit` and `dry-run` never write. `apply` requires `--confirm-apply`, and production-like targets require the additional `--allow-production` flag after a reviewed backup and dry-run.

- `audit-gym-contamination.ts`, `fix-gym-contamination-preview.ts`, `apply-gym-contamination-fixes.ts`
  Audit possible public data contamination, generate a non-destructive fix preview, and apply only additive review fields after confirmation. Default commands use staging. Run `supabase/migrations/20260521_001_gym_contamination_audit_fields.sql` before apply if the target schema does not have the audit fields.

- `check-sitemap-no-legacy-urls.mjs`
  Verifies that a sitemap contains no `/palestre/...csv-*` URLs. Use `bun run seo:check:sitemap -- --url=https://www.palestreinzona.it/sitemap.xml` or `bun run seo:check:sitemap -- --file=path/to/sitemap.xml`.

- `check-archived-gym-urls.mjs`
  Verifies that archived gym URLs from a CSV return 404 or 410. Use `bun run seo:check:archived -- --csv=path/to/archived.csv --base-url=https://www.palestreinzona.it`. The CSV may include `url`, `slug`, `old_url`, `old_slug`, `legacy_url`, or `legacy_slug`, plus `deleted_at`, `archived`, or `status=410`.

- `check-legacy-gym-redirects.mjs`
  Verifies that active legacy `csv-*` gym URLs from a CSV return 301 to clean URLs. Use `bun run seo:check:legacy -- --csv=path/to/legacy.csv --base-url=https://www.palestreinzona.it`. The CSV may include `old_url`/`old_slug` and `new_url`/`new_slug` pairs.

- `check-archived-public-csv-drift.mjs`
  Compares an exported archived gyms CSV against public fallback CSV files and fails if archived gyms still appear publicly. Use `bun run seo:check:archived-csv-drift -- --archived=path/to/archived-gyms.csv`. Defaults to `data/palestre.csv,static/palestre.csv`; override with `--public-files=file1.csv,file2.csv`. The report is printed as CSV to stdout unless `--out=path/report.csv` is provided.

- `clean-palestre-dataset.cjs`
  Cleans the main CSV dataset, removes noisy records, and restores discipline labels.

- `format-palestre-csv.mjs`
  Rewrites the CSV into a more readable human-friendly format.

- `export-csv.mjs`
  Exports the normalized dataset.

- `normalize-user-dataset.mjs`
  Applies normalization rules to the user-facing dataset.

## Import-Oriented Scripts

- `import-varese-gyms.mjs`
- `import-varese-combat.mjs`
- `import-varese-combat-nominatim.mjs`
- `import-lugano-xlsx.ps1`
- `import-castelveccana-50km.ps1`

These are task-specific import helpers used during dataset building.

## Inspection / Reporting Scripts

- `inspect-overpass.mjs`
- `inspect-sources.mjs`
- `report-import.mjs`
- `report-combat.mjs`
- `post-normalize-report.mjs`
- `verify-cleaning.mjs`

## Notes

- Script filenames are intentionally preserved to avoid breaking existing local workflows.
- New reusable scripts should prefer English naming unless there is a strong compatibility reason not to rename or replace an older one.
- Scripts that mutate production data must create or require a reviewed backup path and should default to dry-run behavior where possible.
- Scripts must not use physical `DELETE` on `public.gyms`; archive records with `deleted_at` instead.

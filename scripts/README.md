# Scripts Directory

These scripts support data import, normalization, inspection, and cleanup workflows.

## Main Reusable Scripts

- `export-supabase-gyms.mjs`
  Exports the live Supabase `gyms` table to a timestamped local JSON backup. Use before any production data change.

- `build-recovery-gyms-from-csv.mjs`
  Builds a local JSON recovery file from a CSV source. It never writes to Supabase and defaults to a timestamped output file; use `--source=...`, optional `--out=...`, and optional `--limit=...`.

- `check-supabase-enrichment-schema.mjs`
  Verifies that enrichment columns exist on the production `gyms` table.

- `report-gym-content-enrichment.mjs`
  Generates a read-only report of gyms with websites and missing editorial, social, or price enrichment.

- `sync-official-overrides-enrichment.mjs`
  Dry-runs or applies the reviewed official-source overrides into additive Supabase editorial fields. Requires `--apply` to write.

- `sync-reviewed-enrichment-batch.mjs`
  Dry-runs or applies a reviewed JSON batch by immutable gym `id`. Use `--batch=content/enrichment/<file>.json`; requires `--apply` to write.

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

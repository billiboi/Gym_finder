# Scripts Directory

These scripts support data import, normalization, inspection, and cleanup workflows.

## Main Reusable Scripts

- `export-supabase-gyms.mjs`
  Exports the live Supabase `gyms` table to a timestamped local JSON backup. Use before any production data change.

- `check-supabase-enrichment-schema.mjs`
  Verifies that enrichment columns exist on the production `gyms` table.

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

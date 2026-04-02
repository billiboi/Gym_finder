# Scripts Directory

These scripts support data import, normalization, inspection, and cleanup workflows.

## Main Reusable Scripts

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

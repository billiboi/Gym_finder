# Data Directory

This directory contains project datasets and import sources.

## Active Files

- `palestre.csv`
  Project-side CSV dataset used by local persistence helpers and fallback workflows.

- `gyms.json`
  JSON snapshot used as an additional local data source.

Production data lives in Supabase. These local files are not the production source of truth unless a reviewed migration or recovery plan explicitly says otherwise.

## Reference / Historical Inputs

- `Arti Marziali Lugano Ale.xlsx`
- `Data Ale - Ticino + Varese.xlsx`
- `palestre_formattato.csv`

These files are kept as source material or historical references. They are not the primary runtime source for the public app.

## Ignored Local Backups

Large temporary backups should stay untracked. See `.gitignore` for the ignored backup filenames currently used in this workspace.

Supabase exports should use names such as `data/supabase-gyms-export-YYYY-MM-DDTHH-MM-SS.json`; these are ignored by git.

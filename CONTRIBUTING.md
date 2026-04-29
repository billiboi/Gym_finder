# Contributing to Palestre in Zona

Thanks for contributing.

This project is intentionally lightweight, but it already includes:
- a public discovery experience
- admin workflows
- CSV-based local persistence
- optional Supabase persistence for production

Please keep changes focused, readable, and easy to review.

## Development Workflow

1. Install dependencies:

```bash
bun install
```

2. Run local checks:

```bash
bun run check
```

3. Start the development server:

```bash
bun run dev
```

## Code Style

- Prefer small, explicit helpers over large implicit logic blocks.
- Use ASCII by default unless the file already requires Unicode.
- Keep comments rare and useful.
- Do not add explanatory comments for obvious assignments or markup.
- When editing UI copy, keep it concise and intentional.

## Data and Persistence

- Local development relies on `data/palestre.csv` and `static/palestre.csv`.
- The manually reviewed Supabase catalog is the production source of truth.
- Production writes should go through Supabase server-side flows.
- Before production data changes, export the live table, record the row count, review the exact write, and verify the row count after the change.
- Do not replace production data from local JSON/CSV files as a shortcut.
- Do not commit temporary CSV exports, personal backups, or ad hoc import artifacts.

## Database Changes

- Schema and policy changes belong in `supabase/migrations/`.
- Use timestamped migration names such as `20260429_003_add_gym_enrichment_fields.sql`.
- Prefer additive, idempotent migrations.
- Do not apply production migrations as part of unrelated UI, SEO, accessibility, or performance work.

## Repository Hygiene

- Keep temporary files out of the repository.
- Avoid committing local environment dumps or scratch scripts.
- Document new scripts in `scripts/README.md` if they are meant to be reused.
- Keep secrets in local environment files or Vercel, never in committed files.

## Pull Request Guidance

When opening a change, include:
- what changed
- why it changed
- whether `bun run check` passed
- whether the change affects data flow, admin writes, migrations, permissions, or deployment behavior

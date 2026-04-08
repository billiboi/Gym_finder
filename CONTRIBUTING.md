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
- Production writes should go through Supabase.
- Do not commit temporary CSV exports, personal backups, or ad hoc import artifacts.

## Repository Hygiene

- Keep temporary files out of the repository.
- Avoid committing local environment dumps or scratch scripts.
- Document new scripts in `scripts/README.md` if they are meant to be reused.

## Pull Request Guidance

When opening a change, include:
- what changed
- why it changed
- whether `bun run check` passed
- whether the change affects data flow, admin writes, or deployment behavior

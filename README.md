# Pocket Gym

[![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

Pocket Gym is a mobile-first directory for gyms and martial arts clubs. It helps users discover nearby training facilities, browse discipline-specific listings, and open a full detail page for each gym.

The project is built with SvelteKit and Tailwind CSS, uses Leaflet for maps, and supports two persistence modes:
- local CSV files for development or lightweight editing
- Supabase for production-grade writes

## Current Product Scope

- Public gym discovery page with:
  - text search
  - discipline filters
  - open/closed filter
  - location-aware ranking
  - interactive map with clustering
- Full detail page for each gym
- Admin area for:
  - create, update, and delete
  - bulk discipline reclassification
  - fallback image previews
- Branded fallback media system:
  - uploaded gym image
  - optional stock image by discipline
  - branded SVG placeholder

## Tech Stack

- SvelteKit
- Tailwind CSS
- Vite
- Leaflet
- Supabase
- Bun

## Getting Started

```bash
bun install
bun run dev
```

Useful commands:

```bash
bun run check
bun run build
bun run preview
```

## Environment Variables

Supabase is optional locally, but required if you want persistent writes in production.

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_GYMS_TABLE` (optional, defaults to `gyms`)

## Supabase Schema

```sql
create table if not exists public.gyms (
  id text primary key,
  name text not null,
  discipline text not null,
  disciplines jsonb not null default '[]'::jsonb,
  address text not null default '',
  city text not null default '',
  phone text not null default '',
  hours_info text not null default 'Orari da verificare',
  website text not null default '',
  description text not null default '',
  latitude double precision,
  longitude double precision,
  image_url text not null default '',
  weekly_hours jsonb not null default '{}'::jsonb
);
```

## Data Flow

### Local mode

- reads from `static/palestre.csv`
- keeps project-side CSV/JSON data aligned through the server store helpers

### Production mode

- reads and writes through Supabase
- admin writes require the schema above to be in sync

## Project Structure

```text
src/
  lib/
    components/        Shared UI components
    server/            Data access and persistence helpers
  routes/
    +page.svelte       Public discovery page
    palestre/[slug]/   Public gym detail page
    admin/             Admin area
    api/               JSON endpoints
static/
  images/             Brand assets, placeholders, optional stock photos
  uploads/            Uploaded cover images
  palestre.csv        Public fallback dataset
data/
  palestre.csv        Project-side source dataset
```

## Image Fallback Strategy

Gym covers follow this order:

1. uploaded image (`image_url`)
2. committed stock photo for the primary discipline
3. branded SVG placeholder

Stock discipline images can be placed in `static/images/stock/`.
Supported extensions are tried automatically in this order:

1. `.webp`
2. `.jpg`
3. `.jpeg`
4. `.png`

See `static/images/stock/README.md` for the expected base filenames.

## Notes for Contributors

- Keep public-facing UI copy intentional and concise.
- Prefer small, explicit helpers over large implicit data transforms.
- Add comments only where the code would otherwise be hard to decode quickly.
- Do not commit temporary import files, local check artifacts, or backup CSVs.

## Repository Docs

- `CONTRIBUTING.md` for contribution guidelines
- `data/README.md` for dataset scope
- `scripts/README.md` for script purpose and reuse notes
- `legacy/README.md` for archived backend context
- `LICENSE` for repository licensing

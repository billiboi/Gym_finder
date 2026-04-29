# Palestre in Zona

[![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

Palestre in Zona is a mobile-first public directory for gyms, fitness clubs, and sport disciplines. The product is designed for fast local discovery: users search by city, gym, or discipline, compare cards, and open structured detail pages with contacts, hours, directions, websites, prices, and future enrichment fields.

## Product Scope

- Public discovery page with immediate search, discipline filters, open/closed filtering, distance-aware sorting, and compact result cards.
- Public gym detail pages with contact actions, website links, opening hours, map/directions, SEO metadata, FAQ-style content, and claim/update flows.
- Public SEO landing pages for zones and disciplines.
- Admin area for reviewing and editing gym records.
- Supabase-backed production catalog with local CSV/JSON fallback for development and recovery.
- Versioned Supabase migrations for schema and policy changes.

## Tech Stack

- SvelteKit
- Tailwind CSS
- Vite
- Supabase
- Vercel
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
bun run db:check:enrichment
```

## Environment

Copy `.env.example` and configure values locally or in Vercel:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_GYMS_TABLE=gyms
SUPABASE_CLAIMS_TABLE=claim_requests
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Do not expose it to client-side code.

## Data Model

The active production table is `public.gyms`.

Core fields:

```sql
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
```

Enrichment fields:

```sql
social_links jsonb not null default '[]'::jsonb,
price_info text,
price_source_url text,
price_updated_at timestamptz,
data_verified_at timestamptz
```

Schema changes are tracked in `supabase/migrations/`.

## Data Safety

The manually reviewed Supabase catalog is the production source of truth. Local files under `data/` and `static/` are fallback, development, import, or recovery material unless a reviewed migration plan states otherwise.

Before any production data change:

1. Export `public.gyms`.
2. Verify and record the row count.
3. Review the exact change.
4. Apply only after explicit approval.
5. Verify the row count again.

See `docs/OPERATIONS.md` for the full production checklist.

## Repository Structure

```text
src/
  lib/
    components/        Shared public UI components
    server/            Data access and persistence helpers
  routes/
    +page.svelte       Public discovery page
    +error.svelte      Public error page
    palestre/[slug]/   Public gym detail page
    zone/              Location landing pages
    discipline/        Discipline landing pages
    admin/             Admin area
    api/               JSON endpoints
supabase/
  migrations/          Versioned schema and policy changes
data/                  Local datasets, imports, backups excluded by gitignore
static/
  images/              Brand assets, placeholders, optional stock photos
  uploads/             Uploaded cover images, ignored except .gitkeep
scripts/               Import, export, verification, and maintenance scripts
legacy/                Archived Python backend context
docs/                  Operational documentation
```

## Image Fallback Strategy

Gym covers follow this order:

1. uploaded image (`image_url`)
2. committed stock photo for the primary discipline
3. branded SVG placeholder

Stock discipline images can be placed in `static/images/stock/`.

## Documentation

- `docs/OPERATIONS.md` for production operations and buyer diligence checks
- `supabase/migrations/README.md` for database migration rules
- `CONTRIBUTING.md` for contribution guidelines
- `data/README.md` for dataset scope
- `scripts/README.md` for script purpose and reuse notes
- `legacy/README.md` for archived backend context
- `LICENSE` for repository licensing

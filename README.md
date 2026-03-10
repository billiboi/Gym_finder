# Gym Finder

Interfaccia web per cercare palestre e arti marziali in Ticino e dintorni, con filtri rapidi e mappa interattiva. Progettata per funzionare sia in locale (CSV) sia in produzione con persistenza su Supabase.

## Caratteristiche principali
- Schede palestra con orari, contatti, discipline e distanza.
- Filtri per disciplina, stato apertura, testo libero e raggio km.
- Mappa con marker sincronizzati ai filtri attivi.
- Tema light/dark con toggle.
- Area admin per modificare ed eliminare schede.

## Flusso dati
- In locale: lettura/scrittura su `static/palestre.csv` e `data/palestre.csv`.
- In produzione: lettura/scrittura su Supabase (tabella `gyms`).

## Stack
- SvelteKit + Vite
- Tailwind CSS
- Leaflet (mappa)
- Supabase (persistenza in produzione)

## Avvio rapido
```bash
bun install
bun run dev
```

## Script utili
```bash
bun run build
bun run preview
bun run check
```

## API
- `GET /api/gyms`
  - query params opzionali:
    - `q`
    - `discipline`
    - `open_state=all|open|closed`
    - `lat`, `lng`
    - `radius_km`
- `GET /api/disciplines`

## Admin e persistenza
Area admin:
- `/admin`
- `/admin/gyms/[id]`
- `/admin/schede`

Per rendere le modifiche persistenti anche in produzione (Vercel), configura Supabase.

### Variabili ambiente
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_GYMS_TABLE` (opzionale, default: `gyms`)

### SQL tabella `gyms`
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
  latitude double precision,
  longitude double precision,
  image_url text not null default '',
  weekly_hours jsonb not null default '{}'::jsonb
);
```

## Struttura progetto (principale)
- `src/routes/+page.svelte`: UI pubblica e mappa
- `src/routes/admin/*`: area admin
- `src/routes/api/*`: API per palestre e discipline
- `static/palestre.csv`: dataset di fallback

## Deploy
Consigliato Vercel. Collegare il repository e impostare le variabili Supabase in produzione.

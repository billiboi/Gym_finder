# Gym Finder - Pagina Utente

Interfaccia utente per trovare palestre vicine con priorita' alla distanza dalla posizione corrente.

## Funzionalita'
- visualizzazione di tutte le palestre in schede
- filtro per tipologia (disciplina)
- filtro per stato aperta/chiusa (in tempo reale)
- filtro per distanza (raggio in km)
- ordinamento automatico per vicinanza quando la posizione utente e' disponibile

## Dataset demo
- 20 palestre esempio in `data/gyms.json`
- ogni palestra include coordinate geografiche e orari settimanali

## API
- `GET /api/gyms`
  - query params opzionali:
    - `q`
    - `discipline`
    - `open_state=all|open|closed`
    - `lat`, `lng`
    - `radius_km`
- `GET /api/disciplines`

## Avvio
```bash
bun install
bun run dev
```


## Admin e Persistenza
L'area admin e' disponibile su:
- `/admin`
- `/admin/gyms/[id]`

Per rendere le modifiche persistenti anche in produzione (Vercel), configura Supabase.

### 1) Variabili ambiente
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_GYMS_TABLE` (opzionale, default: `gyms`)

### 2) SQL tabella `gyms`
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

Note:
- in locale, senza Supabase, il salvataggio usa filesystem (`data/palestre.csv` e `static/palestre.csv`)
- in produzione, se Supabase e' configurato, l'admin salva su DB e la UI legge da DB

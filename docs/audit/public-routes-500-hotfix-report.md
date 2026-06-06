# Public Routes 500 Hotfix Report

## 1. Causa esatta dei 500

Le route pubbliche rotte usavano query Supabase autonome e rigide, separate dal percorso tollerante gia usato da `/api/gyms`.

Pattern problematici confermati:

- colonne fisse non verificate;
- `deleted_at=is.null` rigido;
- `order=priority_score.desc.nullslast,nome.asc.nullslast` rigido;
- `throw new Error(...)` su errore Supabase;
- nessun fallback pubblico quando Supabase restituisce errore o zero righe.

In produzione questo trasformava un errore gestibile di query/schema/RLS in `500` per `/zone`, `/discipline`, route dinamiche e sitemap.

## 2. File modificati

- `src/lib/server/gym-store.js`
- `src/routes/zone/+page.server.js`
- `src/routes/discipline/+page.server.js`
- `src/routes/zone/[slug]/+page.server.js`
- `src/routes/discipline/[slug]/+page.server.js`
- `src/routes/palestre/[slug]/+page.server.js`
- `src/routes/sitemap.xml/+server.js`
- `docs/audit/public-routes-500-hotfix-report.md`

## 3. Route sistemate

- `/zone`
- `/discipline`
- `/zone/[slug]`
- `/discipline/[slug]`
- `/palestre/[slug]`
- `/sitemap.xml`

## 4. Nuovi helper o fallback usati

Introdotto in `gym-store.js`:

- `readPublicRouteGyms({ limit = 5000 })`

Il helper usa il catalogo locale/statico gia disponibile tramite `readLocalGyms()`, incluso il fallback read-only su `static/palestre.csv` pubblico in runtime Vercel. Non interroga Supabase con catalogo completo e non usa `select=*`.

Le route pubbliche ora:

- degradano a `readPublicRouteGyms()` se Supabase fallisce;
- degradano a fallback se Supabase restituisce zero righe;
- non propagano piu errori Supabase come `500`;
- mantengono 404/410/301 dove la logica esistente lo prevede.

## 5. Select=* globale

Non e stato introdotto nessun nuovo `select=*`.

Il legacy `readGymsFromSupabase()` resta presente nel codice, ma questo hotfix non lo usa per le route pubbliche corrette.

## 6. Full catalog homepage

Non e stato reintrodotto il full catalog automatico in homepage.

La homepage continua a usare la prima pagina SSR e `/api/gyms` resta paginato.

## 7. Route testate

Status production prima, dal report precedente:

| Route | Prima production | Dopo locale | Dopo production |
|---|---:|---:|---:|
| `/` | 200 | 200 | 200 |
| `/api/gyms` | 200 | 200 | 200 |
| `/zone` | 500 | 200 | 200 |
| `/discipline` | 500 | 200 | 200 |
| `/guide` | 200 | non ritestata nel retry finale | non ritestata production post-deploy |
| `/chi-siamo` | 200 | non ritestata nel retry finale | non ritestata production post-deploy |
| `/per-le-palestre` | 200 | non ritestata nel retry finale | non ritestata production post-deploy |
| `/zone/varese` | 500 | 200 | 200 |
| `/zone/lugano` | 500 | non ritestata nel retry finale | 200 |
| `/discipline/fitness` | 500 | 200 | 200 |
| `/discipline/yoga` | 500 | non ritestata nel retry finale | 200 |
| `/sitemap.xml` | 500 | 200 | 200 |
| `/palestre/first-studio-personal-trainer` | 500 | 404 nella prima verifica locale parziale | 404 |
| `/palestre/piscina-acquatic-club-ticino-csv-481` | 500 | 404 nella prima verifica locale parziale | 404 |
| `/palestre/nonstop-gym-bellinzona-csv-404` | 500 | non completata | 404 |
| `/palestre/lugano-wellness-csv-361` | 500 | non completata | 404 |
| `/palestre/activ-fitness-losone-csv-30` | 500 | non completata | 301 |

Nota: per le schede palestra, il fix garantisce che errori Supabase gestibili non diventino `500`. Gli slug inesistenti o non piu risolvibili possono correttamente diventare `404`; gli archiviati restano `410`; i legacy validi restano candidati a `301`.

## 8. Errori o test non eseguiti

- `bun run check`: OK.
- Dev server locale:
  - primo tentativo instabile, alcuni status `000`, poi timeout;
  - secondo tentativo mirato riuscito sui target principali.
- `bun run build`: client e SSR compilano; fallisce nello step adapter Vercel per symlink Windows noto: `EPERM: operation not permitted, symlink '![-]\catchall.func'`.
- Non e stato eseguito browser click completo: il problema era HTTP route-level e il markup nav era gia stato verificato nel report precedente.
- Verifica production post-deploy: le route che erano `500` non restituiscono piu `500`; gli slug scheda indicati ora restituiscono `404` o `301` controllati.

## 9. Rischi residui

- Il fallback statico e un hotfix: rende il pubblico stabile, ma i dati possono divergere dalla tabella Supabase se production DB/env resta configurata male.
- Alcuni slug palestra legacy possono tornare `404` se non sono presenti nel catalogo statico o se lo slug canonico differisce.
- I numeri globali restano incoerenti; questo hotfix non li modifica per vincolo di scope.

## 10. Verifica manuale in produzione

Dopo deploy verificare:

- `/zone` non deve essere `500`.
- `/discipline` non deve essere `500`.
- `/zone/varese` e `/zone/lugano` devono essere `200` o 404 controllato, mai `500`.
- `/discipline/fitness` e `/discipline/yoga` devono essere `200` o 404/410 controllato, mai `500`.
- `/sitemap.xml` deve essere `200`.
- Una scheda cliccata dalla homepage deve aprire o redirigere correttamente.
- Gli slug specifici indicati nel task devono essere diversi da `500`.

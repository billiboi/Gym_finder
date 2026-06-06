# Public Archived Gyms Hotfix Report

## 1. Causa esatta

Le query Supabase pubbliche usavano spesso `deleted_at=is.null`, ma il filtro non era centralizzato. I fallback locali/statici usati da `readPublicRouteGyms()` e `readPublicGymListing()` potevano quindi restituire record con `deleted_at`, `weekly_hours._deleted_at`, `archived` o `is_archived` valorizzati.

Il rischio principale era il fallback CSV/JSON/statico, non le query Supabase già filtrate.

## 2. File modificati

- `src/lib/server/gym-store.js`
- `src/routes/+page.server.js`
- `src/routes/api/gyms/+server.js`
- `src/routes/zone/+page.server.js`
- `src/routes/zone/[slug]/+page.server.js`
- `src/routes/discipline/+page.server.js`
- `src/routes/discipline/[slug]/+page.server.js`
- `src/routes/palestre/[slug]/+page.server.js`
- `src/routes/sitemap.xml/+server.js`

## 3. Helper pubblico

Introdotto `isPublicActiveGym(gym)` in `src/lib/server/gym-store.js`.

Regole:

- record mancante/non oggetto: non pubblico;
- `deleted_at` o `weekly_hours._deleted_at`: non pubblico via `isArchivedGym()`;
- `deletedAt`: non pubblico;
- `archived` / `is_archived` booleani o stringhe tipo `true`, `1`, `yes`, `si`, `sì`: non pubblico;
- campi assenti: considerati attivi per compatibilità con CSV legacy.

## 4. Dove è stato applicato il filtro

- `/api/gyms`: filtra `listing.items` con `isPublicActiveGym`.
- Homepage SSR: filtra `initialGyms` con `isPublicActiveGym`.
- `readPublicGymListing()` Supabase/local: filtra gli item pubblici prima di restituire.
- `readPublicRouteGyms()`: restituisce solo item attivi.
- Fallback statico remoto `palestre.csv`: filtra solo item attivi.
- `/zone` e `/discipline`: filtra righe normalizzate prima dei builder SEO.
- `/zone/[slug]` e `/discipline/[slug]`: filtra sorgenti e matched gyms.
- `/palestre/[slug]`: filtra schede correlate; il dettaglio continua a restituire 410 per archiviate trovate da Supabase.
- `/sitemap.xml`: filtra sorgente e indexable gyms con `isPublicActiveGym`.

## 5. Esempi schede archiviate testate

Esempi individuati da backup locale `data/supabase-gyms-staging-before-discipline-normalization-20260516-125721.json`:

| id | nome | deleted_at |
|---|---|---|
| `gym-5852d918-c6a5-47d6-a63e-8ac995ef87de` | Codex Preview Admin Test 20260507104945 | `2026-05-07T08:50:01.207+00:00` |
| `import-test-20260507105751` | Codex Import Test 20260507105751 | `2026-05-07T08:58:03.671+00:00` |
| `test-direct-35cda3482b864359b941accf69d809fa` | Direct Supabase Test | `2026-05-07T09:05:14.804772+00:00` |

## 6. Conferme API/listing

- `/api/gyms?limit=24&offset=0`: 200, 24 item.
- `/api/gyms?limit=24&offset=24`: 200, 24 item.
- Payload combinato delle prime due pagine: `archived_in_payload=0`.

## 7. Conferme homepage/zone/discipline/sitemap

- Homepage locale: 200.
- `/zone`: 200.
- `/discipline`: 200.
- `/sitemap.xml`: non completato nel controllo locale perché il dev server si è fermato prima della richiesta; il codice sitemap ora filtra con `isPublicActiveGym` sia le righe Supabase sia il fallback.

## 8. Select globale

Non è stato introdotto nessun nuovo `select=*`.

Resta invariata la funzione legacy `readGymsFromSupabase()` con `select=*`, non usata dalle nuove uscite pubbliche oggetto di questo hotfix.

## 9. Full catalog homepage

Non è stato reintrodotto il full catalog automatico in homepage. La homepage resta su `readPublicGymListing({ limit: 24, offset: 0 })` e load-more paginato via `/api/gyms`.

## 10. Test eseguiti

- `bun run check`: OK, 0 errori e 0 warning Svelte.
- `bun run build`: client e SSR compilati; fallimento finale noto su adapter Vercel Windows symlink.
- Dev server locale:
  - `/api/gyms?limit=24&offset=0`: 200.
  - `/api/gyms?limit=24&offset=24`: 200.
  - `/`: 200.
  - `/zone`: 200.
  - `/discipline`: 200.
- Verifica API locale: prime due pagine senza record archiviati nel payload.

## 11. Errori o test non eseguiti

- `/sitemap.xml` non verificato via HTTP locale: il dev server si è fermato prima della richiesta nel tentativo unico.
- Nessuna verifica Supabase reale eseguita.
- Nessuna verifica browser eseguita.

## 12. Rischi residui

- Se produzione espone una colonna di archiviazione con nome diverso da `deleted_at`, `deletedAt`, `archived`, `is_archived` o `weekly_hours._deleted_at`, serve aggiungerla esplicitamente all'helper.
- La route dettaglio può restituire 404 invece di 410 per una scheda archiviata quando Supabase non è disponibile e il fallback pubblico la filtra prima della risoluzione.

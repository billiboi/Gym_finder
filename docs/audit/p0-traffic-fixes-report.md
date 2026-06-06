# P0 Traffic Fixes Report

## 1. File modificati

- `src/lib/server/gym-store.js`
- `src/lib/gym-client.js`
- `src/routes/api/gyms/+server.js`
- `src/routes/+page.server.js`
- `src/routes/+page.svelte`
- `src/routes/zone/[slug]/+page.svelte`

## 2. Cosa e stato cambiato

- Aggiunta una lettura pubblica dedicata `readPublicGymListing()` con proiezione minima, `limit`, `offset` e `hasMore`.
- Aggiunto `readPublicGymCount()` con `HEAD` + `Prefer: count=planned`, senza scaricare righe.
- Aggiunto DTO `publicListingGym()` per evitare campi pesanti nel payload listing.
- `/api/gyms` ora usa la listing paginata invece di `readGyms()`.
- Homepage SSR ora carica solo i primi 24 record tramite listing minima.
- Homepage client non fa piu `fetch('/api/gyms')` automatico per idratare tutto il catalogo.
- `zone/[slug]` e stato aggiornato solo per compatibilita con il nuovo formato `{ items, limit, offset, hasMore }`.

## 3. Query che non usano piu `select=*`

- Homepage SSR: non chiama piu `readGyms()`, usa `readPublicGymListing({ limit: 24, offset: 0 })`.
- `/api/gyms`: non chiama piu `readGyms()`, usa `readPublicGymListing()`.
- Listing pubblico Supabase seleziona solo:
  `id, slug, name, nome, city, citta, address, indirizzo, discipline, disciplines, latitude, longitude, lat, lng, is_verified, is_premium, priority_score, deleted_at, updated_at, hours_info, orari, phone, telefono, website, sito, image_url`.
- Count homepage usa `HEAD /rest/v1/gyms?select=id&deleted_at=is.null`.

Nota: `readGymsFromSupabase()` conserva ancora `select=*` per flussi legacy/admin/SEO non inclusi in questo step P0. Non e piu usato da homepage SSR o `/api/gyms`.

## 4. Nuovo comportamento di `/api/gyms`

- Risposta ora oggetto:
  - `items`
  - `limit`
  - `offset`
  - `hasMore`
- Default `limit`: 24.
- Max `limit`: 100.
- Default `offset`: 0.
- Se mancano parametri, non restituisce piu tutto il catalogo.
- `hasMore` usa richiesta `limit + 1`, evitando `total` pesante.
- Payload listing non include `description`, `editorial_summary` o `price_info`.

## 5. Nuovo comportamento homepage

- SSR carica solo 24 record iniziali con campi minimi.
- Il conteggio totale usa una richiesta `HEAD` leggera quando Supabase e disponibile.
- Il client non pianifica piu l'idratazione automatica del catalogo completo.
- “Mostra altre” carica la pagina successiva da `/api/gyms?limit=24&offset=...`.
- Ricerca esplicita ricarica una pagina filtrata, senza scaricare tutto.

## 6. Test eseguiti

- `bun run check`: OK, 0 errori e 0 warning Svelte.
- `bun run build`: compilazione Vite client/SSR completata, ma adapter Vercel fallisce in ambiente locale su symlink.
- Dev server locale: avviato con `bun run dev -- --host 127.0.0.1 --port 5173`.
- Homepage locale: `GET /` restituisce 200 e contiene il titolo hero.
- `/api/gyms`: restituisce `items.length=24`, `limit=24`, `offset=0`, `hasMore=true`, non array diretto.
- `/api/gyms?limit=24`: restituisce 24 item.
- `/api/gyms?limit=100`: restituisce 100 item.
- `/api/gyms?limit=1`: primo item senza `description`, `editorial_summary`, `price_info`.
- Controllo statico: non esiste piu `fetch('/api/gyms')` automatico in homepage.

## 7. Errori o test non eseguiti

- `bun run build` fallisce alla fase finale dell'adapter Vercel con:
  `EPERM: operation not permitted, symlink '![-]\catchall.func' -> '.vercel\output\functions\index.func'`.
- La build Vite client/SSR arriva a completamento prima dell'errore. Il problema sembra legato a permessi/symlink Windows locali, non a diagnostica Svelte o bundling.
- Non e stata fatta verifica browser visuale automatizzata perche in questo turno non era disponibile un browser tool dedicato; la verifica homepage/API e stata fatta via HTTP locale.

## 8. Rischi residui

- `readGyms()` e `readGymsFromSupabase()` continuano a usare `select=*` per route pubbliche non incluse in questo intervento, admin, sitemap, discipline, zone e dettaglio palestra.
- `/api/disciplines` resta P1: legge ancora il catalogo completo tramite `readGyms()`.
- Le statistiche discipline/zone in homepage ora sono derivate dalla prima pagina di 24 record, quindi possono essere meno complete finche non si introduce una query stats dedicata.
- Filtri complessi come apertura/raggio sono ancora applicati dopo la pagina recuperata; per risultati perfetti serve filtraggio server-side piu profondo.
- Vecchie sessionStorage con cataloghi precedenti vengono ignorate per `gyms`, ma possono restare nel browser fino alla scadenza.

## 9. Prossimi P0/P1 consigliati

- P0: eliminare o isolare il `select=*` legacy in `readGyms()` per le altre route pubbliche piu trafficate.
- P1: ottimizzare `/api/disciplines` con query minima o cache statica.
- P1: dettaglio palestra con query by slug/id invece di full catalog.
- P1: pagine zona/disciplina con query paginata e proiezione minima.
- P1: sitemap prerender/cache lunga con colonne minime.
- P1: admin listing paginato, senza caricare schede complete.

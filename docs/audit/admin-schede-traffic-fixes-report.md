# Admin Schede Traffic Fixes Report

## 1. File modificati

- `src/lib/server/gym-store.js`
- `src/routes/admin/schede/+page.server.js`
- `src/routes/admin/schede/+page.svelte`

## 2. Nuovo comportamento di `/admin/schede`

- La load non chiama più `readGyms()`.
- La load non usa più fallback diretto a `/api/gyms`.
- La lista admin usa `readAdminGymList({ limit, offset, q, archived })`.
- Default lista:
  - `limit=50`
  - `max limit=100`
  - `offset=0`
  - `archived=active`
- La pagina riceve metadata:
  - `gyms`
  - `limit`
  - `offset`
  - `hasMore`
  - `q`
  - `archivedMode`
- La modale edit carica il dettaglio completo solo on demand tramite `?edit=<id>`.
- La UI mostra navigazione pagina precedente/successiva basata su `offset` e `hasMore`.

## 3. Helper introdotti/modificati

- `readAdminGymList({ limit, offset, q, archived })`
  - Lista paginata con campi minimi.
  - Usa `limit + 1` per calcolare `hasMore` senza query count.
  - Usa proiezione esplicita filtrata sulle colonne disponibili.

- `readAdminGymById(id)`
  - Lettura mirata per singola scheda.
  - Usata per dettaglio edit e action admin.
  - Usa `id=eq.<id>` e `limit=1`.

- `readAdminGymListFromSupabase()`
  - Query Supabase lista.

- `readAdminGymByIdFromSupabase()`
  - Query Supabase dettaglio singolo.

## 4. Campi selezionati nella lista admin

Lista admin minima:

- `id`
- `slug`
- `nome`
- `name`
- `citta`
- `city`
- `indirizzo`
- `address`
- `telefono`
- `phone`
- `sito`
- `website`
- `discipline`
- `disciplines`
- `orari`
- `hours_info`
- `is_verified`
- `is_premium`
- `priority_score`
- `deleted_at`
- `updated_at`
- `data_quality_score`
- `enrichment_status`
- `needs_review`
- `review_reason`

La selezione viene intersecata con le colonne realmente disponibili nello schema Supabase.

## 5. Campi esclusi dalla lista admin

La lista non seleziona:

- `descrizione`
- `description`
- `editorial_summary`
- `editorial_highlights`
- `editorial_faq_items`
- `social_links`
- `price_info`
- `weekly_hours`
- `data_quality_flags`
- `enrichment_notes`
- `image_url`
- coordinate
- altri campi JSON/editoriali non necessari alla card lista

Questi campi sono caricati solo nel dettaglio singola scheda quando serve modificare un record.

## 6. Dove è stato rimosso `readGyms()`

- `src/routes/admin/schede/+page.server.js`
  - load: `readGyms()` rimosso, sostituito con `readAdminGymList()`.
  - update: lookup record sostituito con `readAdminGymById(id)`.
  - delete/archive: lookup record sostituito con `readAdminGymById(id)`.
  - restore: lookup record sostituito con `readAdminGymById(id)`.
  - duplicate: lookup record sostituito con `readAdminGymById(id)`.

È stato rimosso anche il fallback diretto a `/api/gyms`.

## 7. Cosa è rimasto invariato nelle action

- `create` continua a usare `writeGymRecords(nextGym)`.
- `update` continua a usare `updateGymRecord(updatedGym)`.
- `delete` resta soft-delete tramite `archiveGym()` e `writeGymRecords()`.
- `restore` continua a usare `restoreGym()` e `writeGymRecords()`.
- `duplicate` continua a usare `duplicateGym()` e `writeGymRecords()`.
- I payload di scrittura non sono stati ridisegnati.
- Non è stato introdotto export.
- Non sono state toccate `/admin/qualita`, `/admin/riclassifica`, scraper o enrichment.

## 8. Test eseguiti

- `bun run check`: passato, 0 errori e 0 warning.
- `bun run build`: Vite client e SSR compilano; adapter Vercel fallisce dopo la compilazione per symlink Windows.
- Verifica statica:
  - load `/admin/schede` non usa `readGyms()`.
  - load `/admin/schede` non chiama `/api/gyms`.
  - `readAdminGymList()` usa campi espliciti e `limit + 1`.
  - `readAdminGymById()` usa `limit=1`.
  - nessuna nuova query `select=*` introdotta.
- Verifica HTTP locale:
  - `/admin/schede`: `303`
  - `/admin`: `303`
  - `/admin/richieste`: `303`

I `303` sono attesi perché le route admin sono protette.

## 9. Errori o test non eseguiti

- `bun run build` fallisce in `@sveltejs/adapter-vercel` con:
  - `EPERM: operation not permitted, symlink '![-]\catchall.func' -> '.vercel\output\functions\index.func'`
  - La compilazione client/SSR è completata prima dell'errore.
- Non ho eseguito action reali create/update/archive/restore/duplicate perché scrivono dati.
- Non ho verificato sessione admin autenticata via browser.

## 10. Rischi residui

- Il vecchio `readGymsFromSupabase()` conserva `select=*`, ma `/admin/schede` non lo usa più.
- La ricerca client-side cerca solo nella pagina caricata. La ricerca server-side è disponibile via parametro `q`, ma non è stata trasformata in una nuova UI di ricerca completa in questo step.
- Il filtro qualità lato client calcola statistiche solo sulla pagina corrente, non sull'intero catalogo.
- Le action usano dettaglio singolo esplicito, ma i payload di scrittura restano quelli esistenti.

## 11. Prossimi interventi consigliati

Collegare la ricerca UI di `/admin/schede` al parametro server-side `q` con submit GET e stato filtro esplicito.

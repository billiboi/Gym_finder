# Admin Schede Search Residual Fix Report

## 1. File modificati

- `src/routes/admin/schede/+page.svelte`

## 2. Come funziona ora la ricerca UI

- L'input ricerca è dentro un form `GET` verso `/admin/schede`.
- Il campo usa `name="q"`, quindi il submit produce `q=<termine>`.
- Il form include `offset=0`, quindi ogni nuova ricerca riparte dalla prima pagina.
- Il valore dell'input viene inizializzato da `data.q`, cioè dal parametro server-side già usato da `readAdminGymList({ q })`.
- Il filtro client-side sulla pagina corrente resta come filtro secondario, ma la ricerca principale passa ora dal server.

## 3. Preservazione di `q`, `limit`, `offset`, `archived`

- Ricerca:
  - invia `q`
  - mantiene `limit`
  - mantiene `archived`
  - forza `offset=0`

- Reset:
  - rimuove `q`
  - mantiene `limit`
  - mantiene `archived`
  - forza `offset=0`

- Paginazione:
  - mantiene `q`
  - mantiene `limit`
  - mantiene `archived`
  - aggiorna solo `offset`

## 4. Cosa è rimasto invariato

- Nessuna action create/update/archive/restore/duplicate modificata.
- Nessun helper Supabase modificato.
- Nessuna modifica a schema, dati, scraper, enrichment, export, `/admin/qualita`, `/admin/riclassifica`, `/admin/gyms/[id]`.
- La logica di lettura `readAdminGymList({ limit, offset, q, archived })` resta quella già implementata.

## 5. Test eseguiti

- `bun run check`: passato, 0 errori e 0 warning.
- `bun run build`: Vite client e SSR compilano; adapter Vercel fallisce dopo la compilazione per symlink Windows.
- Verifica statica:
  - form `GET` verso `/admin/schede`.
  - input `name="q"`.
  - hidden `offset` con valore `0`.
  - hidden `limit` preservato da `data.limit`.
  - hidden `archived` preservato da `data.archivedMode`.
  - paginazione precedente/successiva mantiene `q`, `limit`, `archived`.
  - nessun nuovo `select=*` introdotto.
- Verifica HTTP locale:
  - `/admin/schede`: `303`
  - `/admin/schede?q=test`: `303`
  - `/admin/schede?q=test&offset=50`: `303`

I `303` sono attesi perché le route admin sono protette.

## 6. Errori o test non eseguiti

- `bun run build` fallisce in `@sveltejs/adapter-vercel` con:
  - `EPERM: operation not permitted, symlink '![-]\catchall.func' -> '.vercel\output\functions\index.func'`
  - La compilazione client/SSR è completata prima dell'errore.
- Non ho verificato una sessione admin autenticata via browser.

## 7. Rischi residui

- Il filtro qualità resta client-side sulla pagina corrente.
- La select qualità non aggiorna ancora `archivedMode` server-side; il parametro `archived` viene preservato se già presente.
- Il vecchio `select=*` legacy in `readGymsFromSupabase()` resta nel codice, ma non è stato toccato e non è usato da `/admin/schede`.

## 8. Prossimi interventi consigliati

Collegare anche il filtro archiviate/attive/tutte a `archived=active|archived|all` via GET.

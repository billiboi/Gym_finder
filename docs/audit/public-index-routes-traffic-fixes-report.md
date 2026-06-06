# Public Index Routes Traffic Fixes Report

## 1. File modificati

- `src/routes/zone/+page.server.js`
- `src/routes/discipline/+page.server.js`

Non sono stati modificati admin, scraper, enrichment, sync/export, schema Supabase o dati.

## 2. Dove e stato rimosso `readGyms()`

- `/zone`: rimosso `readGyms()` e rimosso il filtro derivato da `isArchivedGym()`.
- `/discipline`: rimosso `readGyms()` e rimosso il filtro derivato da `isArchivedGym()`.

Entrambe le route usano ora `deleted_at=is.null` direttamente nella query Supabase. Nei due file non restano occorrenze di `readGyms`, `readGymsFromSupabase` o `select=*`.

## 3. Nuove query e campi selezionati

### `/zone`

Query Supabase:

- `select=nome,name,indirizzo,address,citta,city,provincia,regione,telefono,phone,sito,website,orari,hours_info,discipline,disciplines,deleted_at`
- `deleted_at=is.null`
- `limit=5000`

Questi campi servono a costruire zone, conteggi e filtro di indicizzabilita senza scaricare descrizioni, editoriali, prezzi, social, immagini, coordinate, `weekly_hours`, enrichment o audit fields.

### `/discipline`

Query Supabase:

- `select=nome,name,indirizzo,address,citta,city,telefono,phone,sito,website,orari,hours_info,discipline,disciplines,deleted_at`
- `deleted_at=is.null`
- `limit=5000`

Questi campi servono a costruire discipline, conteggi e filtro di indicizzabilita senza payload pesanti.

### Fallback locale

Se Supabase non e configurato nell'ambiente locale, entrambe le route usano `readPublicGymListing({ limit: 100 })` come fallback leggero. In produzione, con env Supabase presenti, il percorso principale resta la query minima descritta sopra.

## 4. Effetto atteso sul traffico Supabase

- Le index pubbliche non scaricano piu schede complete con `select=*`.
- Il payload passa da record palestra completi a soli campi minimi per conteggi e aggregazioni SEO.
- Restano query su molte righe, perche le index devono calcolare conteggi globali, ma il traffico per riga e molto piu basso.

## 5. Test eseguiti

- `bun run check`: passato, 0 errori e 0 warning Svelte.
- `bun run build`: Vite SSR/client compila correttamente; fallisce solo adapter Vercel su Windows per symlink.
- HTTP locale:
  - `/zone` -> `200`
  - `/discipline` -> `200`
  - `/` -> `200`
  - `/api/gyms` -> `200`
  - `/api/disciplines` -> `200`

## 6. Errori o test non eseguiti

- Build non completabile fino all'adapter per il problema gia noto:
  `EPERM: operation not permitted, symlink '![-]\\catchall.func' -> '.vercel\\output\\functions\\index.func'`.
- Non sono stati eseguiti test su produzione.
- Non sono state eseguite query di scrittura, scraping, enrichment, sync, export o script batch.

## 7. Rischi residui

- I conteggi delle index richiedono ancora una lettura su molte righe, anche se con payload leggero.
- In ambiente locale senza Supabase il fallback e limitato a 100 schede, quindi i conteggi locali possono essere approssimati.
- La logica per calcolare indicizzabilita resta basata sui builder esistenti, che richiedono alcuni segnali leggeri come nome, indirizzo, disciplina e contatto/orari.

## 8. Prossimi interventi consigliati

1. Centralizzare le query pubbliche minime in un helper server condiviso, evitando duplicazione tra index, sitemap e pagine SEO.
2. Valutare una cache lunga per `/zone` e `/discipline`, dato che sono pagine aggregate e cambiano raramente.
3. Valutare una vista/RPC read-only dedicata a conteggi per zona/disciplina, se il traffico resta alto nonostante il payload ridotto.

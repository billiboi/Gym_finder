# Public Routes Traffic Fixes Report

## 1. File modificati

- `src/routes/palestre/[slug]/+page.server.js`
- `src/routes/zone/[slug]/+page.server.js`
- `src/routes/discipline/[slug]/+page.server.js`
- `src/routes/api/disciplines/+server.js`
- `src/routes/sitemap.xml/+server.js`

Non sono stati modificati admin, scraper, enrichment, sync/export, schema Supabase o dati.

## 2. Route pubbliche ottimizzate

| Route | Nuovo comportamento |
| --- | --- |
| `/palestre/[slug]` | Non carica piu tutto il catalogo. Cerca la scheda con query mirate su `slug`, `id` legacy o token del nome; le correlate usano una seconda query listing con `limit=24` e poi `slice(0, 4)`. |
| `/zone/[slug]` | Non carica piu tutto il catalogo. Per zone SEO usa keyword della zona con proiezione listing e `limit=37`; per citta dinamiche cerca solo su `city/citta`. |
| `/discipline/[slug]` | Non carica piu tutto il catalogo. Usa keyword disciplina con proiezione listing e `limit=72`. |
| `/api/disciplines` | Non chiama piu `readGyms()`. Legge solo `discipline`, `disciplines`, `deleted_at`. |
| `/sitemap.xml` | Non chiama piu `readGyms()`. Legge solo campi minimi necessari a URL, localita, discipline, indicizzabilita e `lastmod`. |

## 3. Rimozione `readGyms()` / `select=*`

- Rimosso `readGyms()` da dettaglio palestra, zona, disciplina, API discipline e sitemap.
- Nessuna nuova query pubblica usa `select=*`.
- Verifica grep sui cinque target: nessuna occorrenza di `readGyms`, `readGymsFromSupabase` o pattern `select=*`.

Nota: `src/routes/zone/+page.server.js` e `src/routes/discipline/+page.server.js` restano fuori scope di questo intervento, come da lista esplicita del task.

## 4. Nuove query e campi selezionati

### Dettaglio palestra

Query principali:

- `slug=eq.<slug>&limit=1`
- `id=eq.<legacy-id>&limit=1`
- fallback su token nome con `ilike` e `limit=10/50`

Campi dettaglio selezionati:

`id, slug, nome/name, indirizzo/address, citta/city, provincia, regione, telefono/phone, email, sito/website, descrizione/description, descrizione_* pubbliche, safe_public_description, discipline/disciplines, discipline_aliases, discipline_canonical_slugs, orari/hours_info/weekly_hours, lat/lng, latitude/longitude, image_url, is_verified/verified, is_premium, priority_score, deleted_at, updated_at, data_quality_flags, needs_review, review_reason, last_data_audit_at, official_source_url, editorial_summary, editorial_highlights, editorial_faq_items, price_info, price_source_url, price_updated_at, verified_commercial_info, commercial_info_last_checked_at, source_url, enrichment_status, enrichment_updated_at, social_links, data_verified_at`.

Query correlate:

- `deleted_at=is.null`
- filtro su `city/citta` e/o `discipline`
- `limit=24`

Campi correlate/listing:

`id, slug, nome/name, indirizzo/address, citta/city, telefono/phone, sito/website, discipline/disciplines, orari/hours_info, lat/lng, latitude/longitude, image_url, is_verified/verified, is_premium, priority_score, deleted_at, updated_at`.

### Zona

Query:

- `deleted_at=is.null`
- `or=(citta/city/indirizzo/address/nome/name ilike keyword zona)`
- `limit=37`

Campi: listing minimi, senza descrizioni/editoriali/prezzi/social.

### Disciplina

Query:

- `deleted_at=is.null`
- `or=(discipline ilike keyword, nome/name ilike keyword)`
- `limit=72`

Campi: listing minimi, senza descrizioni/editoriali/prezzi/social.

### API discipline

Query:

- `select=discipline,disciplines,deleted_at`
- `deleted_at=is.null`
- `limit=5000`

### Sitemap

Query:

- `deleted_at=is.null`
- `order=updated_at.desc.nullslast,nome.asc.nullslast`
- `limit=5000`

Campi sitemap:

`id, slug, nome/name, indirizzo/address, citta/city, telefono/phone, sito/website, discipline/disciplines, orari/hours_info, lat/lng, latitude/longitude, updated_at, deleted_at`.

## 5. Test eseguiti

- `bun run check`: passato, 0 errori e 0 warning Svelte.
- `bun run build`: Vite SSR/client compilano; fallisce solo adapter Vercel su Windows con `EPERM: operation not permitted, symlink '![-]\\catchall.func' -> '.vercel\\output\\functions\\index.func'`.
- HTTP locale con dev server:
  - `/` -> `200`
  - `/api/gyms` -> `200`
  - `/api/disciplines` -> `200`
  - `/sitemap.xml` -> `200`
  - `/palestre/101-running-servizi-per-lo-sport` -> `200`
  - `/zone/varese` -> `200`
  - `/discipline/fitness` -> `200`

## 6. Errori o test non eseguiti

- Build non completabile fino all'adapter per il problema symlink Windows gia rilevato nel precedente step P0.
- Non sono stati eseguiti test su produzione.
- Non sono state eseguite query di scrittura, scraping, enrichment, sync, export o script batch.

## 7. Rischi residui

- Le route indice `/zone` e `/discipline` usano ancora `readGyms()` ma non erano nel perimetro di questo step.
- La generazione degli slug canonici e duplicati e duplicata localmente in queste route per evitare un refactor ampio; un prossimo pass potrebbe centralizzarla in un helper pubblico gia testato.
- Le pagine zona/disciplina ora caricano un primo blocco limitato; se una zona o disciplina ha piu risultati, il conteggio iniziale puo essere approssimato dal blocco caricato.
- In ambiente locale senza env Supabase, il dettaglio palestra usa fallback su `readPublicGymListing()`; in produzione le query Supabase mirate restano il percorso principale.

## 8. Prossimi interventi consigliati

1. Ottimizzare `/zone` e `/discipline` index page, che restano pubbliche e fuori scope di questo step.
2. Centralizzare helper di query pubbliche e slug canonici per evitare duplicazione tra homepage, API, detail, zone, discipline e sitemap.
3. Aggiungere paginazione o load-more server-side dedicato per pagine disciplina, come gia esiste per zone via `/api/gyms`.
4. Valutare cache piu lunga per sitemap e API discipline, se compatibile con frequenza aggiornamenti catalogo.

# Traffic Audit Supabase - PalestreInZona

Audit read-only del codice. Non sono stati eseguiti script, export, scraping, sync o query Supabase. Le valutazioni sotto derivano solo da sorgenti locali.

## 1. Sintesi esecutiva

- Causa piu probabile del consumo dati: la lettura centrale `readGymsFromSupabase()` in `src/lib/server/gym-store.js` esegue `select=*` su tutta la tabella `gyms` senza `limit`, senza paginazione e senza proiezione campi. Questa funzione alimenta homepage, endpoint pubblici, pagine SEO, admin e sitemap.
- Top rischi: `/api/gyms` pubblico restituisce l'intero catalogo; la homepage dopo l'initial SSR chiama comunque `/api/gyms`; `/api/disciplines` legge tutte le palestre solo per calcolare discipline; molte route pubbliche chiamano `readGyms()` e quindi possono scaricare l'intero dataset in cold start/serverless.
- Cosa bloccare subito: evitare `select=*` globale su `gyms`, mettere una proiezione pubblica minima, introdurre paginazione/ricerca server-side su `/api/gyms`, rimuovere il fetch full catalog dalla homepage.
- Cosa analizzare dopo: log Vercel per frequenza chiamate `/api/gyms`, cache hit/miss di `readGyms()`, dimensione payload medio di `publicClientGym`, cold start e invocazioni generate da sitemap/SEO route.

## 2. Problemi P0

| file | problema | query/fetch | perche puo consumare molti dati | fix consigliato |
| --- | --- | --- | --- | --- |
| `src/lib/server/gym-store.js:554-570` | Lettura globale Supabase di tutte le palestre complete. | `GET /rest/v1/${SUPABASE_GYMS_TABLE}?select=*` | `select=*` senza `limit`, senza paginazione, senza filtri e con tutti i campi JSON/editoriali/commerciali. Ogni cold start o cache miss puo scaricare l'intera `public.gyms`. | Sostituire con funzioni specializzate: listing pubblico con colonne minime, dettaglio per slug/id, stats separate, admin paginato. Aggiungere `limit`, `range`, `order` e cache server robusta. |
| `src/routes/api/gyms/+server.js:254-270` | Endpoint pubblico `/api/gyms` carica tutte le palestre e filtra lato server dopo il full read. | `let gyms = await readGyms()` poi `filterGyms(...).map(publicClientGym)` | Anche con query `q`/disciplina/raggio, prima scarica tutto da Supabase tramite `readGyms()`. Senza parametri restituisce l'intero catalogo pubblico. | Rendere `/api/gyms` paginato (`limit`, `offset/cursor`) e filtrare direttamente nella query Supabase con colonne minime. Imporre default limit pubblico. |
| `src/routes/+page.svelte:497-510` | Homepage idrata in background l'intero catalogo pubblico. | `fetch('/api/gyms')` | Ogni visita homepage puo generare una chiamata pubblica che restituisce tutte le schede, dopo che SSR ha gia caricato una slice iniziale. Alto impatto se la home riceve traffico. | Caricare solo risultati visibili o usare endpoint paginato/search. Non fare full hydration automatica; caricare altro catalogo solo su ricerca, scroll o cambio filtro. |
| `src/routes/+page.server.js:9-14` | Homepage SSR chiama `readGyms()` per poi mostrare solo 24 record. | `const allGyms = await readGyms()` | Scarica tutta `gyms` per calcolare stats e `initialGyms.slice(0, 24)`. In serverless puo ripetersi su visite/cold start. | Creare endpoint/query stats leggera e query iniziale `limit=24` con solo campi card. |
| `src/lib/server/claim-request-store.js:321-336` | Lettura completa di `claim_requests` in admin/dashboard. | `select=*&order=created_at.desc` | `select=*` senza `limit`; se le richieste crescono, ogni admin dashboard scarica tutte le richieste con campi potenzialmente larghi. | Aggiungere `limit`, paginazione e proiezione campi. Separare stats da lista. |
| `scripts/export-supabase-gyms.mjs:56-80` | Export completo manuale di `gyms`. | `select=*&order=id.asc` | Scarica tutta la tabella e tutti i campi; se usato ripetutamente puo generare molto traffico. | Tenerlo disabilitato per default o richiedere `--confirm-export`, `--limit`, `--columns`, ambiente esplicito e log dimensione stimata. |
| `scripts/sync-supabase-gyms.mjs:118-157` | Sync legge backup completo `select=*` prima di eventuale upsert. | `existingResponse = fetch(`${baseUrl}?select=*&order=id.asc`)` | Anche in dry-run legge il catalogo completo se il codice arriva a quel punto; in write genera anche backup completo e upsert batch. | Bloccare in produzione, usare backup selettivo/paginato, dry-run senza full backup, `--max-records`, report dimensione e conferma forte. |

## 3. Problemi P1

| file | problema | query/fetch | perche puo consumare molti dati | fix consigliato |
| --- | --- | --- | --- | --- |
| `src/routes/api/disciplines/+server.js:97-105` | Endpoint pubblico discipline legge tutte le palestre per derivare un set di discipline. | `const gyms = await readGyms()` | Payload completo `gyms` per restituire solo nomi discipline. Chiamato dalla homepage tramite `/api/disciplines`. | Query dedicata solo `disciplines,discipline,deleted_at`, cache lunga o tabella/materialized view delle discipline. |
| `src/routes/zone/[slug]/+page.server.js:12-40` | Pagina zona legge tutto il catalogo e filtra in memoria. | `const gyms = await readGyms()` | Ogni pagina zona puo scaricare tutto, poi invia solo 36 record iniziali. | Query Supabase con filtro localita/slug e `limit`, oppure indice locale/cache build-time. |
| `src/routes/discipline/[slug]/+page.server.js:24-47` | Pagina disciplina legge tutto e restituisce tutti i match. | `const gyms = await readGyms()` | Filtri disciplina lato server dopo full read; `matchedGyms.map(publicClientGym)` non ha cap visibile nel load. | Filtrare in query, paginare risultati e limitare campi. |
| `src/routes/palestre/[slug]/+page.server.js:39-105` | Dettaglio palestra legge tutto il catalogo per trovare una scheda e correlate. | `const gyms = await readGyms()` | Una pagina dettaglio dovrebbe leggere una sola scheda; qui scarica tutto per slug lookup e correlate. | Query per slug/id con `limit=1`, poi query correlati con campi minimi e `limit=4`. |
| `src/routes/sitemap.xml/+server.js:17-55` | Sitemap legge tutto il catalogo. | `const gyms = (await readGyms()).filter(...)` | Endpoint pubblico/bot; se richiesto spesso, puo causare full read ripetuti. | Cache molto lunga, prerender/static sitemap o query minima `id,slug,updated_at,city,discipline,deleted_at`. |
| `src/routes/zone/[slug]/+page.svelte:104-112` | Caricamento "more" zona chiama `/api/gyms?q=...`. | `fetch(`/api/gyms?q=${encodeURIComponent(location.name)}`)` | Anche con `q`, endpoint attuale legge tutto prima di filtrare. | Endpoint zona dedicato paginato o `/api/gyms` con query Supabase filtrata. |
| `src/lib/gym-client.js:84-130` | Payload pubblico delle card ancora ampio. | `publicClientGym()` include descrizioni, prezzo, URL sorgente, immagine, coordinate, stati review. | Non e `select=*`, ma l'endpoint pubblico restituisce molti campi per ogni record, inclusi campi non sempre necessari per lista. | Separare DTO listing, map marker e dettaglio. Lista: id, slug, name, city, discipline, coordinates, short hours/status, minimal contact. |
| `src/routes/admin/+page.server.js:6-48` | Dashboard admin legge tutte le palestre e tutte le richieste. | `readGyms()` + `readClaimRequests()` | Admin raro ma payload largo; calcola stats in memoria. | Stats server-side con colonne minime e limit per liste. |
| `src/routes/admin/schede/+page.server.js:141-165` | Admin schede carica tutte le schede complete. | `readGyms()` fallback `/api/gyms` | La lista admin usa view ridotta ma prima carica record completi. | Paginazione admin, ricerca server-side, proiezione campi per tabella. |
| `src/routes/admin/qualita/+page.server.js:358-447` | Admin qualita carica tutte le palestre, claim e calcola molti flag. | `readGyms()` + `readClaimRequests()` | Utile ma pesante: full dataset, duplicate groups, stats e liste. | Paginare per categoria problema; calcolare stats con query dedicate; caricare duplicate/candidati on demand. |
| `src/routes/admin/riclassifica/+page.server.js:24-110` | Admin riclassifica carica tutte le schede. | `readGyms()` fallback `/api/gyms` | Payload completo per mostrare tabella ridotta. | Lista paginata con query minima; bulk solo su ID selezionati. |
| `src/routes/admin/riclassifica/+page.server.js:310` | Bulk update parallelo. | `Promise.all(changedGyms.map((gym) => updateGymRecord(gym)))` | Puo generare molte PATCH simultanee e traffico Vercel/Supabase; ogni update ritorna `representation`. | Limitare concorrenza, usare `return=minimal`, batch controllato e audit compatto. |
| `src/routes/admin/prezzi/+page.server.js:254-348` | Area admin prezzi fa fetch HTML verso siti esterni. | `fetchHtml(url)` + `discoverPages(website)` | Non e traffico Supabase, ma puo generare traffico Vercel e scraping se usata dall'admin. | Disabilitare in produzione o mettere rate limit, allowlist, dry-run esplicito e limite per richiesta. |

## 4. Problemi P2/P3

| file | problema | query/fetch | perche puo consumare molti dati | fix consigliato |
| --- | --- | --- | --- | --- |
| `src/routes/discipline/+page.server.js:6` | Pagina indice discipline legge tutto. | `readGyms()` | Serve per derivare pagine/contatori, ma puo essere cacheabile. | Cache/prerender o query minima. Priorita P2. |
| `src/routes/zone/+page.server.js:6` | Pagina indice zone legge tutto. | `readGyms()` | Simile a discipline: traffico non enorme se poco visitata, ma full read. | Cache/prerender o query minima. Priorita P2. |
| `src/routes/chi-siamo/+page.server.js:6` | Pagina informativa legge tutto per statistiche. | `readGyms()` | Pagina non catalogo che comunque scarica tutto. | Usare stats precomputate o count leggero. Priorita P2. |
| `src/routes/per-le-palestre/+page.server.js:19` | Pagina business legge tutto per statistiche. | `readGyms()` | Payload completo per pochi numeri. | Query stats/count o cache. Priorita P2. |
| `src/routes/admin/export/gyms.csv/+server.js:5` | Export admin CSV legge tutte le schede. | `readGyms()` | Manuale/admin, ma full read piu download completo. | Richiedere conferma, stream/paginazione, colonne selezionabili. Priorita P2. |
| `src/lib/server/admin-audit-store.js:26-45` | Lettura audit log ha limit, ma seleziona JSON completi. | `select=id,created_at,actor,action,table_name,record_id,before_data,after_data&limit<=100` | Limit presente; il peso dipende da `before_data/after_data`. | Per lista audit usare solo metadata e caricare JSON diff on demand. Priorita P2. |
| `scripts/report-gym-content-enrichment.mjs:84-118` | Report manuale legge molte righe senza `limit`. | `select=${columns}&order=name.asc` | Colonne limitate, ma no paginazione. Script manuale. | Aggiungere `--limit`, paginazione e staging guard. Priorita P3. |
| `scripts/sync-reviewed-enrichment-batch.mjs:118-175` | Batch enrichment legge per ID e poi PATCH. | `id=in.(...)`, campi selezionati | Sicuro se batch piccolo; rischio se file batch enorme. | Max batch size, conferma, concorrenza limitata. Priorita P2. |
| `scripts/sync-official-overrides-enrichment.mjs:94-142` | Legge tutte le righe con colonne selezionate per match by name. | `select=id,name,city,website,editorial_summary,enrichment_status&order=name.asc` | No `limit`; traffico medio se usato spesso. | Match per ID o paginazione; evitare scan completo. Priorita P2. |

## 5. Endpoint pubblici sospetti

| endpoint | cosa restituisce | paginazione | campi troppi | fix consigliato |
| --- | --- | --- | --- | --- |
| `/api/gyms` (`src/routes/api/gyms/+server.js`) | Array di palestre pubbliche filtrate opzionalmente da `q`, disciplina, apertura, coordinate/raggio. | No. | Si: `publicClientGym` include molti campi lista/dettaglio e la sorgente upstream e `select=*`. | Default `limit=24`, `cursor/range`, query Supabase filtrata, DTO listing minimo, endpoint detail separato. |
| `/api/disciplines` (`src/routes/api/disciplines/+server.js`) | Lista discipline pubbliche. | Non necessaria per output, ma upstream legge tutte le palestre. | Si a monte: legge tutti i record completi via `readGyms()`. | Cache statica/lunga o query minima solo discipline. |
| `/sitemap.xml` (`src/routes/sitemap.xml/+server.js`) | URL sitemap palestre/zone/discipline. | No. | A monte si, perche `readGyms()` prende tutto. | Prerender o cache lunga; query minima. |
| Pagine SSR pubbliche home/zone/discipline/dettaglio | HTML e dati iniziali Svelte. | Parziale in UI, ma upstream no. | Si a monte: quasi tutte passano da `readGyms()`. | Query dedicate per use case: stats, listing, detail, related. |

## 6. Area admin sospetta

| componente/route admin | cosa carica | carica troppe righe | serve ricerca server-side | serve paginazione |
| --- | --- | --- | --- | --- |
| `src/routes/admin/+page.server.js` | Tutte le palestre attive, tutte le claim, stats qualita. | Si. | Si, per lista palestre. | Si. |
| `src/routes/admin/schede/+page.server.js` | Tutte le schede complete per tabella gestione. | Si. | Si. | Si, P1. |
| `src/routes/admin/gyms/[id]/+page.server.js` | Tutte le schede per trovare un ID e generare descrizione con contesto. | Si. | No per dettaglio; serve query by id. | No, serve detail query. |
| `src/routes/admin/riclassifica/+page.server.js` | Tutte le schede per verifica/archivio/applica disciplina. | Si. | Si. | Si, con bulk per ID. |
| `src/routes/admin/qualita/+page.server.js` | Tutte le schede, claim, duplicati, flags, candidati normalizzazione. | Si, molto. | Si, per categorie e filtri problema. | Si, piu caricamenti on demand. |
| `src/routes/admin/prezzi/+page.server.js` | Report locali e `readGyms()`; azione manuale puo fetchare pagine esterne. | Medio. | Si per selezione candidate. | Si, e rate limit scraping admin. |
| `src/routes/admin/audit/+page.server.js` | Ultimi 50 record audit con JSON before/after. | Limit presente, ma JSON potenzialmente pesante. | No. | Meglio lista metadata + dettaglio on demand. |
| `src/routes/admin/export/gyms.csv/+server.js` | Tutte le palestre in CSV. | Si, ma manuale. | No. | Streaming/paginazione o conferma forte. |

## 7. Script sospetti

| script | comando package.json | cosa legge | cosa scrive | perche puo generare traffico | come renderlo sicuro |
| --- | --- | --- | --- | --- | --- |
| `scripts/export-supabase-gyms.mjs` | Nessun alias diretto; citato in docs operativi. | `gyms select=* order=id.asc`. | File JSON export locale. | Export completo, tutti i campi, nessun limit. | Richiedere ambiente esplicito, `--confirm`, `--columns`, `--limit`, paginazione e blocco produzione default. |
| `scripts/sync-supabase-gyms.mjs` | `sync:gyms:staging`, `sync:gyms:prod`. | Source JSON locale, count, backup `gyms select=*`. | Upsert batch su Supabase se `--write --confirm`. | Full backup + batch write; se usato su prod puo consumare traffico e storage. | Disabilitare `sync:gyms:prod` o richiedere tripla conferma, backup paginato, dry-run senza full read, max record. |
| `scripts/audit-gym-contamination.ts` | `audit:gyms:contamination`. | `gyms select=* order=id.asc limit=2000`. | Report locali. | Full-ish scan e payload largo, anche se staging guard. | Colonne minime per audit, `--limit`, paginazione. |
| `scripts/audit-descriptions.ts` | `descriptions:audit`. | `gyms select=* order=id.asc limit=5000`. | Report locali. | Payload largo; analisi O(n^2) su descrizioni. | Colonne descrizione minime e cap esplicito. |
| `scripts/audit-editorial-descriptions.ts` | `editorial:audit`. | `gyms select=* order=id.asc limit=5000`. | Report locali. | Payload largo su staging. | Proiezione campi editoriali soltanto. |
| `scripts/generate-editorial-descriptions.ts` | `editorial:generate:dry`, `editorial:apply`. | `gyms select=* order=id.asc limit=5000`. | Preview o PATCH in apply. | Full read; apply puo scrivere molti record. | `--limit` obbligatorio, colonne minime, staging only, batch/concorrenza limitata. |
| `scripts/generate-gym-descriptions.ts` | `descriptions:generate:dry`, `descriptions:apply`. | `gyms select=* order=id.asc limit=2000`. | Preview o PATCH in apply. | Full read e possibile write batch. | Proiezione campi descrizione, max batch, apply bloccato di default. |
| `scripts/generate-content-enrichment-preview.ts` | `content:enrich:dry`. | `gyms select=* limit=5000`; poi siti esterni. | Preview locali. | Full read Supabase + scraping/fetch esterni per candidati. | Mai schedulare; `--limit` basso obbligatorio, colonne minime, allowlist/rate limit. |
| `scripts/generate-price-enrichment-preview.ts` | `prices:enrich:dry`. | `gyms select=* limit=5000`; poi siti esterni. | Preview locali. | Full read + fetch pagine prezzi. | Come sopra; separare candidato query da fetch. |
| `scripts/publish-editorial-candidates.ts` | `editorial:publish:candidates`. | `gyms select=* order=id.asc limit=5000`. | Candidati locali o PATCH. | Full read e possibili writes. | Selezione per ID, proiezione minima, cap batch. |
| `scripts/report-price-fields.ts` | Nessun alias diretto. | `gyms select=* limit=5000`. | Report locali. | Full payload per report prezzi. | Colonne prezzi soltanto. |
| `scripts/report-price-enrichment-candidates.ts` | `prices:enrichment:candidates`. | `gyms select=* limit=5000`. | Report locali. | Full payload. | Colonne necessarie, limit e paginazione. |
| `scripts/preview-price-reassignment.ts` | `prices:reassign:dry`. | `gyms select=* limit=5000`. | Preview locali. | Full payload. | Colonne prezzo/id/nome soltanto. |
| `scripts/report-legacy-gym-redirects.mjs` | `seo:legacy-redirects`. | `gyms select=* order=id.asc`. | Report locali. | Full read senza limit. | Colonne slug/id/name/city/deleted_at soltanto. |
| `scripts/revert-content-enrichment-apply.ts` | Nessun alias diretto. | `admin_audit_log limit=1`, poi `gyms select=* id=in(...)`. | PATCH revert se eseguito. | Dipende da audit payload; puo leggere/scrivere record completi. | Richiedere ID audit, dry-run, colonne esplicite, conferma e max records. |
| `scripts/sync-reviewed-enrichment-batch.mjs` | `enrichment:sync-batch`. | Righe per ID con colonne selezionate. | PATCH batch se `--apply`. | Rischio controllabile ma dipende da batch. | Max batch size e `return=minimal` gia presente. |
| `scripts/sync-official-overrides-enrichment.mjs` | `enrichment:sync-overrides`. | Tutte le righe con colonne selezionate. | PATCH se apply. | Scan completo per match by name. | Match per ID o indice locale, limit/paginazione. |

## 8. Audit log

- Lettura senza limit: no nel flusso principale. `readAdminAuditLog({ limit = 30 })` limita tra 1 e 100 e `/admin/audit` usa `limit: 50`.
- Campi letti: `src/lib/server/admin-audit-store.js:36` legge `before_data,after_data` nella lista; questo puo rendere pesante anche una lista da 50 se i JSON sono grandi.
- Scrittura troppo frequente: le azioni admin scrivono su eventi specifici, non su ogni visita pubblica. Il rischio e medio, legato ad azioni bulk o import.
- `before_data/after_data` completi: si. Esempi: merge qualita salva due record completi prima/dopo (`src/routes/admin/qualita/+page.server.js:491-492`), archiviazione salva gym completo (`src/routes/admin/qualita/+page.server.js:640-641`), import backup puo salvare `gyms` dentro `before_data` se backup locale fallisce (`src/routes/admin/import/+page.server.js:364-379`).
- Impatto: puo gonfiare storage e traffico admin, specialmente per import/merge o record con campi JSON editoriali grandi. Non sembra la causa primaria dei 20 GB se il traffico e pubblico, ma va ridotto.

## 9. Fix consigliati in ordine

### Fix immediati P0

1. Cambiare `readGymsFromSupabase()` per non usare mai `select=*` globale: introdurre proiezioni per `listing`, `detail`, `stats`, `admin`.
2. Rendere `/api/gyms` paginato con default limit basso e filtraggio in query, non dopo full read.
3. Rimuovere o condizionare il `fetch('/api/gyms')` automatico in homepage; caricare extra solo su azione utente.
4. Sostituire homepage SSR full read con query `limit=24` e stats leggere.
5. Mettere `limit` e colonne minime su `claim_requests`.
6. Disabilitare temporaneamente export/sync completi in produzione o richiedere conferma esplicita forte.

### Fix successivi P1

1. Convertire `/api/disciplines` a query minima/cache statica.
2. Ottimizzare pagine zona/disciplina/dettaglio con query dedicate e paginazione.
3. Paginare admin schede, qualita e riclassifica; ricerca server-side.
4. Limitare concorrenza bulk update e usare `return=minimal` dove non serve representation.
5. Separare DTO pubblici: card/listing, marker mappa, detail.

### Ottimizzazioni P2/P3

1. Prerender o cache lunga per sitemap, indici zone/discipline e pagine statistiche.
2. Rendere audit log list-only: metadata nella lista, JSON diff on demand.
3. Nei report/script usare colonne esplicite, `--limit`, paginazione e staging guard.
4. Rate limit e allowlist per fetch HTML admin/prezzi/enrichment.
5. Aggiungere logging dimensione payload e contatori per endpoint critici, senza dati personali.

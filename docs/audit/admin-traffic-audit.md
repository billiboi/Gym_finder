# Admin Traffic Audit - PalestreInZona

## 1. Sintesi esecutiva

L'area admin ha ancora diversi percorsi che caricano l'intero catalogo `gyms` tramite `readGyms()`, che a sua volta usa `readGymsFromSupabase()` con `select=*`. Dopo i fix pubblici, questi sono i principali punti rimasti per traffico Supabase, payload grandi e rischio operativo.

Principali rischi admin:

- molte pagine admin caricano tutte le palestre complete per liste, statistiche o ricerca per ID;
- `claim_requests` viene letto con `select=*` senza `limit`;
- la lista audit log ha `limit`, ma include `before_data` e `after_data`, quindi può scaricare JSON pesanti;
- export CSV scarica tutto il catalogo completo;
- alcune action leggono tutto il catalogo prima di aggiornare un solo record;
- bulk update in `riclassifica` usa `Promise.all` su più `updateGymRecord()` senza limite di concorrenza;
- alcune action di qualità salvano audit log con record completi in `before_data/after_data`;
- `admin/prezzi` può fare scraping live lato admin e carica tutto il catalogo per calcolare report. **Risolto in Fase 3 (2026-07-11, vedi `docs/admin-redesign.md`)**: `/admin/prezzi` è ora solo un redirect; lo scraping live vive in `/admin/gyms/[id]` (azione `analyzeOfficialSite`), scoped a una sola scheda per volta invece che fino a 40 in batch; `/admin/qualita/contenuti` mostra solo una lista candidati, senza scraping.

Cosa sistemare prima:

1. Paginare `claim_requests` e usare una proiezione lista senza campi JSON pesanti.
2. Separare audit log lista/dettaglio: lista senza `before_data/after_data`, dettaglio on demand.
3. Paginare `/admin/schede`, `/admin/qualita`, `/admin/riclassifica` e dashboard admin.
4. Sostituire letture "trova per ID" con query mirate `id=eq...&limit=1`.
5. Rendere export CSV un'azione confermata e, se necessario, streaming/batch controllato.

Cosa lasciare dopo:

- ottimizzazioni UI;
- refactor helper condivisi;
- eventuale RPC/view read-only per statistiche aggregate;
- normalizzazione audit payload.

## 2. Problemi P0

| file | problema | query/fetch | rischio | fix consigliato |
| --- | --- | --- | --- | --- |
| `src/lib/server/claim-request-store.js` | `readClaimRequestsFromSupabase()` legge tutte le richieste claim con tutti i campi. | `/rest/v1/claim_requests?select=*&order=created_at.desc` | Critico: nessun `limit`, nessuna paginazione, include `requested_updates`, `image_uploads`, `admin_notes`, token e dati di contatto. Crescendo, gonfia traffico e payload admin. | Introdurre `readClaimRequestsList({ limit, offset, status })` con campi lista minimi. Dettaglio claim on demand con campi completi. Default `limit=50`, max `100`. |
| `src/routes/admin/schede/+page.server.js` | Pagina principale schede carica tutto `gyms` completo per tabella admin. | `readGyms()` via `getGymsWithFallback()`; fallback a `/api/gyms` ora incompatibile perché API restituisce oggetto paginato. | Critico: admin table può scaricare tutto `public.gyms` con descrizioni, JSON, editoriali, prezzi, social e campi enrichment. | Query paginata admin-list con proiezione minima per tabella. Server-side search/filter/sort. Rimuovere fallback `/api/gyms` o adattarlo solo a listing paginato. |
| `src/routes/admin/export/gyms.csv/+server.js` | Export CSV completo immediato. | `readGyms()` e `gymsToAdminCsv(...)`. | Critico: scarica tutto il catalogo completo e produce export con dati sensibili/payload pieno; endpoint admin ma senza conferma o limiti nel codice server. | Rendere export azione POST confermata, con log audit, rate limit/admin check, proiezione CSV minima, streaming o batch. Evitare export casuale via GET. |
| `src/routes/admin/riclassifica/+page.server.js` | Bulk update parallelo senza limite di concorrenza. | `await Promise.all(changedGyms.map((gym) => updateGymRecord(gym)))`. | Critico: molte update simultanee possono generare burst Supabase, fallimenti parziali e pressione write/audit. | Eseguire update sequenziali o con concorrenza 3-5, limite massimo record, preview/dry-run, conferma esplicita e audit compatto. |
| `src/routes/admin/qualita/+page.server.js` | Merge e archive scrivono audit log con record completi. | `writeAdminAuditLog({ beforeData: { keep: primary, archive: secondary }, afterData: { keep: mergedPrimary, archive: archivedSecondary } })` e `beforeData: gym, afterData: changed`. | Critico storage: `before_data/after_data` possono contenere descrizioni, editoriali, weekly_hours, enrichment e JSON pesanti. | Salvare audit compatto: id, campi cambiati, hash/diff sintetico. Dettaglio completo solo se indispensabile e troncato. |

## 3. Problemi P1

| file | problema | query/fetch | rischio | fix consigliato |
| --- | --- | --- | --- | --- |
| `src/routes/admin/+page.server.js` | Dashboard admin carica tutto il catalogo e tutti i claim per statistiche. | `readGyms()` + `readClaimRequests()`. | Alto: calcoli in memoria su dataset completo e claim non paginati. | Usare query aggregate/HEAD count o proiezioni minime: phone, website, hours, deleted_at. Claim stats via query status o lista limitata. |
| `src/routes/admin/gyms/[id]/+page.server.js` | Dettaglio admin legge tutto `gyms` per trovare un ID. | `readGyms()` poi `find((item) => item.id === params.id)`. | Alto: ogni dettaglio scarica tutto il catalogo completo. | `readAdminGymById(id)` con `id=eq.<id>&limit=1` e campi necessari al form dettaglio. Per descrizione generata, correlati/query separate leggere. |
| `src/routes/admin/gyms/[id]/+page.server.js` | Action update rilegge tutto per aggiornare un solo record. | `readGyms()` poi `findIndex`, poi `updateGymRecord`. | Alto: payload completo per singola modifica. | Leggere solo record target prima dell'update oppure usare patch mirata con optimistic `updated_at`. |
| `src/routes/admin/qualita/+page.server.js` | Pagina qualità carica tutto il catalogo e tutti i claim, calcola duplicati/stats in memoria. | `readGyms()` + `readClaimRequests()`. | Alto: pagina molto pesante, usa molti campi anche JSON (`weekly_hours`, descrizioni, enrichment per flag). | Paginare lista qualità. Separare stats aggregate da lista. Caricare solo campi necessari ai flag visibili. Claim index solo con campi minimi e limit/status. |
| `src/routes/admin/riclassifica/+page.server.js` | Lista riclassifica carica tutto il catalogo completo. | `readGyms()` via `getGymsWithFallback()`. | Alto: tabella admin per discipline scarica campi non necessari. | Query admin-list con campi minimi: id, name, city, address, discipline/disciplines, verified, deleted_at. Paginazione e filtri server-side. |
| `src/routes/admin/qualita/contenuti/+page.server.js` (**era `admin/prezzi`, risolto Fase 3 2026-07-11**) | Load candidati carica tutto il catalogo solo se manca il report CLI locale. | `readGyms()` come fallback in `buildLiveCandidates`, altrimenti legge un report `price-enrichment-candidates-*.json`. | Medio (ridotto da Alto): niente più 4 report letti in parallelo né scraping in load; resta un `readGyms()` completo nel caso senza report. | Proiezione minima per la lista candidati, nessun `readGyms()` completo quando manca il report. |
| `src/routes/admin/gyms/[id]/+page.server.js` (**azione `analyzeOfficialSite`, era `generatePreview` in `admin/prezzi`, risolto Fase 3 2026-07-11**) | Scraping live scoped a una sola scheda per invocazione (non più batch fino a 40). | `readAdminGymById(params.id)` + `analyzeGymOfficialSite(gym)` + `fetchHtml(...)`. | Medio (ridotto da Alto): nessuna lettura completa del catalogo; traffico esterno resta ma limitato a 1 scheda per click, non a un batch scelto liberamente dall'admin. | Valutare rate limit per-sessione se l'uso diventa frequente; per ora resta una normale action web, non una coda. |
| `src/routes/admin/richieste/+page.server.js` | Pagina richieste legge tutti i claim; approvazione claim legge tutto il catalogo per trovare palestra. | `readClaimRequests()` in load/action; `readGyms()` in `approveClaimAndVerifyGym`. | Alto: claim non paginati e ricerca palestra su catalogo completo. | Paginare claim. Per approvazione usare `gym_id` diretto o query mirata per id/slug/name, con fallback controllato. |
| `src/lib/server/admin-audit-store.js` | Lista audit log ha `limit`, ma include `before_data` e `after_data`. | `select: 'id,created_at,actor,action,table_name,record_id,before_data,after_data'` con `limit<=100`. | Alto: anche 50 righe possono essere enormi se before/after contengono record palestra completi. | Lista: `id,created_at,actor,action,table_name,record_id` più dimensione/summary. Dettaglio audit on demand con JSON. |

## 4. Problemi P2/P3

| file | problema | query/fetch | rischio | fix consigliato |
| --- | --- | --- | --- | --- |
| `src/routes/admin/schede/+page.server.js` | Create/update/delete/restore/duplicate rileggono tutto il catalogo per validare o trovare record. | `getGymsWithFallback(fetch)` in più action. | Medio/alto: action singole, ma payload completo. | Helper `readAdminGymById` e patch/update mirati. Per create non serve leggere tutto salvo deduplica esplicita. |
| `src/routes/admin/qualita/+page.server.js` | `normalizeDisciplines` aggiorna selezionati in loop sequenziale, ma parte da lettura completa fresh. | `readGyms({ fresh: true })`, poi `for (const gym of changed) await updateGymRecord(gym)`. | Medio: scritture sequenziali ok, ma lettura completa e audit con payload `records` possono crescere. | Leggere solo ID selezionati, max batch, audit compatto. |
| `src/routes/admin/qualita/contenuti/+page.server.js` (**era `admin/prezzi`, risolto Fase 3 2026-07-11**) | Legge un solo report locale (`price-enrichment-candidates-*.json`, non più 4) e mostra fino a 200 righe. | `readLatestCandidatesReport(...)`, `rows.slice(0, 200)`. | Basso/medio (ridotto): un solo report invece di quattro letti in parallelo. | Caricare solo metadata e paginare righe report, se il report locale crescesse molto. |
| `src/lib/server/claim-request-store.js` | POST/PATCH claim usa `Prefer: return=representation`. | `Prefer: 'return=representation'`. | Medio: dopo scrittura ritorna record completo, incluso campi estesi. | Usare `return=minimal` dove possibile, oppure `select`/ritorno ristretto post-write. |
| `src/routes/admin/import/+page.server.js` | Fuori lista principale, ma grep mostra `readGyms()` e scrittura audit diretta. | `readGyms()` in import/dry run; fetch diretto `admin_audit_log`. | Medio/alto, area operativa sensibile. | Audit dedicato futuro su import; mantenere conferme, backup e limiti. |

## 5. Pagine admin da paginare

| pagina | dati caricati oggi | proposta paginazione | proposta campi minimi |
| --- | --- | --- | --- |
| `/admin` | tutto `gyms` completo + tutti i claim. | Nessuna tabella completa; stats aggregate o max 20 richieste recenti. | Gyms stats: `phone,website,hours_info,deleted_at`. Claim stats: `id,status,created_at`. |
| `/admin/schede` | tutte le palestre complete, poi `adminGymView`. | `limit=50`, `offset`, search server-side, filtri archived/quality. | `id,slug,nome/name,citta/city,indirizzo/address,telefono/phone,sito/website,discipline/disciplines,orari/hours_info,is_verified,is_premium,priority_score,deleted_at,updated_at`. |
| `/admin/gyms/[id]` | tutto `gyms` completo per un ID. | Nessuna paginazione: query by ID `limit=1`. | Form detail: campi modificabili e descrizioni necessarie, non tutto il catalogo. |
| `/admin/qualita` | tutto `gyms` completo + claim completi, duplicati/stats in memoria. | `limit=50`, filtri problema server-side, stats separate. | Per lista: id, name, city, address, phone, website, hours, discipline, verified, deleted_at, quality score fields. Claim index minimo. |
| `/admin/riclassifica` | tutto `gyms` completo. | `limit=50`, search/filtro discipline server-side, bulk solo su pagina/selezione. | id, name, city, address, discipline/disciplines, verified, deleted_at. |
| `/admin/qualita/contenuti` (**era `/admin/prezzi`, risolto Fase 3 2026-07-11**) | `gyms` completo solo come fallback senza report locale; niente più scraping né 4 tab. | Limit report, stats con campi minimi. | id, name, city, website, price_info, description/descrizione flag, hours/phone solo se necessari. |
| `/admin/richieste` | tutti i claim completi. | `limit=50`, `offset`, filtro status. | id, created_at, gym_id, gym_name, gym_url, requester_name, requester_email, status, updated_at. Dettaglio con `message`, `requested_updates`, `image_uploads`, `admin_notes`. |
| `/admin/audit` | 50 audit log con JSON before/after. | Lista `limit=50` ok, ma senza JSON; detail on demand. | id, created_at, actor, action, table_name, record_id, maybe summary/diff_size. |

## 6. Audit log

Lettura lista:

- `src/routes/admin/audit/+page.server.js` chiama `readAdminAuditLog({ limit: 50 })`.
- `src/lib/server/admin-audit-store.js` limita a max 100 righe.
- Problema: la lista seleziona anche `before_data` e `after_data`.

Scrittura:

- `writeAdminAuditLog()` usa POST su `admin_audit_log` con `Prefer: return=minimal`, bene per traffico di risposta.
- Il payload scritto può essere enorme, perché alcune action passano record completi.

Peso `before_data/after_data`:

- `QUALITY_MERGE` salva primary/secondary completi prima e dopo.
- `QUALITY_ARCHIVE_GYM` salva intero record prima e dopo.
- `CLAIM_<status>` in `/admin/richieste` salva claim completo prima e dopo, incluso potenzialmente `requested_updates`, `image_uploads`, `admin_notes`.

Proposta:

- Lista audit: solo metadata.
- Endpoint/detail audit: carica `before_data/after_data` per singolo `id`.
- Scrittura audit: salvare `changed_fields`, `before_summary`, `after_summary`, `record_id`, `action`, `actor`, dimensione payload; evitare record completi salvo eventi eccezionali.
- Troncamento campi testuali/JSON o hash per payload grandi.

## 7. Claim requests

Lettura:

- `readClaimRequestsFromSupabase()` usa `select=*` senza `limit`.
- `/admin`, `/admin/qualita`, `/admin/richieste` consumano questa lista.
- `updateClaimRequestStatus()` rilegge tutte le richieste per trovare un ID.

Scrittura:

- `createClaimRequest()` scrive claim con campi estesi e invia email.
- `patchClaimRequestInSupabase()` usa `Prefer: return=representation`, quindi torna record completo.

Proiezione campi:

- Lista admin dovrebbe usare solo campi metadata e contatto essenziale.
- Dettaglio claim on demand dovrebbe includere `message`, `requested_updates`, `image_uploads`, `admin_notes`, token solo se strettamente necessari e mai in liste pubbliche/admin non necessarie.

Paginazione:

- Default `limit=50`, max `100`.
- Filtro `status`.
- `order=created_at.desc`.
- Per action update, query diretta `id=eq.<id>&limit=1`.

## 8. Export/admin script

Export CSV:

- `src/routes/admin/export/gyms.csv/+server.js` usa `readGyms()` e genera CSV completo.
- Rischio traffico alto e possibile esposizione accidentale di dati se l'endpoint admin viene chiamato spesso.
- Va trasformato in POST confermato, con `no-store`, audit compatto, eventuale rate limit e campi CSV espliciti letti da query dedicata.

Backup/import:

- Non era nel perimetro primario, ma grep segnala `src/routes/admin/import/+page.server.js` con `readGyms()` e scrittura audit log diretta.
- Richiede un audit separato prima di modifiche, perché tocca flussi import/backup più rischiosi.

Azioni pericolose:

- `mergeGyms`, `archiveGym`, `normalizeDisciplines`, bulk riclassifica e approve editorial scrivono dati.
- Alcune hanno conferme testuali (`UNISCI`, `NORMALIZZA`, `ARCHIVIA`), buon guardrail funzionale.
- Manca però limite strutturale di batch/concorrenza e lettura mirata per ID.

Conferme necessarie:

- Bulk update: limite massimo record e conferma con conteggio.
- Export: conferma esplicita e scopo export.
- Merge/archive qualità: conferma già presente, ma audit payload da ridurre.
- Preview prezzi/editoriale: conferma e rate limit, meglio job asincrono.

## 9. Piano fix consigliato

### Fix immediati

1. Implementare `readClaimRequestsList({ limit, offset, status })` senza `select=*`.
2. Cambiare `/admin/richieste`, `/admin`, `/admin/qualita` per usare claim list paginata/proiezione minima.
3. Cambiare audit log list per non selezionare `before_data/after_data`.
4. Paginare `/admin/schede` con proiezione admin-list minima.
5. Sostituire `/admin/gyms/[id]` con query by ID `limit=1`.
6. Bloccare o convertire export CSV GET in azione POST confermata.

### Fix successivi

1. Paginare `/admin/qualita` e separare stats aggregate da lista.
2. Paginare `/admin/riclassifica`; limitare bulk update e rimuovere `Promise.all` non limitato.
3. ~~Ottimizzare `/admin/prezzi` con query minima e job separato per preview/scraping.~~ Fatto in Fase 3 (2026-07-11): pagina batch sostituita da `/admin/qualita/contenuti` (lista) + scraping scoped a 1 scheda per volta in `/admin/gyms/[id]`.
4. Sostituire action che leggono tutto il catalogo con letture per ID o batch ID.
5. Ridurre audit payload in tutte le action qualità/claim.

### Ottimizzazioni future

1. Helper admin server condivisi:
   - `readAdminGymList`
   - `readAdminGymById`
   - `readAdminGymStats`
   - `readClaimRequestsList`
   - `readAuditLogList`
2. View/RPC read-only per statistiche admin.
3. Cache breve per dashboard admin.
4. Audit separato per area import/backup.
5. Monitorare dimensione media `admin_audit_log.before_data/after_data` e crescita `claim_requests`.

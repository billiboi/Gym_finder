# Admin Claims + Audit Log Fixes Report

## 1. File modificati

- `src/lib/server/claim-request-store.js`
- `src/lib/server/admin-audit-store.js`
- `src/routes/admin/+page.server.js`
- `src/routes/admin/richieste/+page.server.js`
- `src/routes/admin/qualita/+page.server.js`
- `src/routes/admin/audit/+page.server.js`
- `src/routes/admin/audit/+page.svelte`

## 2. Nuove funzioni introdotte/modificate

- `readClaimRequestsList({ limit, offset, status })`
  - Default `limit=50`.
  - Max `limit=100`.
  - Default `offset=0`.
  - Filtro `status` opzionale.
  - Usa proiezione esplicita e non usa `select=*`.

- `readClaimRequestById(id)`
  - Carica una singola richiesta con `id=eq.<id>` e `limit=1`.
  - Include i campi completi necessari alle action admin.

- `readAdminAuditLogList({ limit, offset })`
  - Default `limit=30`.
  - Max `limit=100`.
  - Default `offset=0`.
  - Esclude `before_data` e `after_data`.

- `readAdminAuditLogEntry(id)`
  - Helper separato per caricare un singolo record audit completo.
  - Usa `id=eq.<id>` e `limit=1`.
  - Non è collegato a una nuova UI in questo step.

- `readAdminAuditLog(options)`
  - Mantiene compatibilità e delega a `readAdminAuditLogList(options)`.

## 3. Campi selezionati per claim list

La lista claim seleziona solo:

- `id`
- `created_at`
- `updated_at`
- `gym_id`
- `gym_name`
- `gym_url`
- `requester_name`
- `requester_email`
- `requester_role`
- `status`
- `approved_at`
- `rejected_at`
- `email_verified_at`

## 4. Campi esclusi dalla claim list

La lista claim non seleziona:

- `verification_token`
- `owner_token`
- `requested_updates`
- `image_uploads`
- `admin_notes`
- `message`
- `requester_phone`
- `reason`

Questi campi restano disponibili solo nella lettura dettaglio per singola claim.

## 5. Campi selezionati per audit list

La lista audit seleziona solo:

- `id`
- `created_at`
- `actor`
- `action`
- `table_name`
- `record_id`

La lista audit non seleziona `before_data` e `after_data`.

## 6. Dettaglio claim/audit

- Claim detail: `readClaimRequestById(id)` carica una singola richiesta completa con `limit=1`.
- Claim update: `updateClaimRequestStatus()` non legge più tutta la lista per trovare l'ID, ma usa `readClaimRequestById(id)`.
- Audit detail: `readAdminAuditLogEntry(id)` carica `before_data` e `after_data` solo per un singolo record.
- UI audit: la tabella non riceve più before/after nella lista. Quando non trova dettagli, mostra `Dettaglio non caricato in lista`.

## 7. Test eseguiti

- `bun run check`: passato, 0 errori e 0 warning.
- `bun run build`: Vite client e SSR compilano; adapter Vercel fallisce dopo la compilazione per symlink Windows.
- Verifica statica: nessun `select=*` nei file modificati per claim/audit/admin collegati.
- Verifica statica: `readAdminAuditLogList()` seleziona solo `id,created_at,actor,action,table_name,record_id`.
- Verifica HTTP locale:
  - `/admin`: `303`
  - `/admin/richieste`: `303`
  - `/admin/audit`: `303`
  - `/admin/qualita`: `303`

I redirect `303` sono coerenti con la protezione auth admin.

## 8. Errori o test non eseguiti

- `bun run build` fallisce in `@sveltejs/adapter-vercel` con:
  - `EPERM: operation not permitted, symlink '![-]\catchall.func' -> '.vercel\output\functions\index.func'`
  - La compilazione Vite client/SSR è completata prima dell'errore.
- Non ho eseguito un test reale di approvazione/rifiuto claim perché aggiornerebbe dati.
- Non ho verificato una sessione admin autenticata via browser perché lo step richiedeva patch minima e non modifiche UI complesse.

## 9. Rischi residui

- `src/routes/admin/+page.server.js` e `src/routes/admin/qualita/+page.server.js` continuano a leggere il catalogo palestre tramite `readGyms()`. Questo resta fuori scope rispetto al fix claim/audit.
- `approveClaimAndVerifyGym()` continua a leggere `readGyms()` per verificare la palestra prima dell'approvazione. Non è stato modificato per evitare cambiamenti funzionali nella action di approvazione.
- `findClaimRequestByOwnerToken()` e `verifyClaimEmail()` usano ancora `readClaimRequests()`, ora con proiezione esplicita e limite massimo 500. Restano candidati per una query mirata per token.
- La UI audit non mostra ancora un pannello dettaglio on demand per `before_data` e `after_data`; il helper server è pronto.
- `hasMore` sulle liste usa `rows.length === limit`, quindi non distingue con certezza tra pagina piena e presenza di pagina successiva. Evita una query count aggiuntiva.

## 10. Prossimi interventi admin consigliati

Ottimizzare le letture admin basate su `readGyms()` in dashboard, qualità, schede e dettaglio gym con query paginata e proiezioni per vista.

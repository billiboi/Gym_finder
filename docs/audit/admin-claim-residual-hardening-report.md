# Admin Claim Residual Hardening Report

## 1. File modificati

- `src/lib/server/gym-store.js`
- `src/routes/admin/richieste/+page.server.js`

## 2. Miglioramenti al lookup palestra claim

- Il parsing dello slug da `gym_url` ora vive in un helper server dedicato.
- `readAdminGymForClaimApproval()` accetta anche `gymUrl`.
- Il fallback per nome resta disponibile, ma viene eseguito solo dopo ID, slug esplicito, slug da URL e ID legacy da URL.
- Ogni lookup Supabase usa `limit=1` e la proiezione minima `ADMIN_CLAIM_APPROVAL_GYM_COLUMNS`.
- La route admin richieste non contiene più parsing URL locale.

## 3. Ordine finale di lookup

Ordine applicato da `readAdminGymForClaimApproval()`:

1. `id=eq.<gym_id>`, se `gym_id` è presente.
2. `slug=eq.<slug>`, se uno slug esplicito è presente.
3. `slug=eq.<slug estratto da gym_url>`, se `gym_url` contiene `/palestre/<slug>`.
4. `id=eq.<legacy id estratto da gym_url>`, se lo slug URL contiene un token finale compatibile.
5. `nome/name ilike <gym_name>`, solo come fallback finale.

Il fallback locale mantiene lo stesso ordine sui dati locali.

## 4. Helper introdotti

- `extractGymSlugFromUrl(gymUrl)`
  - Gestisce URL relativi come `/palestre/nome-palestra`.
  - Gestisce URL assoluti come `https://palestreinzona.it/palestre/nome-palestra`.
  - Ignora trailing slash, querystring e fragment.
  - Restituisce stringa vuota se l'input è vuoto o non contiene una route palestra.

- `extractLegacyGymIdFromSlug(slug)`
  - Estrae UUID finali.
  - Estrae token finali con cifre da slug legacy tipo `nome-palestra-123`.
  - Restituisce stringa vuota per slug senza token compatibile.

## 5. Risultato audit `updateGymRecord()`

`updateGymRecord()` usa ancora:

- `Prefer: return=representation`

Chiamanti principali rilevati:

- `src/routes/admin/schede/+page.server.js`: non usa il ritorno.
- `src/routes/admin/gyms/[id]/+page.server.js`: non usa il ritorno.
- `src/routes/admin/qualita/+page.server.js`: non usa il ritorno.
- `src/routes/admin/riclassifica/+page.server.js`: non usa il ritorno.
- `src/routes/admin/prezzi/+page.server.js`: non usa il ritorno.
- `src/routes/admin/richieste/+page.server.js`: usa il ritorno in `savedGymRows` per `gym_id`, `recordId` e audit.

## 6. Modifica a `updateGymRecord()`

`updateGymRecord()` non è stato modificato.

Motivo: almeno un chiamante, il flusso claim approval in `src/routes/admin/richieste/+page.server.js`, dipende dal record restituito. Passare a `return=minimal` romperebbe o impoverirebbe il comportamento corrente di audit e aggiornamento claim.

Proposta futura: introdurre una funzione separata `updateGymRecordMinimal()` per i chiamanti admin che non usano il record restituito.

## 7. Test eseguiti

- `bun run check`: passato, 0 errori e 0 warning.
- `bun run build`: Vite client e SSR compilano; adapter Vercel fallisce dopo la compilazione per symlink Windows.
- Verifica statica:
  - nessun nuovo `select=*` introdotto.
  - `approveClaimAndVerifyGym()` non usa `readGyms()`.
  - `readAdminGymForClaimApproval()` considera lo slug da `gymUrl` prima del fallback per nome.
  - `updateGymRecord()` mantiene `return=representation`.
- Verifica HTTP locale:
  - `/admin/richieste`: `303`
  - `/rivendica-scheda/verifica/test-token-non-reale`: `303`

I redirect `303` sono coerenti con i flussi protetti/redirect locali.

## 8. Errori o test non eseguiti

- `bun run build` fallisce in `@sveltejs/adapter-vercel` con:
  - `EPERM: operation not permitted, symlink '![-]\catchall.func' -> '.vercel\output\functions\index.func'`
  - La compilazione Vite client/SSR è completata prima dell'errore.
- Non ho eseguito approvazione claim reale perché scriverebbe su `gyms` e `claim_requests`.
- Non ho usato token reali di verifica claim per evitare accesso a dati sensibili.

## 9. Rischi residui

- `readGymsFromSupabase()` mantiene il vecchio `select=*` globale come funzione legacy. Non è stato rimosso per vincolo esplicito.
- Il fallback per nome può ancora trovare una scheda sbagliata se due palestre hanno lo stesso nome. Ora è l'ultima opzione.
- L'estrazione ID legacy da URL è conservativa: considera UUID finali o token finali con cifre.

## 10. Prossimi interventi consigliati

Creare `updateGymRecordMinimal()` e usarla nei chiamanti admin che non dipendono dal record restituito.

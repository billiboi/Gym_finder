# Admin Claim Actions Microfix Report

## 1. File modificati

- `src/lib/server/claim-request-store.js`
- `src/lib/server/gym-store.js`
- `src/routes/admin/richieste/+page.server.js`

## 2. Funzioni claim aggiornate

- `findClaimRequestByOwnerToken(ownerToken)`
  - Ora delega a `readClaimRequestByOwnerToken(ownerToken)`.
  - Non legge più la lista completa claim.

- `verifyClaimEmail(verificationToken)`
  - Ora usa `readClaimRequestByVerificationToken(verificationToken)`.
  - Non legge più la lista completa claim.

- `approveClaimAndVerifyGym({ claim, status, adminNotes })`
  - Non usa più `readGyms()`.
  - Cerca la palestra collegata con helper mirato e poi aggiorna solo quella scheda.

## 3. Nuove query mirate introdotte

- Claim by owner token:
  - tabella `claim_requests`
  - filtro `owner_token=eq.<token>`
  - `limit=1`
  - campi `CLAIM_DETAIL_COLUMNS`

- Claim by verification token:
  - tabella `claim_requests`
  - filtro `verification_token=eq.<token>`
  - `limit=1`
  - campi `CLAIM_DETAIL_COLUMNS`

- Gym per approvazione claim:
  - tabella `gyms`
  - proiezione `ADMIN_CLAIM_APPROVAL_GYM_COLUMNS`
  - tentativi in ordine: `id=eq.<id>`, poi `slug=eq.<slug>`, poi `nome/name ilike <name>`
  - `limit=1`

Campi palestra selezionati:

- `id`
- `slug`
- `name`
- `nome`
- `city`
- `citta`
- `address`
- `indirizzo`
- `discipline`
- `disciplines`
- `is_verified`
- `data_verified_at`
- `weekly_hours`
- `deleted_at`

## 4. Dove è stato rimosso `readClaimRequests()`

- `findClaimRequestByOwnerToken()` non chiama più `readClaimRequests()`.
- `verifyClaimEmail()` non chiama più `readClaimRequests()`.

`readClaimRequests()` resta nel file per compatibilità con chiamanti legacy, ma non viene più usato da questi due flussi token.

## 5. Dove è stato rimosso `readGyms()`

- `src/routes/admin/richieste/+page.server.js`
  - `approveClaimAndVerifyGym()` usa `readAdminGymForClaimApproval()` al posto di `readGyms()`.
  - L'import di `readGyms` è stato rimosso dalla route.

## 6. Test eseguiti

- `bun run check`: passato, 0 errori e 0 warning.
- `bun run build`: Vite client e SSR compilano; adapter Vercel fallisce dopo la compilazione per symlink Windows.
- Verifica statica:
  - `findClaimRequestByOwnerToken()` non usa `readClaimRequests()`.
  - `verifyClaimEmail()` non usa `readClaimRequests()`.
  - `approveClaimAndVerifyGym()` non usa `readGyms()`.
  - Nessun nuovo `select=*` introdotto dalle query claim/gym mirate.
- Verifica HTTP locale:
  - `/admin/richieste`: `303`
  - `/rivendica-scheda/verifica/test-token-non-reale`: `303`

I `303` sono coerenti con redirect/protezione dei flussi in ambiente locale.

## 7. Errori o test non eseguiti

- `bun run build` fallisce in `@sveltejs/adapter-vercel` con:
  - `EPERM: operation not permitted, symlink '![-]\catchall.func' -> '.vercel\output\functions\index.func'`
  - La compilazione Vite client/SSR risulta completata prima dell'errore.
- Non ho eseguito approvazione claim reale perché scriverebbe su `gyms` e `claim_requests`.
- Non ho testato token reali per verifica email o dashboard owner per evitare accesso a dati sensibili.

## 8. Rischi residui

- `readGymsFromSupabase()` contiene ancora il vecchio `select=*` globale. Questo micro-fix rimuove la chiamata dal flusso claim approval, ma non elimina la funzione legacy.
- Il fallback per nome in `readAdminGymForClaimApproval()` usa match case-insensitive esatto su `nome/name`; se la claim contiene un nome diverso dalla scheda, serve `gym_id` o slug da URL.
- `updateGymRecord()` resta la funzione di scrittura esistente. Questo step non modifica il payload di update.

## 9. Prossimi interventi consigliati

Sostituire i rimanenti chiamanti admin di `readGyms()` con query paginata e proiezione per vista.

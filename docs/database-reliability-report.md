# Database reliability report

Data: 2026-05-06

## Stato attuale

Il progetto usa ancora un modello applicativo compatibile con campi legacy inglesi (`name`, `address`, `city`, `phone`, `website`, `hours_info`, `latitude`, `longitude`), mentre il target stabile del prodotto è lo schema italiano (`nome`, `indirizzo`, `citta`, `telefono`, `sito`, `orari`, `lat`, `lng`).

Per evitare rotture, la normalizzazione deve passare sempre da `src/lib/gym-normalizer.js`. Il database non deve essere rinominato in modo distruttivo: le colonne italiane vengono aggiunte in modo additivo e il codice resta compatibile con il catalogo legacy.

## Rischi rilevati

- Schema misto: la UI e alcune API leggono ancora campi inglesi, mentre export/import admin devono parlare italiano.
- Script legacy: `scripts/sync-supabase-gyms.mjs` in passato poteva sostituire la tabella con `DELETE` + insert. Ora è limitato a upsert sicuro.
- Assenza storica di audit log: senza traccia prima/dopo è difficile ricostruire modifiche admin.
- Staging non formalizzato: preview e produzione devono usare Supabase separati.
- Import CSV: la strada corretta è preview, mapping, dry-run e conferma finale. L'import diretto resta vietato.

## Guardrail attivi

- Soft delete admin tramite `deleted_at`.
- Export CSV backup da area admin.
- Import CSV con preview, validazione, duplicati, dry-run e conferma.
- Writer Supabase senza cancellazioni fisiche.
- Migration additiva per bloccare `DELETE` fisico su `public.gyms`.
- Audit trigger additivo su `INSERT` e `UPDATE`.

## Schema target

Campi definitivi `public.gyms`:

- `id`
- `slug`
- `nome`
- `indirizzo`
- `citta`
- `provincia`
- `regione`
- `telefono`
- `email`
- `sito`
- `descrizione`
- `discipline`
- `orari`
- `lat`
- `lng`
- `is_premium`
- `is_verified`
- `priority_score`
- `deleted_at`
- `created_at`
- `updated_at`

Campo tecnico aggiunto:

- `data_quality_score`

Tabella audit:

- `public.admin_audit_log`

## Piano staging -> produzione

1. Creare un progetto Supabase staging separato.
2. Configurare env staging separati: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_GYMS_TABLE`.
3. Esportare `public.gyms` produzione in locale con timestamp e conteggio.
4. Ripristinare la copia in staging solo dopo verifica del file sorgente.
5. Applicare migration in staging.
6. Verificare conteggio righe, colonne target, audit log e blocco delete.
7. Eseguire import/modifiche su staging.
8. Esportare staging e confrontare conteggi/differenze.
9. Solo dopo conferma esplicita, applicare migration in produzione.
10. Verificare conteggio produzione invariato e testare admin.

## Checklist deploy sicuro

- Backup JSON/CSV locale creato e conteggio verificato.
- Nessuna query con `DROP`, `TRUNCATE` o `DELETE`.
- Migration applicata prima in staging.
- `bun run check` passato.
- Admin: edit, archive, restore, export, import dry-run testati.
- API pubbliche leggono solo schede non archiviate.
- Vercel preview non usa service role produzione.

## Rischi residui

- Serve una migrazione dati controllata per valorizzare le nuove colonne italiane dai campi legacy esistenti. Non va fatta automaticamente.
- L'utente admin non è ancora identificato nominativamente nell'audit log: il trigger registra il ruolo database. Per audit utente reale serve auth admin nominativa.
- Alcune pagine pubbliche continuano a consumare alias inglesi per compatibilità. È voluto finché lo schema italiano non sarà popolato e verificato.

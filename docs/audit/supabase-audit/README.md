# Supabase Audit Bundle

Generato il 2026-06-05T12:23:23.080Z usando esclusivamente Supabase staging in sola lettura via REST/OpenAPI e le migration SQL locali.

## Target

- Ambiente dichiarato: staging
- Tabelle REST public rilevate: admin_audit_log, claim_requests, gyms
- RPC REST rilevate: rpc/gyms_quality_score_from_row
- Nessuna chiave, password, token o variabile .env e stata esportata.
- I sample di `public.gyms` hanno email e telefoni anonimizzati.

## File

- `tables.csv`: elenco tabelle public esposte da REST.
- `columns.csv`: colonne, tipi, default, nullable e hint PK da OpenAPI.
- `constraints.md`: primary key, foreign key, unique e references ricostruite dalle migration locali.
- `rls-policies.md`: policy RLS e stato RLS ricostruiti dalle migration locali.
- `functions-rpc-triggers.md`: RPC esposte da REST, funzioni e trigger da migration locali.
- `row-counts.csv`: conteggi stimati per tabella via `Prefer: count=planned`.
- `gyms-sample-20-anonymized.csv`: sample di 20 schede `public.gyms`, con contatti redatti.
- `failure-examples.md`: 5 esempi identificabili da segnali qualita/editoriali.

## Limiti

Supabase REST/OpenAPI non espone direttamente tutte le constraint, lo stato RLS live, le policy live o i trigger live. Questi elementi sono quindi ricostruiti dalle migration versionate nel repository, non da query dirette a `pg_catalog`.

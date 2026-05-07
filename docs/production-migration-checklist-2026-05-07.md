# Production migration checklist

Data: 2026-05-07

Obiettivo: applicare in production solo hardening additivo già testato su staging.

## Regole

- Non usare `DROP TABLE`.
- Non usare `TRUNCATE`.
- Non usare `DELETE FROM`.
- Non rinominare colonne.
- Non sostituire dati production da file locali.
- Non applicare import CSV in production durante questa finestra.
- Fermarsi se il conteggio production cambia in modo inatteso.

## Stato verificato prima della migration

- Export production: `data/supabase-gyms-export-2026-05-07T11-19-57-063Z.json`
- Conteggio export production: `683`
- Conteggio Supabase production: `0-682/683`
- Conteggio API live: `683`
- Schema production attuale: legacy.

Colonne legacy presenti:

- `id`
- `name`
- `city`

Colonne/oggetti mancanti:

- `nome`
- `citta`
- `deleted_at`
- `data_quality_score`
- `created_at`
- `updated_at`
- `is_premium`
- `is_verified`
- `priority_score`
- `admin_audit_log`

## Migration da applicare

Applicare solo:

```txt
supabase/migrations/20260506_006_gyms_stability_hardening.sql
```

Non applicare in production la baseline staging:

```txt
supabase/migrations/20260506_000_create_gyms_baseline.sql
```

La baseline serve solo per progetti staging vuoti.

## Pre-check immediato

1. Confermare di essere nel progetto Supabase production corretto.
2. Aprire SQL Editor production.
3. Verificare che il file migration non contenga pattern distruttivi:

```bash
rg -n --fixed-strings "DROP TABLE" supabase/migrations/20260506_006_gyms_stability_hardening.sql
rg -n --fixed-strings "TRUNCATE" supabase/migrations/20260506_006_gyms_stability_hardening.sql
rg -n --fixed-strings "DELETE FROM" supabase/migrations/20260506_006_gyms_stability_hardening.sql
```

Output atteso: nessuna occorrenza.

4. Verificare conteggio immediato prima dell'applicazione:

```bash
bun scripts/export-supabase-gyms.mjs --env-file=.env.vercel.production.check
```

Output atteso: `count=683`.

## Applicazione SQL

1. Copiare il contenuto di:

```txt
supabase/migrations/20260506_006_gyms_stability_hardening.sql
```

2. Incollarlo nel SQL Editor del progetto Supabase production.
3. Eseguire.
4. Se Supabase mostra warning RLS su nuove tabelle, accettare RLS se riferito a tabelle nuove.
5. Se l'esecuzione fallisce, non riprovare modificando SQL a mano. Salvare errore e fermarsi.

## Post-check obbligatorio

1. Verificare conteggio Supabase:

```bash
bun scripts/export-supabase-gyms.mjs --env-file=.env.vercel.production.check
```

Output atteso: `count=683`.

2. Verificare API live:

```bash
curl.exe -s -L https://palestreinzona.it/api/gyms
```

Conteggio atteso: `683`.

3. Verificare colonne production:

- `id`
- `nome`
- `citta`
- `deleted_at`
- `data_quality_score`
- `created_at`
- `updated_at`
- `is_premium`
- `is_verified`
- `priority_score`

4. Verificare `admin_audit_log` esistente.
5. Verificare homepage live carichi.
6. Verificare `/admin` apra login/admin senza errori.
7. Verificare export admin CSV, ma non fare create/import in production durante questa fase.

## Rollback non distruttivo

Questa migration è additiva. Il rollback operativo non deve cancellare colonne.

Se qualcosa non va:

1. Non fare `DROP`.
2. Non fare `TRUNCATE`.
3. Non fare restore dati.
4. Disattivare temporaneamente uso delle nuove colonne dal codice solo se necessario.
5. Usare il backup export come riferimento diagnostico, non come sostituzione automatica.

## Criteri di successo

- Migration eseguita senza errori.
- Conteggio production invariato: `683`.
- API live invariata: `683` record attivi.
- Tabelle/colonne hardening presenti.
- Nessun dato produzione sovrascritto.
- Admin ancora accessibile.

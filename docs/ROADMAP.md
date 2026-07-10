# Roadmap — aggiornata al 10 luglio 2026 (post-P0)

Contesto: P0–P4 completati (vedi docs/gsc-analysis-2026-07-09.md). Il P0 era un bug della sitemap (fallback rimosso l'11 giugno, corretto con PR #15). Durante la diagnosi è emersa la divergenza staging/produzione Supabase: è la nuova priorità 1.

## 1. Riconciliare staging e produzione Supabase — ✅ COMPLETATO (10 luglio 2026)

`.env.staging.local` e `.env.vercel.production.check` puntano a due progetti Supabase distinti, divergenti da metà maggio 2026. Produzione aveva archiviato autonomamente ~146 schede; le pulizie P4 fatte su staging (131 record) risultavano già tutte presenti in produzione — nessuna riapplicazione necessaria da quel lato.

- ✅ Fonte di verità: produzione (`.env.vercel.production.check`)
- ✅ Diff completo: `docs/audit/staging-production-diff-2026-07.md` (script riusabile: `bun scripts/audit-staging-production-diff.mjs`)
- ✅ Pulizie P4: verificato che erano già tutte presenti in produzione in modo indipendente — nessuna scrittura necessaria su produzione
- ✅ Staging riallineato come copia di produzione: 15 record di stato attivo/archiviato riconciliati (`scripts/reconcile-staging-with-production.mjs`) + upsert completo di tutti i campi enrichment su 683 record (`scripts/copy-production-into-staging.mjs`). Diff finale: 0 divergenze (a parte 3 record di test presenti solo su staging, già archiviati, lasciati intatti)
- ✅ Documentato in `docs/OPERATIONS.md`: mappatura ambienti, regola "verifica sempre contro produzione", nota di rischio su `sync:gyms:prod`

Nessuna scrittura è mai stata fatta su produzione in questo lavoro — solo letture e riconciliazione lato staging.

## 2. Monitoraggio recupero GSC (passivo, in parallelo)

- Fix sitemap in produzione dal 10 luglio: verificare tra 2–3 settimane che impressioni e indicizzazione risalgano
- Se a inizio agosto non c'è recupero: torna priorità attiva

## 3. Pipeline acquisizione palestre (scraper + review queue) — un unico progetto

Punto 1 completato — sbloccato, può partire quando serve.

- Scraper da fonti compatibili con i ToS (OpenStreetMap, siti ufficiali, elenchi pubblici; NO Google Maps)
- Validazione automatica in ingresso: filtri categoria, blacklist (negozi, supermercati, estetiste...), dedup su nome+indirizzo+coordinate
- Scrittura SOLO su tabella staging dedicata, mai su public.gyms
- Review queue in admin: approva / scarta / correggi → pubblicazione
- Riusare/estendere admin/import, admin/qualita, admin/riclassifica

## 4. Upgrade area admin

- Completare ciò che la review queue non copre: claim, audit, qualità
- Metriche operative: schede da rivedere, pubblicate, contaminazione intercettata

## 5. UI incrementale (NO restyling completo)

- Finire i punti 5–6 di AGENTS.md: gym cards e pagine dettaglio (landing del traffico brand)
- Poi punti 7–8: consistenza visiva, accessibilità, performance

## 6. Landing zone/discipline v2

- Contenuto reale su /zone/ e /discipline/: conteggi, prezzi medi, mappa, palestre in evidenza
- Landing combinate disciplina+città (pilates-varese, boxe-lugano) quando il catalogo le sostiene

## 7. Restyling UI completo

- Solo con traffico risalito e misurabile (serve una baseline)
- Ripartire dal sistema visivo esistente, non da zero

## Regole trasversali

- Ogni progetto dati passa da staging + revisione manuale
- bun run check + seo:check:* prima di ogni deploy (/pre-deploy)
- Controllo GSC quindicinale: query in crescita → orientano le prossime landing

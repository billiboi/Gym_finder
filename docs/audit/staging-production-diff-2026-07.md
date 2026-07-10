# Diff staging vs produzione — public.gyms

Generato: 2026-07-10T12:39:13.392Z

Sola lettura. Nessuna scrittura eseguita su nessuno dei due database.

## Conteggi

| | Staging (`wftdlkbtfqlnpegcwnpj`) | Produzione (`opcdyoypuhuoflzwzdrl`) |
|---|---:|---:|
| Totale | 686 | 683 |
| Attive | 537 | 537 |
| Archiviate | 149 | 146 |

Record in comune (stesso id): 683
Solo in staging: 3
Solo in produzione: 0

## Archiviate su staging (fase P4, oggi) ma ancora attive in produzione

0 record. Queste sono le pulizie P4 fatte su staging che NON hanno ancora effetto sul sito live.


## Archiviate autonomamente in produzione ma ancora attive su staging

0 record. Pulizia indipendente di produzione (metà maggio) mai replicata su staging.


## Record presenti solo in staging (non esistono in produzione)

3 record.

| id | nome | stato staging |
|---|---|---|
| gym-5852d918-c6a5-47d6-a63e-8ac995ef87de | Codex Preview Admin Test 20260507104945 | archiviata |
| import-test-20260507105751 | Codex Import Test 20260507105751 | archiviata |
| test-direct-35cda3482b864359b941accf69d809fa | Direct Supabase Test | archiviata |

## Record presenti solo in produzione (non esistono in staging)

0 record.


## Divergenze nei campi enrichment (solo record attivi in entrambi)

0 record con differenze in price_info, description, o data_verified_at.



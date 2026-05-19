# Audit correttivo pubblico urgente - 2026-05-19

## Scope

Audit eseguito prima su staging/preview. Nessuna modifica diretta a Supabase production eseguita da Codex.

## Conteggi osservati

- Export staging read-only: 686 record.
- Staging non archiviati secondo `isArchivedGym`: 683.
- Homepage live osservata prima del fix: 542 schede pubbliche e 78 discipline.
- Dopo il fix codice: homepage, `/chi-siamo` e `/per-le-palestre` leggono i conteggi dalla stessa funzione `buildCatalogStats`.

## Schede contaminate confermate su live

| Scheda | Id | Problema | Campi contaminati | Fonte errata probabile | Fix codice |
| --- | --- | --- | --- | --- | --- |
| Curling Club Chiasso | `csv-165` | La scheda mostra dati di CrossFit Varese/CrossFit V-ONE. | `description`, `official_source_url`, `editorial_summary`, `editorial_highlights`, `editorial_faq_items`, `price_info`, `price_source_url`, JSON-LD derivato. | `crossfitvarese.com` | Quarantena pubblica dei campi contaminati. |
| Old School Fighting Lugano | `csv-413` | La scheda mostra dati di Good Life Academy/Ohana Yoga Nidra. | `website`, `description`, `official_source_url`, `editorial_summary`, `editorial_highlights`, `editorial_faq_items`, JSON-LD derivato. | `goodlifeacademy.ch` | Quarantena pubblica dei campi contaminati. |
| Societ Federale di Ginnastica Chiasso | `csv-542` | La scheda mostra dati SMASH X3/Bellavista Varese. | `description`, `official_source_url`, `editorial_summary`, `editorial_highlights`, `editorial_faq_items`, JSON-LD derivato. | `smashx3.com` | Quarantena pubblica dei campi contaminati. |
| DeaYoga | `csv-173` | La scheda mostra dati De Nittis Choy Lay Fut. | `description`, `official_source_url`, `editorial_summary`, `editorial_highlights`, `editorial_faq_items`, JSON-LD derivato. | `denittischoylayfutswitzerland.com` | Quarantena pubblica dei campi contaminati. |
| Mangrove Academy | `csv-364` | La scheda mostra dati MADDYFIT. | `description`, `official_source_url`, `editorial_summary`, `editorial_highlights`, `editorial_faq_items`, JSON-LD derivato. | `maddyfit.ch` | Quarantena pubblica dei campi contaminati. |
| Endless Will - Margherita Montes | `csv-194` | La scheda mostra dati Emotion Fitness. | `description`, `official_source_url`, `editorial_summary`, `editorial_highlights`, `editorial_faq_items`, JSON-LD derivato. | `my-emotion.it` | Quarantena pubblica dei campi contaminati. |
| Team Kimura Ticino | `csv-606` | La scheda mostra dati TC Lugano 1903. | `description`, `official_source_url`, `editorial_summary`, `editorial_highlights`, `editorial_faq_items`, JSON-LD derivato. | `tclugano1903.ch` | Quarantena pubblica dei campi contaminati. |

## Guardia generale aggiunta

Il backup production mostra un pattern più ampio: in molte righe `official_source_url` può puntare a un dominio diverso dal sito ufficiale della scheda. Per evitare altre contaminazioni pubbliche, il codice ora oscura lato pubblico i campi editoriali e prezzo derivati dalla fonte quando:

- la scheda ha un sito ufficiale;
- `official_source_url` è presente;
- il dominio della fonte editoriale è diverso dal dominio del sito della scheda.

Questa guardia non modifica il database e non tocca i dati base della scheda.

## SQL correttivo manuale proposto

Eseguire solo dopo backup production, verifica conteggi e conferma esplicita. Non usare in blocco se una colonna non esiste nello schema production.

```sql
begin;

with before_rows as (
  select
    id,
    nome,
    sito,
    descrizione,
    official_source_url,
    editorial_summary,
    editorial_highlights,
    editorial_faq_items,
    price_info,
    price_source_url,
    price_updated_at,
    enrichment_status,
    enrichment_notes,
    enrichment_updated_at
  from public.gyms
  where id in ('csv-165', 'csv-413', 'csv-542', 'csv-173', 'csv-364', 'csv-194', 'csv-606')
),
updated_rows as (
  update public.gyms
  set
    sito = case when id = 'csv-413' then '' else sito end,
    descrizione = '',
    official_source_url = '',
    editorial_summary = '',
    editorial_highlights = '[]'::jsonb,
    editorial_faq_items = '[]'::jsonb,
    price_info = '',
    price_source_url = '',
    price_updated_at = null,
    enrichment_status = 'pending',
    enrichment_notes = case
      when id = 'csv-165' then 'Dati CrossFit Varese oscurati dopo audit contaminazione pubblica 2026-05-19.'
      when id = 'csv-413' then 'Dati Good Life Academy oscurati dopo audit contaminazione pubblica 2026-05-19.'
      when id = 'csv-542' then 'Dati SMASH X3 oscurati dopo audit contaminazione pubblica 2026-05-19.'
      when id = 'csv-173' then 'Dati De Nittis Choy Lay Fut oscurati dopo audit contaminazione pubblica 2026-05-19.'
      when id = 'csv-364' then 'Dati MADDYFIT oscurati dopo audit contaminazione pubblica 2026-05-19.'
      when id = 'csv-194' then 'Dati Emotion Fitness oscurati dopo audit contaminazione pubblica 2026-05-19.'
      when id = 'csv-606' then 'Dati TC Lugano 1903 oscurati dopo audit contaminazione pubblica 2026-05-19.'
      else enrichment_notes
    end,
    enrichment_updated_at = now()
  where id in ('csv-165', 'csv-413', 'csv-542', 'csv-173', 'csv-364', 'csv-194', 'csv-606')
  returning *
)
insert into public.admin_audit_log (
  actor,
  action,
  table_name,
  record_id,
  before_data,
  after_data
)
select
  'manual-production-audit',
  'public_data_contamination_quarantine',
  'gyms',
  updated_rows.id,
  to_jsonb(before_rows),
  jsonb_build_object(
    'id', updated_rows.id,
    'nome', updated_rows.nome,
    'fields_cleared', jsonb_build_array(
      'descrizione',
      'official_source_url',
      'editorial_summary',
      'editorial_highlights',
      'editorial_faq_items',
      'price_info',
      'price_source_url'
    ),
    'reason', updated_rows.enrichment_notes
  )
from updated_rows
join before_rows on before_rows.id = updated_rows.id;

commit;
```

## Checklist production

1. Esportare `public.gyms` production con timestamp.
2. Verificare conteggio record prima dell'UPDATE.
3. Eseguire lo SQL in transaction.
4. Verificare 7 righe aggiornate e 7 righe inserite in `admin_audit_log`.
5. Aprire le 7 schede pubbliche corrette.
6. Controllare che non compaiano più CrossFit Varese, Good Life Academy, SMASH X3, De Nittis Choy Lay Fut, MADDYFIT, Emotion Fitness o TC Lugano 1903.
7. Controllare JSON-LD delle pagine.

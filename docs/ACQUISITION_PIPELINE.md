# Pipeline di acquisizione nuove palestre — design

Stato: **design, non implementato**. Nessun codice scritto. Vedi `docs/ROADMAP.md` punto 3 e `docs/OPERATIONS.md` per il contesto ambienti.

Vincolo fondamentale che attraversa tutto il documento: **la pipeline automatica (scraper, validazione, dedup) non scrive mai su `public.gyms`.** Scrive solo su una tabella nuova, `gym_candidates`. L'unico punto che scrive su `public.gyms` è l'azione "approva" in admin, manuale, con conferma esplicita e log su `admin_audit_log`.

## 1. Analisi copertura attuale (produzione, sola lettura, 10 luglio 2026)

537 palestre attive, 94 città distinte.

**Concentrazione**: le prime 8 città coprono 355/537 schede (66%):

| Città | Schede |
|---|---:|
| Lugano | 84 |
| Varese | 69 |
| Busto Arsizio | 47 |
| Gallarate | 44 |
| Saronno | 34 |
| Locarno | 29 |
| Bellinzona | 26 |
| Mendrisio | 23 |

**Coda lunga**: 48 città su 94 hanno una sola scheda. Molte sono comuni satellite delle 8 città sopra (es. Cassano Magnago, Cardano al Campo, Azzate per l'area Varese/Gallarate; Massagno, Paradiso, Pregassona, Savosa per l'area Lugano) — già coperti dalle pagine `/zone/` esistenti come "comuni vicini", quindi rinforzarli ha effetto diretto sulle landing già live.

**Discipline**: fortemente sbilanciate. Fitness domina (244), poi Yoga (99), Pilates (60), Personal Training (41), Boxe (31). Sotto le 10 schede: CrossFit (15), Kung Fu (13), EMS (12), MMA/BJJ (11 ciascuna), poi una lunghissima coda di discipline con 1-5 schede.

**Incrocio con le query del report GSC** (`docs/gsc-analysis-2026-07-09.md`, sezione P3):

| Città | Tot. | Pilates | Boxe | Yoga | Personal Training |
|---|---:|---:|---:|---:|---:|
| Varese | 69 | 9 | 4 | 13 | 7 |
| Lugano | 84 | 10 | 4 | 20 | 10 |
| Gallarate | 44 | 3 | 2 | 4 | 1 |
| Busto Arsizio | 47 | 11 | 2 | 6 | 1 |
| Saronno | 34 | 5 | 2 | 9 | 2 |
| Bellinzona | 26 | 1 | 0 | 7 | 2 |
| Mendrisio | 23 | 4 | 1 | 5 | 2 |
| Locarno | 29 | 3 | 2 | 8 | 2 |

Buchi più promettenti, incrociando query GSC con dati scarsi:

- **Boxe a Bellinzona: 0 schede.** Query `boxe varese` è già in classifica bassa per Varese (che ne ha 4) — Bellinzona parte da zero, priorità alta se ci sono davvero palestre di boxe non ancora censite.
- **Personal Training** quasi assente fuori da Varese/Lugano: Gallarate e Busto Arsizio hanno 1 scheda ciascuna nonostante siano città da 44-47 schede totali. `personal trainer varese` (pos 73 nel report) suggerisce che il tema converte male anche dove c'è copertura — ma prima serve materiale per testare la landing.
- **"Arti Marziali" come categoria pubblica non esiste**: la query `arti marziali varese` (pos 52, impression alte) non ha una pagina `/discipline/arti-marziali` funzionante — è nello slug esplicitamente disabilitato (`PUBLIC_DISABLED_DISCIPLINE_SLUGS` in `discipline-taxonomy.js`). Questo è un problema di tassonomia/landing (fuori scope di questa pipeline), non di catalogo: le singole discipline marziali (Karate 19, Judo 17, Kung Fu 13, MMA 11, BJJ 11...) esistono già in buon numero, semplicemente non sono raggruppate in una landing "arti marziali". Segnalo qui perché incide sulla stessa query GSC, ma la soluzione è lato tassonomia (fase 6 del roadmap), non acquisizione dati.
- **Comuni satellite delle zone esistenti**: espandere qui (Cassano Magnago, Cardano al Campo, Azzate, Massagno, Paradiso, Pregassona...) rinforza direttamente le pagine `/zone/` già indicizzate, con il rischio più basso (sono già dentro il raggio "comuni vicini" delle zone curate in `seo-locations.js`).

**Raccomandazione per il pilota di Fase 1**: una città satellite piccola e ben definita (es. Cassano Magnago o Azzate, area Varese, 3-4 schede attuali) — abbastanza piccola da verificare a mano ogni risultato, dentro un cluster già vivo. Confermiamo la scelta esatta all'avvio di Fase 1.

## 2. Fonti dati

### 2.1 OpenStreetMap via Overpass API — fonte primaria

- **Licenza**: ODbL (Open Database License) 1.0. Uso libero, incluso commerciale, **con obbligo di attribuzione** "© OpenStreetMap contributors" e obbligo di condividere allo stesso modo eventuali derivati sostanziali della *banca dati* (non del sito). Per una directory che pubblica singole schede arricchite editorialmente, la prassi comune è attribuzione visibile (footer o scheda) senza dover rilasciare l'intero dataset — da verificare con precisione prima della pubblicazione delle prime schede derivate da OSM, non solo del dry-run.
- **Campi tipicamente disponibili**: `name`, `addr:street`/`addr:housenumber`/`addr:city`/`addr:postcode`, `phone`/`contact:phone`, `website`/`contact:website`, `opening_hours` (formato OSM, da convertire nel formato interno), coordinate precise (nodo o centroide way), talvolta `email`, raramente una descrizione.
- **Tag rilevanti**: `leisure=fitness_centre`, `leisure=sports_centre` (+ `sport=*`), `sport=fitness`, `sport=yoga`, `sport=pilates`, `sport=boxing`, `sport=martial_arts`, `sport=climbing`, `club=sport`, `amenity=dojo` (non standard ma usato in alcune aree). La query Overpass va costruita come unione di questi tag su un'area (bounding box o `area["name"="..."]`).
- **Qualità attesa**: molto variabile per zona — buona nei centri urbani ben mappati (Lugano, Varese città), scarsa nei comuni piccoli. Nessuna garanzia di aggiornamento: palestre chiuse possono restare mappate, palestre nuove possono mancare. Nessun dato di prezzo. Telefono/sito presenti in una minoranza di nodi nella mia esperienza con dataset simili — da verificare con la query pilota.
- **Rate limiting**: le istanze pubbliche di Overpass (overpass-api.de e mirror) impongono policy di uso corrette informalmente: query non troppo frequenti, area non enorme in una singola richiesta, User-Agent identificativo obbligatorio. Fase 1 prevede cache locale delle risposte e un ritardo minimo tra richieste.

### 2.2 Elenchi pubblici (federazioni sportive, albi comunali) — fonte secondaria, da valutare caso per caso

Federazioni sportive (es. elenchi società affiliate pubblicati da federazioni nazionali/cantonali) e albi/registri comunali delle associazioni sportive locali sono spesso pubblicati come elenchi pubblici consultabili, ma:

- ogni fonte ha un proprio formato (HTML, PDF, a volte CSV) e serve uno scraper dedicato per fonte;
- i termini d'uso vanno controllati singolarmente (non tutte le federazioni autorizzano esplicitamente il riuso, anche se il dato è "pubblico" nel senso di consultabile);
- il dato è spesso più affidabile di OSM per esistenza/nome ufficiale, ma raramente include indirizzo geocodificato, orari o contatti diretti.

**Proposta**: questa fonte resta fuori dallo scope di Fase 1 (che copre solo `scrape-gyms-osm.mjs`). Da riconsiderare fonte per fonte una volta che la pipeline OSM è rodata, con una verifica ToS dedicata per ciascun elenco prima di scrivere uno scraper.

### 2.3 Esclusa esplicitamente

Google Maps / Google Places: i ToS di Google vietano lo scraping e l'uso dei dati al di fuori delle API ufficiali a pagamento con vincoli di visualizzazione. Non utilizzata.

## 3. Schema `gym_candidates`

Tabella nuova, separata da `public.gyms`. Applicata solo su staging in Fase 1 (per ora).

```sql
create table if not exists public.gym_candidates (
  id uuid primary key default gen_random_uuid(),

  -- dati scheda, stesse convenzioni di public.gyms dove applicabile
  nome text not null,
  indirizzo text,
  citta text,
  provincia text,
  regione text,
  telefono text,
  email text,
  sito text,
  discipline text,              -- stringa pipe-delimited, come gyms.discipline
  disciplines text[],           -- array normalizzato, come gyms.disciplines
  orari text,
  latitude double precision,
  longitude double precision,
  descrizione text,             -- solo se la fonte la fornisce

  -- provenienza
  source text not null,               -- 'osm', in futuro 'federazione_x' ecc.
  source_id text,                     -- id nodo/way OSM, o id record fonte
  source_url text,                    -- link alla fonte se disponibile
  scraped_at timestamptz not null default now(),

  -- validazione e dedup
  validation_flags jsonb not null default '[]'::jsonb,
  dedup_score numeric,                          -- 0-1, similarità al match più vicino
  dedup_match_gym_id text,                      -- public.gyms.id se probabile duplicato
  dedup_match_candidate_id uuid,                -- altro gym_candidates.id se duplicato nel batch

  -- workflow di revisione
  status text not null default 'pending',       -- pending | approved | rejected | merged
  reviewed_at timestamptz,
  reviewed_by text,
  rejection_reason text,
  published_gym_id text,                        -- public.gyms.id, valorizzato dopo approvazione

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (source, source_id)   -- idempotenza: ri-scraping dello stesso record aggiorna, non duplica
);

create index if not exists gym_candidates_status_idx on public.gym_candidates (status);
create index if not exists gym_candidates_citta_idx on public.gym_candidates (citta);
create index if not exists gym_candidates_dedup_score_idx on public.gym_candidates (dedup_score);
```

`validation_flags` usa lo stesso formato oggetto già visto in `data_quality_flags` su `public.gyms` (`{type, field, value, reason, severity}`), per coerenza con gli strumenti di audit esistenti.

## 4. Validazione e dedup

### 4.1 Filtro di categoria (in ingresso, a livello di query + post-filtro)

- Query Overpass già ristretta ai tag sport/fitness pertinenti (sezione 2.1).
- Post-filtro: escludere nodi con `access=private` o `access=no`. Nodi dentro un `tourism=hotel`/`tourism=resort` non vengono scartati automaticamente (alcune palestre di hotel sono aperte al pubblico) ma ricevono un flag `validation_flags: hotel_venue` per revisione manuale, non rifiuto automatico.

### 4.2 Blacklist termini sul nome

Riusa/estende i pattern già trovati nell'audit P4 (`docs/gsc-analysis-2026-07-09.md`, casi reali già capitati: Decathlon, Cisalfa, Migros, Old Wild West, Ritmo Shoes, Tigotà, centro estetico, corso di formazione datato):

- **Rifiuto automatico** (`status` resta `pending` ma `validation_flags` include `blacklist_hard`, mostrato in cima alla coda come "da scartare probabile"): `supermercat*`, `cisalfa`, `decathlon`, `tigot[aà]?`, `migros`, `old wild west`, `ritmo shoes`, `intersport`, `negozio`, `\bstore\b`, `\bshop\b`, nomi con una data esplicita nel titolo (pattern evento/corso, come il caso "corso addetto antincendio... 19 marzo 2026").
- **Flag per revisione, non rifiuto** (troppo ambiguo per un automatismo, lo abbiamo visto oggi con le 15 Activ Fitness/FitActive tenute su richiesta esplicita): `centro estetico`, `estetic*`, `parrucchier*`, `farmaci*`, `fisioterap*`, `lido`/`piscina comunale`, `comune di`, `agenzia (lavoro|interinale)`.

### 4.3 Dedup

Due livelli, entrambi calcolati allo scraping, salvati in `dedup_score` + `dedup_match_gym_id`/`dedup_match_candidate_id`:

1. **Contro `public.gyms` attive** (produzione, sola lettura durante lo scraping — mai scrittura): nome normalizzato (fold diacritici, minuscolo, punteggiatura rimossa) confrontato per similarità token, più distanza haversine tra coordinate, più corrispondenza città. Punteggio pesato indicativo: 50% similarità nome, 35% vicinanza coordinate (soglia forte sotto i 100-150m), 15% corrispondenza città.
2. **Contro altri candidati nello stesso batch/tabella**: stesso algoritmo, per evitare che fonti diverse inseriscano due candidati per la stessa palestra reale (il vincolo `unique(source, source_id)` copre solo il caso di re-scraping della stessa fonte).

Sopra una soglia (proposta: 0.85) il candidato resta comunque in `pending` — non si scarta mai in automatico un match dubbio — ma viene marcato ed esposto in cima alla coda con il confronto side-by-side nella UI di Fase 2, per abilitare l'azione "unisci" invece di "approva" come nuova scheda.

## 5. Flusso end-to-end

```
Overpass API (area configurabile)
        │
        ▼
scrape-gyms-osm.mjs
  - normalizza (riusa src/lib/gym-normalizer.js dove applicabile)
  - applica blacklist + flag di validazione
  - calcola dedup_score contro public.gyms (lettura) e contro gym_candidates esistenti
        │
        ▼
public.gym_candidates (status=pending)   ← unica tabella scritta dall'automazione
        │
        ▼
admin/candidati (Fase 2)
  - lista pending, filtri per città/fonte/dedup_score
  - vista dettaglio, confronto side-by-side se dedup_score alto
  - azioni: approva / scarta (con motivo) / unisci
        │
        ▼ (SOLO qui, manuale, con conferma esplicita)
public.gyms (nuova riga o campi arricchiti su riga esistente)
  + log su admin_audit_log
  + gym_candidates.status aggiornato a 'approved'/'rejected'/'merged', published_gym_id valorizzato
```

## 6. Cosa resta per la Fase 1 (dopo approvazione di questo documento)

- Migrazione `supabase/migrations/YYYYMMDD_NNN_gym_candidates.sql` — **applicata solo su staging**, come da `docs/OPERATIONS.md`.
- `scripts/scrape-gyms-osm.mjs`: area configurabile via argomento, cache locale delle risposte Overpass, rate limiting, idempotenza tramite `unique(source, source_id)`.
- Test pilota su una città piccola (proposta: Cassano Magnago o Azzate, da confermare) con report: quanti nodi trovati da Overpass, quanti scartati e per quale motivo (blacklist, dedup, categoria), quanti candidati netti inseriti.

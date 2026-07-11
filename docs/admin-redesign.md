# Redesign area admin — proposta (Fase 2) e stato implementazione (Fase 3)

Nessun codice in questo documento. Principio guida: **semplificazione**. L'admin serve un solo operatore; è cresciuto una pagina alla volta e ha accumulato più superfici di quante ne servano per fare lo stesso lavoro.

## Stato Fase 3 (aggiornato dopo l'implementazione)

| Area | Stato | Commit | Note |
|---|---|---|---|
| 1. Layout + nav | ✅ Fatto | `680a350` | 9 pill → 5 voci con stato attivo per prefisso route |
| 2. Dashboard | ✅ Fatto | `c2744d6` | 4 numeri per area + lista "cosa guardare oggi" (candidati recenti, richieste più vecchie, duplicati) |
| 3. Catalogo | ✅ Fatto | `bed4282` | Editor unico in `/admin/gyms/[id]` (assorbe verified/premium, valida come `schede`); creazione a modale `?new=1`; paginazione con conteggio totale |
| 4. Qualità | ✅ Fatto | `aa6b4c3` + successivo | Riclassifica e Descrizioni sotto `/admin/qualita/*`. Contenuti: `/admin/prezzi` (1306 righe, solo la descrizione editoriale aveva un percorso di scrittura reale) sostituito da `/admin/qualita/contenuti` — lista snella di schede candidate — più un nuovo pannello "Contenuti dal sito ufficiale" in `/admin/gyms/[id]` con accept/reject per campo su prezzo, orari, telefono (scope deciso con l'utente: discipline/indirizzo/sito hanno già un campo diretto nello stesso editor). Il tab "Residui" (conflitti prezzo post-merge, nessun report locale committato) è stato eliminato dalla UI, non spostato — resta generabile via `bun run prices:review:queue` |
| 5. Acquisizione (import CSV) | ✅ Fatto, con una modifica | `75e7ce5` | Spostato su `/admin/candidati/importa-csv`. **Non è un'adozione totale della coda candidati come descritto sotto**: le righe CSV che corrispondono a una scheda già pubblicata continuano ad aggiornarla direttamente (la coda candidati oggi sa solo creare schede nuove, non aggiornarle); solo le righe senza corrispondenza vanno in `gym_candidates` come `source='csv_import'` |
| 6. Sistema | ✅ Fatto | `680a350` | Pagina landing `/admin/sistema` con pannello di stato ambiente (gymStore/candidatesStore) e link a Log operazioni ed Export CSV; nav già segna "Sistema" attivo su `/admin/sistema`, `/admin/audit`, `/admin/export`. Implementata insieme all'area 1 ma non ancora segnata qui |

Il resto di questo documento è la proposta originale (Fase 2), lasciata intatta come riferimento del design — la deviazione sopra (import CSV) è emersa leggendo il codice reale durante l'implementazione, non era prevista in fase di proposta.

## Inventario reale (letto il codice di ogni pagina, non solo i nomi)

| Pagina | Cosa fa davvero | In nav? |
|---|---|---|
| `/admin` | Dashboard: tabella di tutte le palestre attive + due contatori (qualità, richieste) | sì |
| `/admin/schede` | Elenco palestre, ricerca, paginazione 50/pagina, **modale di modifica inline** (`?edit=ID`), archivia/ripristina/duplica | sì |
| `/admin/schede/nuova` | Form di creazione nuova scheda (riusa l'azione `create` di schede) | sì |
| `/admin/gyms/[id]` | **Seconda pagina completa di modifica scheda** — stessi campi base di schede (nome, indirizzo, città, telefono, orari, sito, immagine) più un pannello che schede non ha (descrizione editoriale/generata/pubblica, quality score) | no (linkata da dashboard, qualità, prezzi, descrizioni-preview) |
| `/admin/richieste` | Coda claim/rivendicazione schede: approva/rifiuta/in revisione | sì |
| `/admin/qualita` | Flag di qualità dati (calcolati live), duplicati con merge, verifica scheda, normalizzazione discipline puntuale | sì |
| `/admin/prezzi` ("Contenuti" in nav) | Legge report JSON pre-generati da script CLI (prezzi, contenuti da sito ufficiale), mostra candidati di riconciliazione, applica alla scheda | sì |
| `/admin/candidati` | Coda di revisione scraper OSM → approva (pubblica su `gyms`) / rifiuta / unisci a scheda esistente | sì |
| `/admin/audit` | Log di sola lettura delle azioni admin | sì |
| `/admin/import` | Import CSV massivo — **scrive direttamente su `public.gyms`**, nessun controllo duplicati, nessuna coda di revisione | no |
| `/admin/riclassifica` | Riclassificazione discipline in blocco su tutto il catalogo (selezione manuale multipla) | no |
| `/admin/descrizioni-preview` | Revisione di un report CLI di riscrittura descrizioni (`descriptions-repair-preview-*.json`) | no |
| `/admin/export/gyms.csv` | Endpoint di export CSV, non una pagina | sì (pill) |

## Problemi confermati

1. **Nav a 9 pill senza stato attivo**, 3+ righe su mobile, "Dashboard admin" evidenziata sempre anche quando non sei sulla dashboard.
2. **Due superfici di modifica scheda** (`/admin/schede` modale + `/admin/gyms/[id]` pagina) con campi parzialmente diversi — non è ovvio quale usare, e allineare le due in futuro raddoppia il lavoro.
3. **`/admin/import` bypassa completamente la sicurezza della pipeline di acquisizione**: scrive su `gyms` senza dedup, senza validazione, senza coda di revisione — l'esatto pattern rischioso che la pipeline OSM è stata costruita per evitare.
4. **4 pagine fanno "trova problema → proponi fix → applica"** con meccaniche diverse ma stesso scopo (qualità, riclassifica, descrizioni-preview, prezzi/contenuti) — nessuna gerarchia tra loro, tutte a pari livello in nav.
5. **Dashboard mostra una tabella di tutte le palestre** che è già `/admin/schede` — ridondante, e non dà i numeri operativi che servirebbero (candidati in coda, richieste aperte).

## IA proposta — 4 aree

```
Dashboard → Catalogo → Acquisizione → Richieste → Sistema
```

### Catalogo (`/admin/schede`)
- Elenco, ricerca server-side, paginazione con conteggio totale visibile ("1–50 di 692"), non solo Precedenti/Successivi
- Creazione: **elimina** `/admin/schede/nuova` come pagina separata, diventa un modale `?new=1` — stesso pattern già usato per `?edit=ID`, un solo meccanismo invece di due
- Modifica: **elimina la duplicazione** — un solo posto per modificare una scheda. Il modale di schede sparisce; ogni "Modifica" porta a `/admin/gyms/[id]`, che assorbe anche i controlli verificata/premium che oggi esistono solo nel modale
- Sottosezione **Qualità** (`/admin/qualita`): flag di qualità, duplicati/merge, verifica — resta concettualmente distinta ma nella stessa area, non un pill separato in nav principale
  - `/admin/qualita/riclassifica` (era `/admin/riclassifica`): riclassificazione in blocco, ora raggiungibile da dentro Qualità invece di essere orfana
  - `/admin/qualita/descrizioni` (era `/admin/descrizioni-preview`): revisione report descrizioni, stessa logica
  - `/admin/qualita/contenuti` (era `/admin/prezzi`): **non più una pagina di applicazione** — diventa una lista "N schede con contenuti proposti dal sito ufficiale", cliccare porta a `/admin/gyms/[id]` dove il pannello di riconciliazione (accetta/scarta il singolo campo proposto) vive accanto al resto della scheda invece che in una pagina a parte da 725 righe

### Acquisizione (`/admin/candidati`)
- Resta la coda di revisione OSM così com'è (approva/rifiuta/unisci)
- **`/admin/import` confluisce qui** come seconda fonte: `/admin/candidati/importa-csv` fa parsing del CSV e scrive righe in `gym_candidates` (source='csv_import') invece che direttamente in `gyms`. Stessa coda di revisione, stesso dedup, stesso audit log per qualsiasi fonte — non solo un riordino di nav, è la cosa più importante di questa proposta lato sicurezza dati: elimina l'unico punto rimasto che scrive schede senza passare da validazione/dedup/approvazione esplicita

### Richieste (`/admin/richieste`)
- Invariata: è già un'area a sé, non ha bisogno di accorpamenti

### Sistema (nuova pagina landing `/admin/sistema`)
- Link a `/admin/audit` (log) ed export CSV
- Un pannello di stato ambiente (Supabase configurato/staging vs produzione, scrittura abilitata) che oggi è ripetuto in modo incoerente in fondo a più pagine diverse — consolidato in un posto solo

## Cosa viene ELIMINATO

- `/admin/schede/nuova` come pagina separata (diventa modale)
- Il modale di modifica dentro `/admin/schede` (resta solo `/admin/gyms/[id]`)
- `/admin/import` come scrittura diretta su `gyms` (la funzionalità di import CSV resta, ma ripiantata su `gym_candidates`)
- `/admin/prezzi` come pagina batch da 725 righe con azioni di apply (resta solo una lista di collegamento; l'apply vive nella scheda)
- 5 pill di navigazione (nuova, prezzi/contenuti, riclassifica, descrizioni-preview, import spariscono dalla nav principale; audit si sposta sotto Sistema)

## Cosa viene ACCORPATO (senza eliminare la funzione)

- qualità + riclassifica + descrizioni + contenuti → un'unica area "Qualità" dentro Catalogo, con sotto-navigazione a tab invece di 4 pill di pari livello
- import CSV → una fonte della coda candidati, non un percorso di scrittura separato

## Dashboard ridisegnata

Quattro numeri, uno per area, ciascuno cliccabile:

| Numero | Link |
|---|---|
| Schede attive (692) | → Catalogo |
| Candidati da revisionare | → Acquisizione |
| Richieste aperte | → Richieste |
| Schede con problemi di qualità | → Qualità (dentro Catalogo) |

Sotto, non una tabella di tutte le palestre (è già `/admin/schede`), ma una lista corta "da guardare oggi": ultimi 5 candidati arrivati, richieste più vecchie ancora aperte, i 3 gruppi di duplicati con più schede. Niente altro.

## Nav ridisegnata

- Logo/Home pubblica (invariato)
- **Dashboard** · **Catalogo** · **Acquisizione** · **Richieste** · **Sistema** — 5 voci invece di 9, ciascuna con stato attivo basato sul prefisso della route corrente (`$page.url.pathname.startsWith('/admin/schede')` ecc. evidenzia "Catalogo" anche dentro `/admin/gyms/[id]` o `/admin/qualita`)
- Esci
- Su mobile: 6 elementi (5 + Esci) stanno su 1–2 righe con lo stesso stile a pill già in uso (`sc-ui-pill`), senza bisogno di hamburger

## Routing — nessun 404

| Vecchia route | Nuova destinazione |
|---|---|
| `/admin/schede/nuova` | redirect → `/admin/schede?new=1` |
| `/admin/riclassifica` | redirect → `/admin/qualita/riclassifica` |
| `/admin/descrizioni-preview` | redirect → `/admin/qualita/descrizioni` |
| `/admin/prezzi` | redirect → `/admin/qualita/contenuti` |
| `/admin/import` | redirect → `/admin/candidati/importa-csv` |

`/admin/gyms/[id]`, `/admin/qualita`, `/admin/candidati`, `/admin/richieste`, `/admin/audit`, `/admin/export/gyms.csv` restano agli URL attuali — nessun redirect necessario, si spostano solo in nav.

## Cosa NON cambia

- Pattern visivi esistenti (`sc-panel`, `sc-ui-pill`, form/azioni SvelteKit) — nessuna libreria UI nuova
- Auth dietro ogni route, comprese quelle nuove/spostate
- Nessuna delle azioni di scrittura (merge, archivia, approva, ecc.) cambia comportamento — solo dove vivono nell'interfaccia

## Non incluso in questa proposta (fuori scope, da valutare a parte)

- La ripiantatura di `/admin/import` su `gym_candidates` è il pezzo di lavoro più grande e rischioso della Fase 3 (serve mappare colonne CSV → schema candidati, adattare la validazione dei campi obbligatori). Se preferisci, posso implementarla come ultimo passo separato invece che insieme al resto di Acquisizione, così il resto del redesign non aspetta questo pezzo.
- Non ho toccato le colonne/azioni interne di qualità/riclassifica/descrizioni/contenuti — solo dove vivono. Se vuoi che ne semplifichi anche la logica interna, è un giro successivo.

## Ordine di implementazione proposto (Fase 3, dopo tua approvazione)

1. ✅ Layout + nav (5 voci, stato attivo, mobile)
2. ✅ Dashboard (4 numeri + lista corta)
3. ✅ Catalogo: elimina duplicazione modifica scheda, sposta creazione a modale, aggiungi paginazione con conteggio
4. ✅ Qualità: raggruppa riclassifica/descrizioni/contenuti sotto `/admin/qualita/*` con redirect dai vecchi URL
5. ✅ Acquisizione: sposta import CSV nella coda candidati (ultimo, più rischioso) — con la modifica descritta sopra (righe corrispondenti a schede esistenti aggiornano direttamente)
6. ✅ Sistema: nuova pagina landing, sposta audit/export in nav

`bun run check` dopo ogni area, commit separati, redirect invece di 404 per ogni route eliminata.

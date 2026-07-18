# Recovery indicizzazione — Report finale (Fase 1 + Fase 2)

Data audit: 2026-07-18 · Data implementazione/deploy: 2026-07-18 · **Stato: completato e live in produzione**

Fonte GSC: export "Coverage" + 3 "Coverage Drilldown" (Not found 404, Page with redirect, Duplicate/canonical) scaricati da Search Console lo stesso giorno, salvati sul Desktop. Non esisteva un file `analisi_404_redirect.xlsx` pre-annotato — questo report e i CSV allegati sono quell'annotazione, costruita direttamente dai raw export GSC incrociati con un export read-only della tabella `gyms` di produzione (692 righe, `data/supabase-gyms-export-404audit-2026-07-18.json`, via lo script esistente `scripts/export-supabase-gyms.mjs`, sola lettura).

Le sezioni 1-9 sono l'audit originale (sola lettura, nessuna modifica). La sezione 10 documenta cosa è stato effettivamente implementato in Fase 2, con le decisioni prese sui punti aperti in §8. La sezione 11 copre deploy e monitoraggio.

---

## 1. Il meccanismo di redirect esistente (perché copre 439 e non gli altri 424)

Non esiste una tabella di mappatura vecchio→nuovo slug generata in batch. Il redirect è calcolato **live, ad ogni richiesta**, in `src/routes/palestre/[slug]/+page.server.js`, con questa catena (in ordine):

1. Match esatto sullo slug canonico odierno (`_canonical_slug`, calcolato da `withCanonicalGymSlugs()` in `src/lib/gym-canonical-slug.js`).
2. Match esatto sullo "slug legacy" = `nome-slug + id-corrente-del-record` (`_legacy_slug`).
3. Fallback diretto su Supabase per `id=eq.<id-estratto-dallo-slug>`, con lo stesso controllo di corrispondenza nome+id.
4. `findOrphanedLegacySlugMatch()`: se lo slug pulito (nome senza suffisso `-csv-NNN`) corrisponde **a un'unica** palestra attiva, redirect lì. Se corrisponde a 0 o 2+ palestre, niente redirect → 404.
5. Una singola voce hardcoded in `LEGACY_SLUG_REDIRECTS` (un solo caso: `urban-fitness-varese-csv-633`).

**Causa radice del gap, confermata sui dati:**

- **Gli id `csv-NNN` non sono stabili nel tempo.** Sono stati riassegnati a palestre diverse tra una reimportazione CSV e l'altra. Esempio verificato: l'URL indicizzato `societa-federale-di-ginnastica-chiasso-csv-544` implica che l'id `csv-544` fosse una volta "Società Federale di Ginnastica Chiasso"; oggi quello stesso id in produzione è "Soledad Surace - Insegnante di KUNDALINI YOGA", un'attività completamente diversa. Lo stesso vale per `csv-559`, `csv-301`, `csv-489`. Questo rompe silenziosamente sia il match per id (passo 2/3) sia qualunque logica futura che si fidi ciecamente dell'id.
- **Corruzione di caratteri (mojibake) nel campo `name`** cambia lo slug calcolato pur restando lo stesso id stabile. Esempi confermati per confronto diretto id→nome: `csv-104` = "Centro **0lite** Fitness Varese" (invece di "Elite"), `csv-40` = "Ali**Z**Studio..." con accenti mancanti. Il match per nome (passi 2/4) fallisce anche se la palestra è la stessa.
- **Cambio di formato slug per le catene multi-sede.** Molti URL 404 non-csv sono nel vecchio formato pieno `nome-città-via` (es. `sevenblocks-mendrisio-via-moree-16`), mentre l'algoritmo attuale produce lo slug corto `nome-città` (es. `sevenblocks-mendrisio`) quando la città basta a disambiguare. Nessun passo del resolver live intercetta questa relazione di prefisso. **Questa è la causa singola più frequente**: la logica di prefix-match che ho aggiunto per l'audit (spiegata sotto) da sola risolve 275 dei 509 URL 404.

In sintesi: i 439 "Page with redirect" funzionano perché per quei record id e nome sono rimasti stabili dal momento in cui Google li ha indicizzati. I 424 csv-404 sono quelli per cui almeno uno dei due (id o nome) è cambiato nel frattempo, oppure lo slug è nel vecchio formato pieno.

---

## 2. Metodologia di classificazione usata per l'audit

Per ogni URL ho applicato, in ordine:

1. Match esatto slug canonico odierno → nessuna azione (pagina già corretta oggi).
2. Match esatto slug legacy (nome+id corrente) → **301** (alta confidenza).
3. **[Nuovo]** Match di prefisso: lo slug (o lo slug senza suffisso `-csv-NNN`) inizia, con un confine di trattino, con uno slug canonico attivo → **301** verso quello slug (se un solo candidato) o **ambiguo** (se più candidati hanno prefisso della stessa lunghezza massima).
4. Match legacy "orfano" per nome base (esattamente 1 palestra attiva condivide il nome) → **301**.
5. L'id estratto dallo slug corrisponde a una riga **soft-deleted** (`deleted_at` valorizzato) → **410**.
6. Più palestre attive condividono lo stesso nome base senza altro segnale di disambiguazione → **ambiguo**, elenco dei candidati.
7. Fallback: confronto a token del nome (Jaccard) contro il catalogo attivo e quello archiviato.
   - punteggio ≥ 0.65 → 301/410 ad alta confidenza
   - punteggio 0.5–0.65 → **review**, bassa confidenza, proposto ma da verificare a mano
   - punteggio < 0.5 su entrambi → 410, nessun match plausibile

Ho replicato **esattamente** l'ordinamento che la produzione usa per disambiguare nomi duplicati (`updated_at desc nulls last, nome asc nulls last, id asc`, lo stesso di `readFullActiveCatalog()` e `sitemap.xml/+server.js`) — un primo tentativo con l'ordine naturale dell'export dava risultati diversi su alcuni casi con nomi duplicati (es. "Boxe Club Locarno", 2 sedi reali), corretto e rivalidato dal vivo.

**Validazione dal vivo**: ho verificato un campione di 15+ URL contro `www.palestreinzona.it` in produzione (status code, redirect target, canonical tag). Tutti i 301/404/canonical previsti per i casi ad alta confidenza corrispondono esattamente al comportamento live attuale.

---

## 3. Risultati — 509 URL "Not found (404)"

| Sottogruppo | Totale | 301 proposto | 410 proposto | Ambiguo | Review (bassa conf.) | Altro |
|---|---|---|---|---|---|---|
| `-csv-NNN` (434) | 434 | 283 | 133 | 13 | 5 | — |
| Senza suffisso (69) | 69 | 7 | 61 | — | — | 1 già canonico oggi |
| Percorsi non-`/palestre/` (6) | 6 | — | — | — | — | vedi §5 |

CSV completo con dettaglio riga per riga: **`data/seo-404-audit-2026-07-18/404.csv`** (colonne: url, path, slug, type, confidence, matchedVia, target, gymId, gymName, fuzzyScore, nonGymFlag).

### 3.1 — 13 casi ambigui (richiedono decisione manuale, MAI redirect a caso)

Catene multi-sede dove il vecchio URL (senza città) corrisponde a 2+ sedi attive oggi. Non c'è modo sicuro di scegliere automaticamente:

| Slug 404 | Candidati attivi |
|---|---|
| `yoga-vidya-swiss-locarno-csv-673`, `-674` | Muralto, Losone |
| `gimnasium-csv-251`, `-252` | Arbedo-Castione, Locarno, Bellinzona, Bellinzona viale Stazione 28a |
| `sevenblocks-csv-529`, `-530` | Chiasso, Mendrisio |
| `kickboxing-andrea-csv-318`, `-319` | Pazzallo, Varese |
| `gymnic-palestre-csv-265`, `-266` | Vedano Olona, Induno Olona |
| `master-boxe-csv-368` | Busto Arsizio, "21052" (slug sospetto, verificare dato sorgente) |
| `kma-krav-maga-academy-...-csv-323` | Busto Arsizio, Varese, Gallarate, Busto Arsizio via Pastrengo |
| `shaolin-nanyuan-kungfu-switzerland-csv-533` | Locarno, Porza, Chiasso |

**Proposta**: per Fase 2, questi restano 404→410 di default (nessun redirect indovinato), a meno che tu non voglia indicarmi quale sede era originariamente collegata a ciascun vecchio id (possibile solo con dati esterni, es. backup CSV originale con id→indirizzo).

### 3.2 — 5 casi "review" (bassa confidenza, verificare a mano)

| Slug 404 | Punteggio | Target proposto | Nota |
|---|---|---|---|
| `societa-federale-di-ginnastica-chiasso-csv-544` | 0.60 | `societ-federale-di-ginnastica-chiasso` | id riassegnato (oggi è Soledad Surace) — il target proposto è per nome, verosimile |
| `centro-elite-fitness-varese-csv-104` | 0.60 | `centro-0lite-fitness-varese` | **confermato**: stesso id (`csv-104`), solo mojibake nel nome ("0lite" invece di "Elite") — alza pure a 301 con fiducia |
| `alizestudio-di-vera-viligiardi-fitness-with-vera-csv-40` | 0.67 | `alizstudio-di-vera-viligiardi-fitness-with-vera` | **confermato**: stesso id (`csv-40`), solo accenti mancanti — alza pure a 301 con fiducia |
| `spazio-esychia-anna-arturi-csv-554` | 0.60 | `spazio-esycha-anna-arturi` | non verificato a fondo, controllare a mano |
| `sport-cafe-locarno-csv-559` | 0.50 | `nuoto-sport-locarno` | **il target proposto è probabilmente sbagliato** — l'id oggi è "SportAcademy" (tutt'altra attività) e nell'elenco non-csv esiste una riga archiviata "Sport Caf Locarno" (stesso mojibake, "café"→"caf") con punteggio identico: **raccomando 410**, non redirect a `nuoto-sport-locarno` |
| `momo-boxing-club-csv-381` | 0.50 | (nessuno, prefix match) | verificare a mano |

Ho verificato **2 di questi 5** contro l'id reale in produzione: `csv-104` e `csv-40` sono confermati (stesso record, solo corruzione testo) — questi due si possono promuovere a 301 con sicurezza. `csv-559` ho verificato essere fuorviante — raccomando 410. Gli altri 3 non li ho verificati singolarmente per id.

### 3.3 — 3 casi senza alcun match plausibile

| Slug | Nota |
|---|---|
| `tigota-csv-618` | "Tigotà" è una catena di drogherie/cura persona — non è mai stata una palestra. **410**, coerente con lo scope escluso dal progetto. |
| `crossfit-motus-rostock-csv-159` | Nessun match ≥0.5. Miglior ipotesi debole: "CrossFit Bellinzona" (0.25) — troppo debole per proporre un redirect. **410**. |
| `crossfit-sturmflut-csv-161` | Stesso caso di sopra (0.33). **410**. |

### 3.4 — Flag "probabile attività non-palestra" tra i 410 proposti

Ho applicato un elenco di parole chiave (supermercato, estetica, agenzia, farmacia, ecc.) ai nomi delle palestre soft-deleted collegate. **37 URL** (25 nel gruppo csv, 12 nel gruppo non-csv) risultano flaggati come probabili attività fuori scope, es.: Supermercato Migros, Randstad, NAIL AND MORE, Tigotà, Decathlon, Lido di Bissone/Agno, Ecocentro di Chiasso, Comune di Luino, F.C. Lugano biglietteria, Lions Club Luino. Colonna `nonGymFlag` nel CSV. Il brief stimava ~20 già flaggate — il numero più alto qui riflette solo un elenco di parole chiave più ampio del mio, da confermare/correggere a vista.

---

## 4. Risultati — 439 URL "Page with redirect"

| Esito | Conteggio |
|---|---|
| 301 funzionante oggi (confermato dal vivo su campione) | 397 |
| 410 (il target legacy oggi è una riga archiviata) | 37 |
| Percorsi non-`/palestre/` | 5 |

Nessuna azione di codice necessaria qui — **conferma la premessa originale del brief**. I 37 che oggi risolverebbero a 410 non sono un bug: sono record che *erano* attivi (e quindi il redirect 301 era corretto) e che nel frattempo sono stati archiviati — comportamento atteso (`if (!isPublicActiveGym(legacyGym)) throw error(410, ...)` in `+page.server.js`).

I 5 percorsi non-`/palestre/`: 3 sono `http://` / apex-domain (`palestreinzona.it` senza `www`) che ridirigono correttamente alla home — solo igiene GSC; 2 sono alias di discipline (`/discipline/kickboxe`→`kickboxing`, `/discipline/ems`→`ems-training`), verificati dal vivo, **già funzionanti**.

---

## 5. Le 5 pagine `/discipline/*` + `/mercoledi`

| Slug | Causa |
|---|---|
| `vaculab` | **Escluso di proposito dalla tassonomia** (`EXCLUDED_DISCIPLINE_ALIASES` in `src/lib/discipline-taxonomy.js`, insieme a `vacu`, `vacufit`, ecc.) — qualunque palestra taggata "vaculab" perde quel tag alla normalizzazione. Zero contenuto è comportamento voluto, non un bug. |
| `kettlebell`, `tabata`, `ginnastica-posturale`, `pancafit` | Non compaiono più né come disciplina canonica né come alias in nessun punto della tassonomia attuale — sono stati rimossi/consolidati in una revisione passata della tassonomia (non c'è traccia di quando/perché nella history del file). Zero palestre attive porta zero risultati sulla pagina, quindi 404 di fatto. |
| `/mercoledi` | Non è mai stata una route dell'app — "mercoledì" compare solo dentro testi di orari/contenuti (batch di enrichment, `text-format.js`), mai come path. Quasi certamente un URL indicizzato per errore (link malformato generato da un frammento di testo). Nessuna pagina da ripristinare. |

**Proposta per Fase 2** (da confermare): `vaculab` e `/mercoledi` → 410 (nessun target sensato). Per `kettlebell`/`tabata`/`ginnastica-posturale`/`pancafit`, due opzioni: 410 (onesto, riflette che oggi non c'è contenuto), oppure 301 verso la categoria semanticamente più vicina già esistente (es. `tabata`→`hiit` o `functional-training`; `kettlebell`→`functional-training`; `ginnastica-posturale`/`pancafit`→`pilates`) **solo se** vuoi investire nel ripristinare quel traffico — dipende da quanto valore avevano quelle pagine prima del calo.

---

## 6. Risultati — 101 URL "Duplicate, Google chose different canonical"

| Esito | Conteggio |
|---|---|
| 301 funzionante oggi | 86 |
| 410 (target archiviato) | 14 |
| Già canonico oggi (self-referential, verificato dal vivo) | 1 |

Campione di 6 verificato dal vivo (redirect status + canonical tag):
- 3 URL csv-suffixed → confermato 301 corretto verso lo slug pulito.
- 2 URL → confermato 404 (target archiviato, coerente con la classificazione 410).
- 1 URL (`boxe-club-locarno-via-della-pace-1b`) → **è già la pagina canonica corretta**, non un duplicato: esistono davvero 2 sedi distinte "Boxe Club Locarno" (Via della Pace 1b e via alla Morettina 9A), l'algoritmo di disambiguazione le distingue correttamente e ciascuna ha canonical self-referential. GSC lo segnala solo perché la scansione è precedente al fix.

**Nessuna azione di codice necessaria.** Come nel caso dei redirect, è dato GSC non ancora rivalidato — coerente con quanto previsto nel brief per la Fase 3 (Validate Fix + resubmit sitemap).

---

## 7. Audit sitemap

- **Nessun URL `-csv-` in sitemap** (verificato con lo script esistente `bun run seo:check:sitemap -- --url=https://www.palestreinzona.it/sitemap.xml` → OK).
- 744 URL totali in sitemap. Verificati tutti dal vivo (status code):
  - **737 → 200**
  - **7 → 404** (nuovo problema, non presente nell'export GSC di oggi — troppo recente per essere già stato scansionato/segnalato, ma andrà segnalato lo stesso se non corretto prima del prossimo crawl):
    - `/discipline/ginnastica-posturale/saronno`
    - `/discipline/ginnastica-posturale/lugano`
    - `/discipline/functional-training/lugano`
    - `/discipline/functional-training/saronno`
    - `/discipline/personal-training/lavertezzo`
    - `/discipline/tabata/saronno`
    - `/discipline/tennis/lugano`

Causa probabile: `buildSeoDisciplineCityEntries()` (`src/lib/seo-directory.js`) genera combinazioni disciplina+città che poi, a runtime, la route `/discipline/[slug]/[citySlug]` non trova (0 palestre corrispondenti oggi) → 404. Stessa famiglia di problema delle pagine disciplina orfane al punto 5, ma sul lato "generazione sitemap" invece che "URL storico indicizzato". Consiglio di includerlo nella Fase 2 (o come follow-up separato) per evitare che diventi un nuovo lotto di 404 nei prossimi report GSC.

---

## 8. Decisioni prese (era "cosa serve da te prima della Fase 2")

1. **13 catene ambigue** (§3.1): ✅ **410 per tutte** — decisione esplicita tua, applicata come regola di codice generale (qualunque slug che risulta ambiguo tra 2+ palestre attive serve 410, non solo questi 13 casi specifici).
2. **5 casi review** (§3.2): `centro-elite-fitness-varese-csv-104` e `alizestudio-...-csv-40` promossi a **301** (confermati via id). `sport-cafe-locarno-csv-559` → **410** (corretto, il target proposto era sbagliato). `societa-federale-di-ginnastica-chiasso-csv-544`, `spazio-esychia-anna-arturi-csv-554`, `momo-boxing-club-csv-381` → **410** per prudenza (non confermati singolarmente, default sicuro applicato senza ulteriore conferma esplicita — segnalato nel riepilogo di fine sessione).
3. **5 pagine disciplina + `/mercoledi`** (§5): **410 secco** per tutte, nessun ripristino/redirect a categoria vicina (default applicato).
4. **37 flag "probabile non-palestra"** (§3.4): confermato **410**, coerente con lo scope escluso del progetto — nessuna azione separata necessaria, già gestiti dalla regola generale di match sui record archiviati.
5. **7 URL sitemap rotti** (§7): inclusi nella Fase 2 (Commit 3).

## 9. File prodotti (solo lettura, non committati)

- `data/seo-404-audit-2026-07-18/404.csv` — 509 righe classificate
- `data/seo-404-audit-2026-07-18/redirect.csv` — 439 righe classificate
- `data/seo-404-audit-2026-07-18/duplicate.csv` — 101 righe classificate
- `data/seo-404-audit-2026-07-18/REPORT.md` — questo report
- `data/supabase-gyms-export-404audit-2026-07-18.json` — export read-only di produzione (692 righe) usato come base, via `scripts/export-supabase-gyms.mjs` (nessuna scrittura)

---

## 10. Fase 2 — Implementazione (completata 2026-07-18)

Tre commit su `main`, un tema per commit come richiesto:

**Commit 1 — `e5b7286`, redirect layer** (`src/lib/gym-canonical-slug.js`, `src/routes/palestre/[slug]/+page.server.js`, nuovo `src/lib/legacy-gym-redirects.js`):
- Aggiunta una regola deterministica di **prefix-match** (uno slug storico nel vecchio formato pieno `nome-città-via` viene riconosciuto come corrispondente allo slug canonico corto `nome-città` di oggi) — da sola copre 275 dei 509 URL 404.
- Rilevamento esplicito di **ambiguità**: quando 2+ palestre attive condividono lo stesso nome/prefisso, il resolver ora risponde 410 invece di lasciar cadere silenziosamente su un 404 generico.
- Rilevamento esplicito di **410 vs 404**: se l'id o il nome-base dello slug richiesto combacia con un record archiviato (`deleted_at` valorizzato), risposta 410 invece di 404 — prima questa distinzione non esisteva nel codice.
- Tabella curata di **15 eccezioni** (`legacy-gym-redirects.js`) per i casi che la logica deterministica non può risolvere da sola (i mojibake confermati, i "review" non confermati, i "no match", più `gisevuoi-csv-244` trovato durante l'implementazione — vedi nota dati sotto).
- **Verificato** simulando il resolver vero e proprio (stesse funzioni importate direttamente) contro tutti i 1.049 URL dell'audit: **zero 404 residui non risolti**.

**Commit 2 — `262a3fa`, pagine disciplina + `/mercoledi`** (`src/routes/discipline/[slug]/+page.server.js`, nuovo `src/routes/mercoledi/+server.js`): le 5 pagine disciplina orfane e `/mercoledi` rispondono 410 invece di 404.

**Commit 3 — `6267800`, sitemap** (`src/lib/seo-directory.js`): oltre ai 7 URL già individuati in §7, **trovato durante l'implementazione un bug distinto** non presente nell'audit originale — il generatore di sitemap usava una logica di matching diversa da quella della route live per le combinazioni disciplina+città, quindi poteva pubblicare URL che la route live rifiutava. 4 dei 7 casi risolti verificando ogni candidato con le stesse funzioni di matching della route live (chiude il problema alla radice per qualunque combinazione futura, non solo questi 7). I restanti 3 (`functional-training/lugano`, `functional-training/saronno`, `personal-training/lavertezzo`) hanno una causa più profonda in una query SQL della route live — toccarla avrebbe impattato tutto il traffico `/discipline/*/*`, sproporzionato per questo commit: esclusi dalla sitemap con la causa documentata nel codice, in attesa di un intervento dedicato se il problema si ripresenta.

**Commit 4 — canonical: non necessario.** L'audit (§6) non ha trovato incoerenze live reali da correggere.

**Bug dati trovato ma non toccato, segnalato a parte:** durante l'implementazione, `gisevuoi-csv-244` risultava attivo ma con slug non combaciante (campi `name`/`nome` con ortografia diversa: "GiSeVuoi" vs "GiùSeVuoi"). Approfondendo, i contenuti editoriali di quella scheda (fonte ufficiale, riassunto, FAQ) appartengono a un'altra attività — "Ganesha's Home", Chiasso, yoga/meditazione — già segnalata internamente con `needs_review: true` e flag critici (`city_mismatch`, `source_domain_mismatch`). Non è stato toccato: fuori scope per un task SEO, meriterebbe un passaggio dedicato sulla pipeline di enrichment.

## 11. Deploy e monitoraggio

- **Deploy**: push su `origin/main` confermato, Vercel ha completato la build in ~36s (deployment `dpl_9mfatr8TTDAB3egoQHXxaauzLZFc`, stato READY), alias di produzione (`www.palestreinzona.it`, `palestreinzona.it`) confermati puntare sulla nuova build.
- **Smoke test live** su dominio di produzione dopo il deploy: home 200, `/mercoledi` → 410, `/discipline/tabata` → 410, `/discipline/vaculab` → 410, redirect legacy → 301 corretto, catena ambigua → 410, `/sitemap.xml` → 200. Tutto confermato coerente con quanto atteso.
- **Fase 3 (GSC)**: rimane a tuo carico — "Convalida correzione" sulle tre categorie GSC (Not found, Page with redirect, Duplicate canonical) + reinvio sitemap. Nessuna integrazione Search Console disponibile in questo ambiente per farlo o verificarlo automaticamente.
- **Monitoraggio impostato**: 6 promemoria programmati (uno a settimana, lunedì alle 9:00, dal 20/07 al 24/08), ciascuno chiede di esportare dati freschi da GSC (Performance + Indicizzazione) da incollare in conversazione per il confronto con la baseline (1.485 pagine indicizzate al picco → 726 al minimo; ~1.500 → ~180 impression/giorno). L'ultimo (24/08) lo segnala esplicitamente come ultimo controllo programmato.

# Analisi Google Search Console — 9 luglio 2026 (ultimi 3 mesi, Web)

Totali: ~327 click, ~58.500 impressioni, CTR 0,56%, posizione media ~9,5. Mobile = 63% delle impressioni.

## P0 — Crollo impressioni da fine giugno (da investigare subito)

Impressioni giornaliere: ~700–1000 per tutto maggio/giugno, poi crollo dal 23 giugno a ~150–350. Il 2 luglio posizione media 20,3 (vs ~9 abituale). Non è stagionalità pura: è un calo del 70% in due settimane.

Verifiche da fare:

1. GSC → Indicizzazione → Copertura: pagine "Scansionata, attualmente non indicizzata" o errori in crescita da fine giugno — **non verificabile da Claude Code, richiede accesso diretto a Search Console. Ancora da fare.**
2. Vercel: deploy falliti o modifiche attorno al 20–23 giugno — **verificato 10 luglio: nessun deploy tra l'11 giugno e il 9 luglio (28 giorni di silenzio totale). Esclude un deploy rotto come causa diretta, dato che non c'era nessun deploy in quella finestra.**
3. Supabase: progetto attivo? Un DB in pausa = pagine 500 = deindicizzazione (esiste già un hotfix report `docs/audit/public-routes-500-hotfix-report.md` — il problema potrebbe essersi ripresentato) — **verificato 10 luglio: Supabase produzione raggiungibile e attivo ora. Impossibile confermare retroattivamente lo stato al 23 giugno (nessuna cronologia pause disponibile via i tool usati). Nota: grazie al fix del 6 giugno (`public-routes-500-hotfix-report.md`), una pausa di Supabase degraderebbe le route pubbliche al fallback CSV statico invece di produrre 500 — quindi anche in caso di pausa, il sintomo non sarebbe una wave di errori 500 ma pagine servite da un dataset diverso/più piccolo.**
4. `bun run seo:check:sitemap` e `seo:check:archived` — **eseguiti 10 luglio: entrambi OK (nessun URL legacy `-csv-NNN` in sitemap; tutti gli archiviati rispondono 404/410 in produzione). Smoke test più ampio (homepage, 5 schede random, una pagina combo disciplina+città) anche tutto 200 e veloce.**

### Scoperta collaterale rilevante (10 luglio 2026): staging e produzione sono due database Supabase diversi

Durante un'indagine collegata (perché 15 palestre attive su staging risultavano invisibili sul sito live) è emerso che `.env.staging.local` e la produzione reale (`.env.vercel.production.check`) puntano a **due progetti Supabase distinti, divergenti da metà maggio 2026**. Produzione aveva già archiviato autonomamente ~146 schede (incluse intere catene come Activ Fitness e FitActive, il 15 maggio) che su staging risultavano ancora attive. Confermato con un preview deploy Vercel + confronto diretto dei due database via query REST identiche.

**Non è collegata al crollo del 23 giugno** (la divergenza risale a metà maggio, precedente e indipendente), ma è un problema operativo reale: qualsiasi verifica fatta contro staging (script con `.env.staging.local`, dev server locale, o preview deploy) **non riflette lo stato del sito live**. Le azioni di archiviazione fatte su staging in questa sessione (fase 4 + un giro successivo, 131 record) non hanno avuto alcun effetto sul sito reale, che aveva già una propria pulizia indipendente. Vedi memoria `staging_production_supabase_divergence` per i dettagli.

**Conclusione P0 al 10 luglio**: nessun problema tecnico attivo trovato (produzione sana, nessun 500, nessun deploy rotto nella finestra del crollo). La causa esatta del calo del 23 giugno resta da accertare — l'unico controllo mancante è la Copertura di Google Search Console, che richiede accesso manuale.

## P1 — 626 URL legacy `-csv-NNN` ancora indicizzati (63% delle pagine in SERP)

626 pagine su ~1000 in SERP sono URL legacy tipo `/palestre/pilactive-saronno-csv-473`. Effetti misurati:

- Cannibalizzazione: `pilactive-saronno-csv-473` (pos 7,9 — CTR 1,65%) compete con `pilactive-saronno` (pos 4,9 — CTR 5,97%). L'URL pulito converte 3,6x meglio ma Google mostra quello legacy.
- Duplicati multipli della stessa palestra: `fitactive-mendrisio-csv-226` E `csv-228`; `fitactive-varese-saffi-csv-229` E `csv-231`.

Azione: 301 dagli URL `-csv-NNN` al canonical pulito (gli script `seo:legacy-redirects` e `seo:check:legacy` esistono già — verificare perché i redirect non sono attivi o non coprono questi casi), più canonical tag corretti. È il fix con il ROI più alto di tutti.

## P2 — CTR quasi nullo su query brand palestre (title/meta da rifare)

Query con impressioni alte e 0 click: `mcfit busto arsizio` (830 impr), `sportinmente` (674), `fitactive bellinzona` (262), `non stop gym bellinzona` (258)… Homepage: 2.351 impressioni, 0 click a posizione 6,8.

Chi cerca il nome di una palestra trova il sito ufficiale ai primi posti; la nostra scheda a pos 9–11 deve offrire un motivo per cliccare. Azione:

- Title schede: `<Nome> a <Città>: orari, prezzi, contatti e recensioni | Palestre in Zona`
- Meta description con dati concreti (orario oggi, prezzo se noto, discipline)
- Homepage: title/description orientati all'azione ("Trova palestre vicino a te — confronta orari e prezzi"), non descrittivi
- Dati strutturati `LocalBusiness`/`SportsActivityLocation` per rich results (verificare se già presenti)

## P3 — Landing zone/discipline invisibili sulle query generiche (il vero potenziale)

Le query "money" per una directory rankano malissimo: `palestra varese` pos 33, `palestre lugano` pos 31, `palestra gallarate` pos 38, `pilates lugano` pos 57, `boxe varese` pos 36, `yoga varese` pos 36, `arti marziali varese` pos 52, `personal trainer varese` pos 73.

Solo 8 pagine `/zone/` e 8 `/discipline/` compaiono in SERP, con impressioni minime. `zone/lugano` è a pos 5,3 con sole 101 impressioni (0 click). Azioni:

- Potenziare le landing zone/discipline: contenuto reale (conteggi, prezzi medi, mappa, palestre in evidenza), non solo liste
- Creare landing combinate discipline+città (`pilates-varese`, `boxe-lugano`): le query composte dominano il report
- Internal linking: ogni scheda palestra → sua zona + sue discipline
- Fix duplicato tassonomia: esistono sia `/discipline/kickboxe` sia `/discipline/kickboxing`

## P4 — Contaminazione catalogo (negozi/supermercati indicizzati come palestre)

In SERP compaiono schede per: Migros Bellinzona, Cisalfa, Decathlon Sant'Antonino, Tigotà Tradate, Old Wild West Tradate, Ritmo Shoes, estetiste, un corso antincendio (`corso-addetto-antincendio-a-tradate-19-marzo-2026-csv-148`). Attirano impressioni irrilevanti e degradano la qualità percepita del sito agli occhi di Google.

Azione: `bun run audit:gyms:contamination` per il censimento, poi rimozione/archiviazione con il flusso previsto (preview → conferma → apply). Le pagine rimosse devono rispondere 410/redirect, non 200.

## Dato di contesto

- Italia 61% impressioni, Svizzera 22% — il Ticino (Lugano, Bellinzona, Mendrisio, Locarno) è un mercato reale del sito, non rumore.
- CTR mobile (0,65%) > desktop (0,40%): coerente con l'intent locale; le ottimizzazioni title/meta vanno verificate soprattutto su SERP mobile.

## Ordine di esecuzione consigliato con Claude Code

1. Investigare il crollo di fine giugno (P0) — prima di tutto, potrebbe invalidare il resto — **fatto 10/07: nessun problema tecnico trovato, manca solo la verifica manuale di GSC Copertura**
2. Redirect legacy `-csv-NNN` (P1) — fix tecnico, alto impatto, script già esistenti — **fatto (PR #10/#11, in produzione)**
3. Title/meta schede + homepage (P2) — **fatto (PR #11, in produzione)**
4. Pulizia contaminazione (P4 — richiede conferme manuali sui dati) — **fatto su staging (PR #12), ma produzione aveva già una pulizia indipendente più ampia dal 15 maggio — vedi nota su staging/produzione in P0**
5. Landing zone/discipline (P3 — lavoro di prodotto, il più lungo) — **fatto (PR #13, in produzione)**

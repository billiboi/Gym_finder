# Homepage Listing Counts Disciplines Fix Report

## 1. Causa dei numeri sbagliati

La homepage calcolava discipline, zone e pagine curate con `buildCatalogStats()` sui soli 24 record iniziali. Per questo mostrava valori come 9 discipline e 12 zone invece dei numeri pubblici corretti.

Inoltre `catalogTotalGyms` poteva arrivare da `readPublicGymCount()`, che in questa fase di hotfix non e una fonte coerente con i numeri editoriali pubblici richiesti.

## 2. Causa del filtro discipline incompleto

`PUBLIC_DISCIPLINE_FILTER_NAMES` conteneva solo una parte delle discipline presenti nel catalogo pubblico. Di conseguenza `/api/disciplines` e la homepage esponevano un filtro ridotto.

## 3. Causa del load-more limitato

Il load-more usava `gyms.length` come offset implicito. In presenza di filtri/reset/merge per ID, questo poteva diventare ambiguo. La UI inoltre non comunicava chiaramente "mostrate su totale", ma mostrava conteggi della pagina caricata o del catalogo globale in modo poco leggibile.

## 4. File modificati

- `src/lib/trust.js`
- `src/lib/disciplines.js`
- `src/routes/+page.server.js`
- `src/routes/+page.svelte`
- `src/routes/api/disciplines/+server.js`
- `src/routes/chi-siamo/+page.server.js`
- `src/routes/per-le-palestre/+page.server.js`
- `docs/audit/homepage-listing-counts-disciplines-fix-report.md`

## 5. Fix applicato

- Aggiunta fonte unica `PUBLIC_CATALOG_NUMBERS` con:
  - 542 schede attive;
  - 23 discipline pubbliche canoniche;
  - 80+ zone disponibili;
  - 20+ pagine curate.
- Homepage, `/chi-siamo` e `/per-le-palestre` usano la stessa fonte numerica.
- Estesa la lista pubblica discipline a 23 opzioni canoniche.
- `/api/disciplines` ora restituisce direttamente la lista pubblica canonica, senza query Supabase.
- Homepage inizializza `initialDisciplines` dalla lista canonica completa.
- Homepage usa `nextGymOffset` esplicito per il load-more.
- La label risultati ora comunica "Mostrate N schede su 542" senza caricare tutto il catalogo.
- Il cambio disciplina avvia una nuova ricerca paginata con `offset=0`.

## 6. Fonte finale dei numeri pubblici

Fonte condivisa:

- `src/lib/trust.js`
- `PUBLIC_CATALOG_NUMBERS`

Questa e una fonte temporanea esplicita e coerente per il pubblico, scelta per hotfix urgente.

## 7. Comportamento finale homepage

- SSR carica solo 24 schede.
- I numeri pubblici mostrati sono coerenti: 542, 23, 80+, 20+.
- La lista comunica "Mostrate 24 schede su 542".
- "Mostra altre" usa `/api/gyms` con offset progressivo.
- Dopo il primo load-more l'offset passa da 24 a 48; dopo il secondo da 48 a 72.
- Il filtro discipline espone 23 discipline.
- Se si seleziona una disciplina, la lista riparte da `offset=0` e il load-more continua con lo stesso filtro.

## 8. Test eseguiti

- `bun run check`: OK.
- Dev server locale:
  - `/`: 200.
  - `/api/gyms?limit=24&offset=0`: 200, 24 item, primo ID `csv-1`.
  - `/api/gyms?limit=24&offset=24`: 200, 24 item, primo ID `csv-25`.
  - `/api/gyms?limit=24&offset=48`: 200, 24 item, primo ID `csv-49`.
  - `/api/disciplines`: 200, 23 discipline.
  - `/api/gyms?limit=24&offset=0&discipline=Yoga`: 24 item, primo ID `csv-19`.
  - `/api/gyms?limit=24&offset=24&discipline=Yoga`: 24 item, primo ID `csv-251`.
- Controllo statico:
  - nessun nuovo `select=*`;
  - `/api/disciplines` non usa Supabase;
  - homepage usa `nextGymOffset`.
- `bun run build`: client e SSR compilano.

## 9. Errori o test non eseguiti

- `bun run build` fallisce solo nello step adapter Vercel per symlink Windows noto: `EPERM: operation not permitted, symlink '![-]\catchall.func'`.
- Click browser su "Mostra altre" non verificato: `node` e Playwright non sono disponibili/bloccati nell'ambiente locale. La verifica e stata fatta su API e logica statica.
- La verifica testuale SSR dell'HTML non e risultata affidabile per i numeri renderizzati dopo hydration.

## 10. Rischi residui

- `PUBLIC_CATALOG_NUMBERS` e una fonte temporanea. Quando Supabase stats sara affidabile, va sostituita con query stats leggera condivisa.
- Il load-more discipline dipende dalla qualita del filtro `/api/gyms?discipline=...`; i test su Yoga sono passati, ma va verificato manualmente su 2-3 altre discipline.
- La UI va controllata manualmente in produzione per confermare che la label visuale sia chiara su mobile.

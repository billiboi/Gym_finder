# Homepage Zero Gyms Hotfix Report

## 1. Causa esatta del bug

La query pubblica di listing in `readPublicGymListingFromSupabase()` usava una proiezione fissa con tutti i campi minimi previsti per la card. Se in produzione mancava anche una sola colonna tra quelle richieste, PostgREST rispondeva con errore e la load SSR della homepage riceveva il fallback locale. In produzione quel fallback non garantisce dati utili, quindi `initialGyms` diventava vuoto e la UI mostrava 0 palestre.

Il client homepage gestiva gia il nuovo payload `{ items, limit, offset, hasMore }` di `/api/gyms`; il problema era prima della UI, nella query Supabase pubblica.

## 2. File modificati

- `src/lib/server/gym-store.js`

## 3. Fix applicato

- `supabaseAvailableColumns()` ora puo usare la read key se la service key non e disponibile, quindi il controllo colonne funziona anche in ambienti pubblici SSR con sola chiave di lettura.
- La read key server-side ora preferisce `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_KEY` rispetto all'anon key. Se RLS in produzione limita la lettura anon di `gyms`, il server non riceve piu array vuoto.
- `readPublicGymListingFromSupabase()` seleziona solo colonne realmente disponibili nella tabella Supabase.
- I filtri pubblici su ricerca e disciplina vengono aggiunti solo se le colonne esistono.
- Il filtro `deleted_at=is.null` non viene piu applicato nella query pubblica paginata: in produzione puo escludere tutti i record se gli attivi non sono salvati come `NULL`. Il filtro archivio resta applicato lato codice con `isArchivedGym()`.
- L'ordinamento usa `priority_score` e `nome/name` solo se presenti.
- `readPublicGymCountFromSupabase()` evita il filtro `deleted_at=is.null` per non dipendere dalla rappresentazione DB del valore vuoto.
- Fallback emergenziale read-only su `static/palestre.csv` pubblico, con cache in memoria per istanza, usato quando il fallback filesystem non e disponibile in runtime Vercel. Mantiene `/api/gyms` paginato e non interroga Supabase a catalogo completo.

## 4. Conferma select=*

Non e stato introdotto nessun nuovo `select=*`.

La query pubblica homepage/API continua a usare proiezione esplicita e ora la restringe alle colonne disponibili. Il vecchio `readGymsFromSupabase()` conserva il `select=*` legacy, ma non e stato reintrodotto nel percorso homepage o `/api/gyms`.

## 5. Conferma full catalog

Non e stato reintrodotto il download completo del catalogo.

`/api/gyms` resta paginato con default `limit=24`, max `limit=100`, `offset` e `hasMore`. La homepage SSR continua a caricare solo la prima pagina.

## 6. Test eseguiti

- `bun run check`: OK, 0 errori e 0 warning.
- `bun run build`: client e SSR compilano; fallisce solo nello step adapter Vercel per symlink Windows noto: `EPERM: operation not permitted, symlink '![-]\catchall.func'`.
- Dev server locale singolo:
  - `GET /api/gyms`: `items=24`, `hasMore=true`.
  - `GET /api/gyms?limit=24`: `items=24`, `hasMore=true`.
  - `GET /`: HTTP 200, non contiene `Nessuna palestra trovata`.
- Verifica produzione dopo push iniziale:
  - `GET /api/gyms?limit=1`: payload paginato presente ma `items=[]`, compatibile con filtro `deleted_at=is.null` troppo restrittivo in produzione.
- Verifica produzione dopo secondo push:
  - `GET /api/gyms?limit=24`: ancora `items=[]`; compatibile con lettura tramite anon key limitata da RLS. Applicato fix di priorita chiave server-side.
- Verifica asset statico produzione:
  - `GET /palestre.csv`: HTTP 200, asset pubblico disponibile per fallback emergenziale.

## 7. Rischi residui

- Se la tabella Supabase esponesse solo `disciplines` e non `discipline`, il filtro server-side per disciplina resta limitato; la homepage senza filtri e la pagina iniziale non sono impattate.
- Il conteggio pubblico puo includere record archiviati se presenti; e preferibile a una query production che esclude tutti gli attivi. La lista continua a filtrare gli archiviati lato codice.
- Il fallback CSV pubblico e una misura di ripristino urgente: risolve la visibilita senza traffico Supabase aggiuntivo, ma va rimosso o reso esplicito dopo aver corretto env/RLS Supabase production.
- Il legacy `readGymsFromSupabase()` usa ancora `select=*`; resta fuori da questo hotfix per non allargare il perimetro.
